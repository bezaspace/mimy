// scripts/dumpAllFirestore.js
// Read-only Firestore dumper using Firebase Admin

const path = require('path');
const fs = require('fs');

// Prefer .env.local (Next.js style) if it exists, otherwise fall back to .env
const envLocalPath = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envLocalPath)) {
  require('dotenv').config({ path: envLocalPath });
} else {
  require('dotenv').config();
}

const admin = require('firebase-admin');

// --- Initialize Admin SDK ---
// Option 1: JSON service account in env var FIREBASE_SERVICE_ACCOUNT_KEY
// Option 2: GOOGLE_APPLICATION_CREDENTIALS pointing to a JSON file
if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId:
        process.env.FIREBASE_PROJECT_ID ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
        serviceAccount.project_id,
    });
  } else {
    // Uses Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS, gcloud auth, etc.)
    admin.initializeApp();
  }
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

async function dumpDocument(docRef, indent = 0) {
  const pad = ' '.repeat(indent);
  const snap = await docRef.get();

  if (!snap.exists) {
    console.log(`${pad}Document ${docRef.path} (does not exist)`);
    return;
  }

  console.log(`${pad}Document: ${docRef.path}`);
  const dataJson = JSON.stringify(snap.data(), null, 2)
    .split('\n')
    .map((line) => pad + line)
    .join('\n');
  console.log(dataJson);

  // List subcollections under this document
  const subcollections = await docRef.listCollections();
  for (const sub of subcollections) {
    await dumpCollection(sub, indent + 2);
  }
}

async function dumpCollection(colRef, indent = 0) {
  const pad = ' '.repeat(indent);
  console.log(`\n${pad}=== Collection: ${colRef.path} ===`);

  const snap = await colRef.get();
  if (snap.empty) {
    console.log(`${pad}(no documents)`);
    return;
  }

  for (const doc of snap.docs) {
    await dumpDocument(doc.ref, indent + 2);
  }
}

async function main() {
  console.log('Project ID (from Admin):', admin.app().options.projectId);
  console.log('Dumping all root collections...');

  const rootCollections = await db.listCollections();
  if (rootCollections.length === 0) {
    console.log('No collections found.');
    return;
  }

  for (const col of rootCollections) {
    await dumpCollection(col, 0);
  }

  console.log('\n=== Done dumping Firestore ===');
}

main().catch((err) => {
  console.error('Error dumping Firestore:', err);
  process.exit(1);
});
