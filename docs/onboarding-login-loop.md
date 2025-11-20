# Onboarding Shown Again After Login – Root Cause and Fix

## Context

- **Stack**: Next.js App Router, React, Firebase Authentication (client SDK), Firestore, Firebase Admin for API routes.
- **Auth state handling**: Centralized in `src/context/AuthContext.tsx` via `onAuthStateChanged(auth, ...)`.
- **Onboarding decision**: Various pages redirect users to `/onboarding` based on whether a Firestore user profile exists.

Key components involved:

- `AuthContext` (`src/context/AuthContext.tsx`)
- Firestore profile helpers (`src/lib/firestore.ts`)
- Route guards in pages like:
  - `src/app/page.tsx` (home)
  - `src/app/my-whispers/page.tsx`
  - `src/app/whispers/page.tsx`

---

## Symptom

> After completing onboarding, logging out, and logging back in, the app sends the user back to the onboarding screen as if they were a new user.

This looked like the app "forgot" the user’s profile between sessions.

---

## How onboarding vs main app is decided

### AuthContext

`AuthContext` maintains three key pieces of state:

- `user: User | null` – Firebase Auth user
- `profile: UserProfile | null` – Firestore doc from `users/{uid}`
- `loading: boolean` – whether auth/profile are still being resolved

On mount, it subscribes to auth changes:

```ts
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    // (debug logs added later)
    setUser(currentUser);

    if (currentUser) {
      try {
        const userProfile = await getUserProfile(currentUser.uid);
        setProfile(userProfile);
      } catch (error) {
        console.error("Error fetching user profile in AuthContext:", error);
        setProfile(null);
      }
    } else {
      setProfile(null);
    }

    setLoading(false);
  });

  return () => unsubscribe();
}, []);
```

### Firestore profile helpers

`src/lib/firestore.ts`:

- `createUserProfile(uid, data)` – called at the end of onboarding to create `users/{uid}`.
- `getUserProfile(uid)` – reads `users/{uid}` and returns `UserProfile | null`.
- `updateUserProfile(uid, data)` – used from settings, etc.

The **only** signal that a user is "onboarded" is the existence of a `users/{uid}` doc (not a separate flag).

### Route guards

Example from `src/app/page.tsx`:

```ts
useEffect(() => {
  if (!loading && user && !profile) {
    router.push("/onboarding");
  }
}, [user, profile, loading, router]);
```

Similar checks exist in `my-whispers` and `whispers` pages. In words:

- If `loading` is false, and
- `user` is non-null (logged in), and
- `profile` is null (no Firestore profile),

→ **redirect to `/onboarding`**.

So the entire decision is:

> "Authenticated but no `users/{uid}` profile" ⇒ treat as new user ⇒ show onboarding.

---

## Initial hypotheses we ruled out

### 1. Missing profile document

We suspected that `createUserProfile` might not be creating `users/{uid}` properly, or that it was writing to a different project.

To verify, we:

1. Confirmed the frontend env (`.env.local`):
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID=mayimeetyou`
2. Wrote and ran an Admin SDK script: `scripts/dumpAllFirestore.js`.
3. Confirmed via `firestore_dump.txt` that **project `mayimeetyou`** contains:

   ```text
   === Collection: users ===
     Document: users/D0AiOHQZ2EUsjBc6CSRMnTt9Mto2
     {
       "uid": "D0AiOHQZ2EUsjBc6CSRMnTt9Mto2",
       "displayName": "Sai Harsha Tummala",
       ...,
       "isProfileComplete": true,
       ...
     }

     Document: users/Snq8qUyXE3Q0gXzFfV7ooysOuXs2
     {
       "uid": "Snq8qUyXE3Q0gXzFfV7ooysOuXs2",
       "displayName": "happy",
       ...,
       "isProfileComplete": true,
       ...
     }

     Document: users/seed_user_1
     ...
   ```

→ Profiles do exist, with the expected fields.

### 2. Firestore security rules blocking reads

We also considered `permission-denied`. But current rules (at the time of debugging) were essentially open:

```txt
match /{document=**} {
  allow read, write: if request.time < timestamp.date(2025, 12, 17);
}
```

So until that date, any client can read/write. Given that and the Admin script succeeding, rules were **not** the immediate cause.

---

## The real root cause: a race condition with `loading`

The key discovery came from adding debug logs in `AuthContext`:

```ts
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    console.log("Auth state changed, currentUser uid =", currentUser?.uid);
    setUser(currentUser);

    if (currentUser) {
      try {
        const userProfile = await getUserProfile(currentUser.uid);
        console.log("Loaded userProfile from Firestore:", userProfile);
        setProfile(userProfile);
      } catch (error) {
        console.error("Error fetching user profile in AuthContext:", error);
        setProfile(null);
      }
    } else {
      setProfile(null);
    }

    setLoading(false);
  });

  return () => unsubscribe();
}, []);
```

### What we observed in the browser console

When clicking "Sign in with Google":

1. **First log:**

   ```text
   Auth state changed, currentUser uid = undefined
   ```

   This is an initial auth state where Firebase hasn’t yet resolved the logged-in user (popup flow just started). At this moment:

   - `user = null`
   - `profile = null`
   - `loading` is set to `false` at the end of the callback.

2. **Second log (after popup completes):**

   ```text
   Auth state changed, currentUser uid = D0AiOHQZ2EUsjBc6CSRMnTt9Mto2
   Loaded userProfile from Firestore: { ...valid profile object... }
   ```

   At the start of this second callback:

   - `loading` is still `false` (from the first callback).
   - `setUser(currentUser)` runs, so `user` becomes non-null.
   - `getUserProfile(currentUser.uid)` is awaited; while it’s in-flight, `profile` is still `null`.

   So for a brief moment during this second event, the global auth state is:

   - `loading === false`
   - `user !== null`
   - `profile === null`

### How this triggers the onboarding redirect

Recall the guard in `page.tsx` and others:

```ts
if (!loading && user && !profile) {
  router.push("/onboarding");
}
```

During that brief window between `setUser(currentUser)` and `setProfile(userProfile)` completing:

- The condition becomes **true**.
- The effect fires and redirects to `/onboarding`.
- This happens **even though** a valid profile exists in Firestore and will be loaded a moment later.

So onboarding was not being triggered because the profile was missing; it was triggered because `loading` had already been set to `false` **from an earlier auth event**, and we were reacting to an intermediate inconsistent state.

In other words, this was a classic race / stale state problem:

> `loading` no longer represented "are we done resolving the current auth state?" – it only reflected the last event.

---

## The fix

### Goal

Ensure that route guards only evaluate

```ts
!loading && user && !profile
```

after we have finished handling **the most recent** `onAuthStateChanged` event and any associated profile fetch.

### Change applied

In `AuthContext`, we now explicitly set `loading(true)` at the **start** of each auth state change, and only set it back to `false` after the profile fetch completes:

```ts
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    setLoading(true); // NEW: mark that we are (re)resolving auth/profile
    console.log("Auth state changed, currentUser uid =", currentUser?.uid);
    setUser(currentUser);

    if (currentUser) {
      try {
        const userProfile = await getUserProfile(currentUser.uid);
        console.log("Loaded userProfile from Firestore:", userProfile);
        setProfile(userProfile);
      } catch (error) {
        console.error("Error fetching user profile in AuthContext:", error);
        setProfile(null);
      }
    } else {
      setProfile(null);
    }

    setLoading(false); // only now are we truly done
  });

  return () => unsubscribe();
}, []);
```

### Why this fixes the bug

With this change:

- Every time auth state changes, `loading` immediately becomes `true`.
- While `loading === true`, route guards like:

  ```ts
  if (!loading && user && !profile) {
    router.push("/onboarding");
  }
  ```

  **do not fire**.
- Only after we:
  1. Set `user`, and
  2. Fetch `userProfile` from Firestore (or fail and set it to `null`), and
  3. Call `setLoading(false)`

  does the app allow those guards to run.

This ensures that when `!loading` becomes `true`:

- Either `profile` correctly reflects the latest user’s profile (object or `null`), and
- We are not acting on any intermediate inconsistent state.

### Verified behavior after fix

After applying this change and re-testing:

- Logging in as a user with a profile (`users/D0AiOHQZ2EUsjBc6CSRMnTt9Mto2`):
  - Console shows the two auth events.
  - `Loaded userProfile from Firestore` logs a full object.
  - The app stays on the main feed and **does not** redirect back to `/onboarding`.

- Logging in as a brand new user (no profile doc yet):
  - Profile load correctly returns `null`.
  - Once `loading` is set to `false`, the guards see `user && !profile` and redirect to `/onboarding` **as intended**.

---

## Lessons / best practices

1. **Treat `loading` as a state of the *current* async operation, not just initial mount.**
   - When reacting to `onAuthStateChanged`, set `loading(true)` at the start of each callback.

2. **Avoid acting on partial auth state.**
   - Route guards should wait until both `user` and `profile` have settled for the current event.

3. **Use logging to debug auth flows.**
   - Short-lived intermediate states (like `user` set, `profile` not yet set) are almost impossible to reason about without logs.

4. **Verify backend data and project alignment early.**
   - Using an Admin SDK dump (`dumpAllFirestore.js`) confirmed that:
     - The correct project was being used.
     - Profile documents existed and were well-formed.

---

## Files touched

- **Updated** `src/context/AuthContext.tsx`:
  - Added `setLoading(true)` at the top of the `onAuthStateChanged` callback.
  - (Temporarily) added debug `console.log` statements to trace auth/profile loading (these can be removed once debugging is complete).

No changes were required to route guards or Firestore helper functions; the core issue was the timing / semantics of the `loading` flag in the auth context.
