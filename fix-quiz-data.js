// Script để fix quiz data cho ordering và matching questions
// Run this in Firebase Console or via Node.js

// Câu hỏi 4: ORDERING - Sắp xếp các đơn vị đo độ dài từ nhỏ đến lớn
const orderingQuestion = {
  id: "q_1763566636679_cqd1m0qun",
  type: "ordering",
  text: "Sắp xếp các đơn vị đo độ dài từ nhỏ đến lớn:",
  points: 10,
  explanation: "Thứ tự đúng: Milimét, Centimét, Mét, Kilômét.",
  
  // ADD THIS FIELD:
  orderingItems: [
    {
      id: "item_1",
      text: "Milimét (mm)",
      correctOrder: 1
    },
    {
      id: "item_2",
      text: "Centimét (cm)",
      correctOrder: 2
    },
    {
      id: "item_3",
      text: "Mét (m)",
      correctOrder: 3
    },
    {
      id: "item_4",
      text: "Kilômét (km)",
      correctOrder: 4
    }
  ],
  
  // Keep these empty for ordering type
  answers: [],
  acceptedAnswers: [],
  correctAnswer: null
};

// Câu hỏi 5: MATCHING - Ghép các hình học với số cạnh tương ứng
const matchingQuestion = {
  id: "q_1763566636680_oag3y3egi",
  type: "matching",
  text: "Ghép các hình học với số cạnh tương ứng:",
  points: 10,
  explanation: "Hình vuông có 4 cạnh, hình tam giác có 3 cạnh, hình ngũ giác có 5 cạnh.",
  
  // ADD THIS FIELD:
  matchingPairs: [
    {
      id: "pair_1",
      left: "Hình tam giác",
      right: "3 cạnh"
    },
    {
      id: "pair_2",
      left: "Hình vuông",
      right: "4 cạnh"
    },
    {
      id: "pair_3",
      left: "Hình ngũ giác",
      right: "5 cạnh"
    },
    {
      id: "pair_4",
      left: "Hình lục giác",
      right: "6 cạnh"
    }
  ],
  
  // Keep these empty for matching type
  answers: [],
  acceptedAnswers: [],
  correctAnswer: null
};

// HOW TO UPDATE IN FIRESTORE:
// 1. Go to Firebase Console
// 2. Navigate to Firestore Database
// 3. Find your quiz document
// 4. Click on questions array
// 5. Edit question at index 4 (ordering) - add orderingItems field
// 6. Edit question at index 5 (matching) - add matchingPairs field
// 7. Save changes

console.log("Updated Ordering Question:");
console.log(JSON.stringify(orderingQuestion, null, 2));

console.log("\nUpdated Matching Question:");
console.log(JSON.stringify(matchingQuestion, null, 2));

// ALTERNATIVE: Update via Firebase Admin SDK
/*
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function fixQuizData() {
  const quizRef = db.collection('quizzes').doc('YOUR_QUIZ_ID');
  const quizDoc = await quizRef.get();
  const quizData = quizDoc.data();
  
  // Update question 4 (ordering)
  quizData.questions[4] = orderingQuestion;
  
  // Update question 5 (matching)
  quizData.questions[5] = matchingQuestion;
  
  await quizRef.update({
    questions: quizData.questions
  });
  
  console.log("✅ Quiz data updated successfully!");
}

fixQuizData().catch(console.error);
*/
