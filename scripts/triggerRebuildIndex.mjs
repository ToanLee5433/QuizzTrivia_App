/**
 * Script to trigger rebuildFullIndex Cloud Function
 * 
 * Usage: node scripts/triggerRebuildIndex.mjs
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyDtBzTHNPQ5PxKhVb-si89kgr5T_3ppwj8",
  authDomain: "datn-quizapp.firebaseapp.com",
  projectId: "datn-quizapp",
  storageBucket: "datn-quizapp.firebasestorage.app",
  messagingSenderId: "741975099365",
  appId: "1:741975099365:web:75a1d1eb4b6d89f0f7110c",
};

async function main() {
  console.log('🚀 Triggering rebuildFullIndex Cloud Function...\n');

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const functions = getFunctions(app, 'us-central1');

  // Get admin credentials from command line or environment
  const email = process.env.ADMIN_EMAIL || process.argv[2];
  const password = process.env.ADMIN_PASSWORD || process.argv[3];

  if (!email || !password) {
    console.log('Usage: node scripts/triggerRebuildIndex.mjs <admin_email> <admin_password>');
    console.log('   Or: ADMIN_EMAIL=xxx ADMIN_PASSWORD=xxx node scripts/triggerRebuildIndex.mjs');
    process.exit(1);
  }

  try {
    // Sign in as admin
    console.log(`📧 Signing in as ${email}...`);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log(`✅ Signed in as ${userCredential.user.email}\n`);

    // Call rebuildFullIndex
    console.log('🔄 Calling rebuildFullIndex Cloud Function...');
    console.log('   This may take several minutes...\n');

    const rebuildFullIndex = httpsCallable(functions, 'rebuildFullIndex');
    const result = await rebuildFullIndex({});

    console.log('✅ Result:', JSON.stringify(result.data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error('   Code:', error.code);
    }
    process.exit(1);
  }

  process.exit(0);
}

main();
