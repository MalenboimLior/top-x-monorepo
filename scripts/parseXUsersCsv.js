#!/usr/bin/env node
/**
 * Parse X Users CSV and update pyramid game
 */

import fs from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse CSV records that may span multiple lines
function parseCSVRecords(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  let currentRecord = '';
  const records = [];

  for (let i = 1; i < lines.length; i++) { // Skip header
    const line = lines[i];
    currentRecord += line;

    // Count quotes to see if we have a complete record
    const quoteCount = (currentRecord.match(/"/g) || []).length;

    if (quoteCount % 2 === 0 && quoteCount > 0) {
      // We have a complete record
      records.push(currentRecord);
      currentRecord = '';
    } else if (line.trim()) {
      // Continue building the record
      currentRecord += '\n';
    }
  }

  return records;
}

// Parse a single CSV record
function parseCSVRecord(record) {
  // Split by comma but handle quoted fields
  const parts = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < record.length) {
    const char = record[i];

    if (char === '"') {
      if (inQuotes && record[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i += 2;
        continue;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
    i++;
  }

  parts.push(current);

  // Clean up quotes and trim
  return parts.map(part => part.replace(/^"|"$/g, '').trim());
}

// Main function
async function main() {
  try {
    // Read the CSV
    const csvPath = '/Users/liormalenboim/Downloads/x_users.csv';
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    // Parse records
    const records = parseCSVRecords(csvContent);
    console.log(`Found ${records.length} records in CSV`);

    // Parse items
    const items = [];
    records.forEach((record, index) => {
      try {
        const parts = parseCSVRecord(record);

        if (parts.length >= 5) {
          const [name, label, src, description, tag] = parts;

          if (name && label && src) {
            items.push({
              id: name,
              label: label,
              name: label,
              src: src,
              description: description || '',
              color: tag || '',
              active: true,
              source: name
            });
          } else {
            console.log(`Skipping record ${index + 1}: missing required fields`);
          }
        } else {
          console.log(`Skipping record ${index + 1}: insufficient fields (${parts.length})`);
        }
      } catch (error) {
        console.log(`Error parsing record ${index + 1}:`, error.message);
      }
    });

    console.log(`Successfully parsed ${items.length} items`);

    if (items.length > 0) {
      console.log('Sample item:', JSON.stringify(items[0], null, 2));

      // Initialize Firebase
      const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json');
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

      initializeApp({ credential: cert(serviceAccount) });
      const db = getFirestore();

      // Update the game
      const gameRef = db.collection('games').doc('topx2025il');
      await gameRef.update({
        'custom.items': items,
        updatedAt: Date.now(),
      });

      console.log(`✅ Successfully updated game with ${items.length} items`);
    } else {
      console.log('❌ No items were parsed successfully');
    }

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
