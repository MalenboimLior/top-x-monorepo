// uploadQuestionsFromCsv.js
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createHmac } from 'crypto';
import fs from 'fs';
import csvParser from 'csv-parser';

const firebaseConfig = {
  credential: cert('./serviceAccountKey.json'),
};

const SECRET_KEY = 'your-secret-key-123'; // Replace this with a secure key

initializeApp(firebaseConfig);
const db = getFirestore();

function hashAnswer(correctIndex) {
  return createHmac('sha256', SECRET_KEY)
    .update(correctIndex.toString())
    .digest('hex');
}

async function deleteExistingQuestions() {
  const snapshot = await db.collection('questions').get();
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  // console.log(`Deleted ${snapshot.size} existing questions.`);
}

async function uploadCsvQuestions(filePath) {
  const questions = [];

  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row) => {
        try {
          const options = [row['option 1'], row['option 2'], row['option 3'], row['option 4']];
          const correctIndex = parseInt(row['correct'], 10);
          questions.push({
            id: row['id'],
            question: row['question'],
            options,
            correctHash: hashAnswer(correctIndex),
            difficulty: parseInt(row['difficulty'], 10),
            group: row['group'],
          });
        } catch (err) {
          console.error('Error parsing row:', row, err);
        }
      })
      .on('end', () => {
        // console.log(`Parsed ${questions.length} questions from CSV.`);
        resolve();
      })
      .on('error', reject);
  });

  const batch = db.batch();
  for (const q of questions) {
    const docRef = db.collection('questions').doc(q.id);
    batch.set(docRef, q);
  }

  await batch.commit();
  // console.log('Questions uploaded.');
}

async function main() {
  try {
    await deleteExistingQuestions();
    await uploadCsvQuestions('./questions.csv');
  } catch (error) {
    console.error('Operation failed:', error);
  }
}

main();
