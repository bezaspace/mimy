import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountJson) {
  console.error("FIREBASE_SERVICE_ACCOUNT_KEY is not set. Aborting seed.");
  process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountJson);

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

const genders = ["Male", "Female", "Non-binary"];
const orientations = ["Straight", "Gay", "Bisexual", "Pansexual"];
const cities = [
  { city: "Bengaluru", country: "India" },
  { city: "Mumbai", country: "India" },
  { city: "Delhi", country: "India" },
  { city: "Chennai", country: "India" },
  { city: "Hyderabad", country: "India" },
  { city: "Pune", country: "India" },
  { city: "Kolkata", country: "India" },
  { city: "Goa", country: "India" },
];

const interestsPool = [
  "Coffee",
  "Books",
  "Hiking",
  "Movies",
  "Cooking",
  "Music",
  "Yoga",
  "Travel",
  "Board Games",
  "Startups",
];

const dealBreakersPool = [
  "No smokers",
  "Wants kids",
  "No pets",
  "Night owl",
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickSome(arr, count) {
  const copy = [...arr];
  const result = [];
  while (copy.length && result.length < count) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return result;
}

async function seedUsers() {
  const batch = db.batch();
  const now = Date.now();

  for (let i = 1; i <= 20; i++) {
    const uid = `seed_user_${i}`;
    const displayName = `Seed User ${i}`;
    const age = 22 + (i % 10);
    const gender = pickRandom(genders);
    const orientation = pickRandom(orientations);
    const location = pickRandom(cities);

    const interests = pickSome(interestsPool, 3 + (i % 3));
    const dealBreakers = pickSome(dealBreakersPool, 1 + (i % 2));

    const bio = `I am ${displayName} from ${location.city}. I love ${interests[0]} and ${
      interests[1] ?? "good company"
    }.`;

    const docRef = db.collection("users").doc(uid);

    const userProfile = {
      uid,
      displayName,
      age,
      gender,
      orientation,
      location,
      bio,
      interests,
      dealBreakers,
      photoURLs: [
        "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=400",
      ],
      isProfileComplete: true,
      createdAt: now,
      updatedAt: now,
      dailyWhisperCount: 0,
      lastWhisperDate: null,
      isOpenToWhispers: true,
      feedDay: null,
      feedServedCount: 0,
      seenUserIds: [],
    };

    batch.set(docRef, userProfile, { merge: true });
  }

  await batch.commit();
  console.log("Seeded 20 user profiles into Firestore.");
}

seedUsers()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error seeding users", err);
    process.exit(1);
  });
