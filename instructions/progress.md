# Development Progress

## Phase 1: Foundation & Identity (Epic 1.1)
- [x] **1.1.1 Initialize Next.js project with Tailwind CSS**
- [x] **1.1.2 Set up Firebase Project (Auth, Firestore, Storage)**
  - Installed Firebase SDK.
  - Configured `src/lib/firebase.ts`.
- [x] **1.2.1 Implement Google Sign-In**
  - Integrated `firebase/auth` with Google Provider.
- [x] **1.2.2 Create authentication context/hooks**
  - Implemented `AuthContext` and `useAuth` hook.
  - Wrapped app in `AuthProvider`.
  - Added basic UI in `page.tsx` for testing auth flow.
- [x] **1.3.1 Database Structure** (Define `users` collection)
  - Defined `UserProfile` types in `src/types/index.ts`.
  - Implemented `createUserProfile` and `getUserProfile` in `src/lib/firestore.ts`.
- [x] **1.3.2 Frontend Profile Wizard** (Multi-step form)
  - Created `OnboardingWizard` component.
  - Created steps: `StepBasicInfo`, `StepInterests`, `StepBio`, `StepPhotos`.
  - Created `/onboarding` page.
- [x] **1.3.3 Validation** (Age check, etc.)
  - Implemented 18+ age check and required field validation in wizard.
- [x] **1.4.1 Photo Upload** (Firebase Storage)
  - Implemented `uploadProfileImage` in `src/lib/storage.ts`.
- [x] **1.4.2 Basic image cropping/processing**
  - Implemented client-side resize/optimization in `src/lib/imageUtils.ts`.

## Phase 2: Discovery Engine (Epic 1.2, 1.3)
- [x] **2.1.1 Feed Logic** (Server-side `/api/feed` builds ranked feed from Firestore `users`.)
- [x] **2.1.2 Filtering** (Excludes `seenUserIds`, self, and respects daily feed quota & `isOpenToWhispers`.)
- [x] **2.2.1 Feed UI** (Home page shows vertical card feed for authenticated, onboarded users.)
- [x] **2.2.2 Blurred Photo Logic** (Main photo blurred by default; tap card to reveal.)
- [x] **2.2.3 Pass Action** (Pass removes card and records interaction via `/api/feed/interaction`.)
- [x] **2.3.1 Profile Settings Page** (Added `/settings` with basic profile controls.)
- [x] **2.3.2 "Open to Whispers" Toggle** (Toggle updates user doc and controls discoverability.)

## Phase 3: The Whisper Core (Epic 2)
- [x] **3.1.1 Audio Recorder Component (Client-only)**
  - Implemented `AudioRecorder` using browser MediaRecorder and Web Audio API.
  - 45s max duration with visual timer and live waveform canvas.
- [x] **3.1.2 Whisper Modal Integration**
  - `Whisper Hi` on feed cards opens `WhisperModal` with the recorder.
  - Supports preview playback, re-record, and a disabled "Send (coming soon)" action.
