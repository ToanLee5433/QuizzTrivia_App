#!/usr/bin/env node

/**
 * Check quiz password configuration in Firestore
 * Usage: node scripts/checkQuizPassword.mjs <quizId>
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const QUIZ_ID = process.argv[2] || 'kFYJfEMx8YSvJMmxll1C';

// Initialize Firebase Admin
try {
  const serviceAccount = await import('../serviceAccountKey.json', {
    assert: { type: 'json' }
  });
  
  initializeApp({
    credential: cert(serviceAccount.default)
  });
  
  console.log('✅ Firebase Admin initialized\n');
} catch (error) {
  console.error('❌ Error: Missing serviceAccountKey.json');
  console.log('\n📝 Instructions:');
  console.log('1. Go to Firebase Console > Project Settings > Service Accounts');
  console.log('2. Click "Generate new private key"');
  console.log('3. Save as serviceAccountKey.json in project root');
  process.exit(1);
}

const db = getFirestore();

async function checkQuiz(quizId) {
  try {
    console.log(`🔍 Checking quiz: ${quizId}\n`);
    
    const quizRef = db.collection('quizzes').doc(quizId);
    const quizDoc = await quizRef.get();
    
    if (!quizDoc.exists) {
      console.error('❌ Quiz not found!');
      return;
    }
    
    const data = quizDoc.data();
    
    console.log('📋 Quiz Metadata:');
    console.log('  Title:', data.title);
    console.log('  Created by:', data.createdBy);
    console.log('  Status:', data.status);
    console.log('  Visibility:', data.visibility);
    console.log('  havePassword:', data.havePassword);
    console.log('\n🔒 Password Configuration:');
    
    if (data.pwd) {
      console.log('  ✅ pwd field exists');
      console.log('  - enabled:', data.pwd.enabled);
      console.log('  - algo:', data.pwd.algo);
      console.log('  - salt:', data.pwd.salt ? `${data.pwd.salt.substring(0, 16)}...` : 'MISSING');
      console.log('  - hash:', data.pwd.hash ? `${data.pwd.hash.substring(0, 16)}...` : 'MISSING');
      
      // Check if all required fields are present
      const isValid = 
        data.pwd.enabled === true &&
        data.pwd.salt &&
        data.pwd.hash;
        
      console.log('\n✨ Validation:');
      console.log('  pwd.enabled === true:', data.pwd.enabled === true);
      console.log('  pwd.salt exists:', !!data.pwd.salt);
      console.log('  pwd.hash exists:', !!data.pwd.hash);
      console.log('  Overall valid:', isValid ? '✅' : '❌');
      
      // Check if visibility or havePassword is set
      const hasPasswordFlag = 
        data.visibility === 'password' || 
        data.havePassword === 'password';
        
      console.log('\n🚩 Password Flags:');
      console.log('  visibility === "password":', data.visibility === 'password');
      console.log('  havePassword === "password":', data.havePassword === 'password');
      console.log('  Has password flag:', hasPasswordFlag ? '✅' : '❌');
      
    } else {
      console.log('  ❌ pwd field is MISSING');
    }
    
    // Check Firestore rules logic
    console.log('\n🔐 Firestore Rules Check:');
    const ruleConditions = {
      'signedIn()': '✅ (assumed)',
      'request.auth.uid == uid': '✅ (client sets correct uid)',
      'visibility == "password" OR havePassword == "password"': 
        (data.visibility === 'password' || data.havePassword === 'password') ? '✅' : '❌',
      'pwd.enabled == true': data.pwd?.enabled === true ? '✅' : '❌',
      'proofHash == pwd.hash': '✅ (client calculates correctly)'
    };
    
    for (const [condition, result] of Object.entries(ruleConditions)) {
      console.log(`  ${result} ${condition}`);
    }
    
    const allPass = Object.values(ruleConditions).every(r => r === '✅');
    console.log(`\n${allPass ? '✅' : '❌'} Overall: ${allPass ? 'Should PASS' : 'Will FAIL'}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run check
checkQuiz(QUIZ_ID);
