# MayIMeetYou - Development Roadmap

This document outlines the chronological feature development order for MayIMeetYou.app, optimized for building the core loop first and adding complexity incrementally.

## Phase 1: Foundation & Identity (Epic 1.1)
**Goal:** Allow users to sign in and establish their digital identity.

1.  **Project Scaffold**
    1.1.1 Initialize Next.js project with Tailwind CSS.
    1.1.2 Set up Firebase Project (Auth, Firestore, Storage).
2.  **Authentication**
    1.2.1 Implement Google Sign-In using Firebase Authentication.
    1.2.2 Create authentication context/hooks for state management.
3.  **Profile Creation Wizard**
    1.3.1 **Database:** Define Firestore `users` collection structure (name, age, gender, orientation, location, bio, interests, deal-breakers).
    1.3.2 **Frontend:** Multi-step form for onboarding.
    1.3.3 **Validation:** Age check (18+), field limits.
4.  **Media Handling**
    1.4.1 Implement photo upload logic using Firebase Storage.
    1.4.2 Basic image cropping/processing before upload.

## Phase 2: Discovery Engine (Epic 1.2, 1.3)
**Goal:** Users can find people to whisper to.

1.  **Feed Logic**
    2.1.1 **Database:** Query Firestore to fetch users based on compatibility (Interest match > Location > Random).
    2.1.2 **Filtering:** Exclude already seen/interacted profiles using a sub-collection or array of interaction IDs.
2.  **Feed UI**
    2.2.1 Implement "Card Stack" or Vertical Scroll view.
    2.2.2 Apply "blurred photo" teaser logic.
    2.2.3 "Pass" action (records interaction in Firestore to prevent re-showing).
3.  **Profile Management**
    2.3.1 Edit Profile settings page.
    2.3.2 "Open to Whispers" global toggle (update user document).

## Phase 3: The Whisper Core (Epic 2)
**Goal:** Implement the unique "audio-first" interaction mechanism.

1.  **Audio Recorder Component**
    3.1.1 Browser MediaRecorder API implementation.
    3.1.2 Visual timer (max 45s) and waveform visualization.
    3.1.3 "Re-record" and "Preview" functionality.
2.  **Safety Layer (Gemini Multimodal)**
    3.2.1 **Backend:** Integration with Google Gemini Multimodal API.
    3.2.2 **Logic:** Send Audio Buffer directly to Gemini -> Receive Safety Pass/Fail score.
    3.2.3 **UI:** Loading states ("Vibe checking...") and rejection modals.
3.  **Sending Logic**
    3.3.1 **Database:** Create Firestore `whispers` collection (senderId, receiverId, audioUrl, status).
    3.3.2 **Constraints:** Check/Update daily limit (5/day) in user document.
    3.3.3 **Frontend:** "Send" action with success feedback.

## Phase 4: Connection & Response (Epic 3)
**Goal:** Complete the feedback loop; receivers can accept or reject.

1.  **Inbox System**
    4.1.1 **Database:** Listen to Firestore `whispers` where receiverId == currentUserId AND status == 'pending'.
    4.1.2 **Frontend:** Inbox list view with unread indicators.
2.  **Playback & Decision**
    4.2.1 **UI:** Full-screen player overlay.
    4.2.2 **Logic:** Require profile scroll before play is enabled.
    4.2.3 **Actions:**
        4.2.3.1 **Approve:** Updates Whisper status to 'approved' -> Creates Firestore `matches` document.
        4.2.3.2 **Decline:** Updates Whisper status to 'declined' (or soft deletes) -> Removes from inbox.
3.  **Sender Dashboard**
    4.3.1 "My Whispers" view querying sent whispers to track status.

## Phase 5: Engagement (Chat) (Epic 4)
**Goal:** Turn matches into conversations.

1.  **Chat Infrastructure**
    5.1.1 **Database:** Firestore `messages` sub-collection under `matches` or top-level collection. Use Firestore real-time listeners for live updates.
    5.1.2 **Frontend:** Chat window unlocked upon "Approve".
2.  **Rich Messaging**
    5.2.1 Text support with emoji picker.
    5.2.2 Voice note recording (stored in Firebase Storage).
    5.2.3 Image attachment logic.
3.  **Notifications**
    5.3.1 In-app toasts for new messages/matches.
    5.3.2 (Optional for MVP) Firebase Cloud Messaging (FCM) for push notifications.

## Phase 6: Safety & Polish (Epic 5)
**Goal:** Ensure a safe environment and production readiness.

1.  **Moderation Tools**
    6.1.1 Block User functionality (updates `blockedUsers` array in user doc).
    6.1.2 Report User flow (creates `reports` document).
2.  **Account Settings**
    6.2.1 Delete Account (Firebase Auth deletion + Firestore cascading delete via Cloud Functions or client-side logic).
    6.2.2 Data export request.
3.  **Final Polish**
    6.3.1 Empty states (No matches, Empty inbox).
    6.3.2 Mobile responsiveness check.
    6.3.3 Accessibility audit (Alt text, ARIA labels).
