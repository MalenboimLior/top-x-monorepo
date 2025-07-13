import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createHmac } from 'crypto';
import { cert } from 'firebase-admin/app';
const firebaseConfig = {
  credential: cert('./serviceAccountKey.json'),
};

initializeApp(firebaseConfig);
const db = getFirestore();

// Secret key for HMAC-SHA256 (store securely, e.g., Firebase Secret Manager)
const SECRET_KEY = 'your-secret-key-123'; // Replace with a strong, random key

function hashAnswer(correctIndex) {
  return createHmac('sha256', SECRET_KEY)
    .update(correctIndex.toString())
    .digest('hex');
}

async function seedQuestions() {
  const questions = [
    {
      id: '1',
      question: 'What is the capital of France?',
      options: ['Paris', 'London', 'Berlin', 'Madrid'],
      correct: 0,
      difficulty: 'easy',
      group: 'geography',
    },
    {
      id: '2',
      question: 'Which planet is closest to the sun?',
      options: ['Venus', 'Mercury', 'Earth', 'Mars'],
      correct: 1,
      difficulty: 'medium',
      group: 'science',
    },
    {
      id: '3',
      question: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
      correct: 1,
      difficulty: 'easy',
      group: 'math',
    },
    // Add 197 more questions here...
    // Example placeholder for remaining questions
    ...Array.from({ length: 197 }, (_, i) => ({
      id: `${i + 4}`,
      question: `Sample question ${i + 4}`,
      options: [`Option 1-${i + 4}`, `Option 2-${i + 4}`, `Option 3-${i + 4}`, `Option 4-${i + 4}`],
      correct: Math.floor(Math.random() * 4),
      difficulty: ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)],
      group: ['geography', 'science', 'math', 'history'][Math.floor(Math.random() * 4)],
    })),
  ];

  const batch = db.batch();
  for (const q of questions) {
    const docRef = db.collection('questions').doc(q.id);
    batch.set(docRef, {
      question: q.question,
      options: q.options,
      correctHash: hashAnswer(q.correct),
      difficulty: q.difficulty,
      group: q.group,
    });
  }
  await batch.commit();
  // console.log('Questions seeded');
}

// seedQuestions().catch(console.error);
