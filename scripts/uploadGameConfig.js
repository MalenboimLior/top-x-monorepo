#!/usr/bin/env node
/**
 * Upload Game Config Script
 * 
 * CLI tool to upload game configurations from JSON files to Firebase Firestore.
 * Supports adding new games or updating existing ones.
 * 
 * Usage:
 *   node scripts/uploadGameConfig.js <json-file> [options]
 * 
 * Options:
 *   --id <gameId>   Override the document ID (default: uses id from JSON)
 *   --dry-run       Validate only, don't upload to Firebase
 *   --delete        Delete the game instead of creating/updating
 *   --download      Download a game config from Firebase to JSON
 *   --output <file> Output file path for download (default: ./downloaded-<gameId>.json)
 *   --help          Show this help message
 * 
 * Examples:
 *   node scripts/uploadGameConfig.js ./test-data/personality-quiz.json
 *   node scripts/uploadGameConfig.js ./test-data/my-quiz.json --id my_custom_id
 *   node scripts/uploadGameConfig.js ./test-data/my-quiz.json --dry-run
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Valid game type IDs
const VALID_GAME_TYPES = ['trivia', 'quiz', 'PyramidTier', 'ZoneReveal', 'Pacman', 'FisherGame'];

// Required fields for a Game document
const REQUIRED_FIELDS = ['name', 'gameTypeId', 'custom'];

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const result = {
    jsonFile: null,
    id: null,
    dryRun: false,
    deleteGame: false,
    download: false,
    outputFile: null,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--dry-run') {
      result.dryRun = true;
    } else if (arg === '--delete') {
      result.deleteGame = true;
    } else if (arg === '--download') {
      result.download = true;
    } else if (arg === '--output' || arg === '-o') {
      if (i + 1 < args.length) {
        result.outputFile = args[++i];
      }
    } else if (arg === '--id' && i + 1 < args.length) {
      result.id = args[++i];
    } else if (!arg.startsWith('-') && !result.jsonFile) {
      result.jsonFile = arg;
    }
  }

  return result;
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
Upload Game Config Script

Usage:
  node scripts/uploadGameConfig.js <json-file> [options]

Options:
  --id <gameId>   Override the document ID (default: uses id from JSON)
  --dry-run       Validate only, don't upload to Firebase
  --delete        Delete the game by ID (requires --id or id in JSON)
  --download      Download a game config from Firebase to JSON (requires --id)
  --output <file> Output file path for download (default: ./downloaded-<gameId>.json)
  --help, -h      Show this help message

Examples:
  # Upload a new game or update existing
  node scripts/uploadGameConfig.js ./test-data/personality-quiz.json

  # Upload with custom ID
  node scripts/uploadGameConfig.js ./test-data/my-quiz.json --id my_custom_id

  # Validate JSON without uploading
  node scripts/uploadGameConfig.js ./test-data/my-quiz.json --dry-run

  # Delete a game
  node scripts/uploadGameConfig.js --delete --id game_to_delete

  # Download a game config to JSON
  node scripts/uploadGameConfig.js --download --id game_id

  # Download to specific file
  node scripts/uploadGameConfig.js --download --id game_id --output ./my-game.json

JSON Format:
  The JSON file should match the Game interface:
  {
    "id": "my_game_id",
    "name": "My Game Name",
    "description": "Game description",
    "gameTypeId": "quiz",
    "active": true,
    "language": "en",
    "vip": [],
    "custom": { ... }
  }
`);
}

/**
 * Validate game data structure
 */
function validateGameData(data) {
  const errors = [];

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (data[field] === undefined || data[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate gameTypeId
  if (data.gameTypeId && !VALID_GAME_TYPES.includes(data.gameTypeId)) {
    errors.push(`Invalid gameTypeId: "${data.gameTypeId}". Valid types: ${VALID_GAME_TYPES.join(', ')}`);
  }

  // Validate language
  if (data.language && !['en', 'il'].includes(data.language)) {
    errors.push(`Invalid language: "${data.language}". Valid options: en, il`);
  }

  // Validate custom config exists and has content
  if (data.custom && typeof data.custom !== 'object') {
    errors.push('Field "custom" must be an object');
  }

  // Quiz-specific validation
  if (data.gameTypeId === 'quiz' && data.custom) {
    if (!data.custom.mode || !['personality', 'archetype'].includes(data.custom.mode)) {
      errors.push('Quiz config must have mode: "personality" or "archetype"');
    }
    if (!Array.isArray(data.custom.questions) || data.custom.questions.length === 0) {
      errors.push('Quiz config must have at least one question');
    }
  }

  // Trivia-specific validation
  if (data.gameTypeId === 'trivia' && data.custom) {
    if (!Array.isArray(data.custom.questions) || data.custom.questions.length === 0) {
      errors.push('Trivia config must have at least one question');
    }
  }

  return errors;
}

/**
 * Initialize Firebase Admin SDK
 */
function initFirebase() {
  // Look for service account key in multiple locations
  const possiblePaths = [
    path.resolve(__dirname, '../serviceAccountKey.json'),
    path.resolve(__dirname, '../apps/client/serviceAccountKey.json'),
    path.resolve(process.cwd(), 'serviceAccountKey.json'),
  ];

  let keyPath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      keyPath = p;
      break;
    }
  }

  if (!keyPath) {
    console.error('Error: serviceAccountKey.json not found.');
    console.error('Searched in:', possiblePaths.join('\n  '));
    console.error('\nPlease ensure your Firebase service account key is available.');
    process.exit(1);
  }

  console.log(`Using service account key: ${keyPath}`);
  
  initializeApp({
    credential: cert(keyPath),
  });

  return getFirestore();
}

/**
 * Read and parse JSON file
 */
function readJsonFile(filePath) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  
  if (!fs.existsSync(absolutePath)) {
    console.error(`Error: File not found: ${absolutePath}`);
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(absolutePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error parsing JSON file: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Upload game config to Firestore
 */
async function uploadGame(db, gameId, gameData, isUpdate) {
  const docRef = db.collection('games').doc(gameId);
  
  // Check if document exists
  const existingDoc = await docRef.get();
  const exists = existingDoc.exists;

  // Prepare data with timestamps
  const now = Date.now();
  const dataToUpload = {
    ...gameData,
    id: gameId,
    updatedAt: now,
  };

  // Only set createdAt on new documents
  if (!exists) {
    dataToUpload.createdAt = now;
  }

  // Ensure creator field is set correctly
  if (!dataToUpload.creator) {
    dataToUpload.creator = {};
  }
  dataToUpload.creator.userid = dataToUpload.creator.userid || '3elioaYGNBaqsuY8mL3XSG7SD7E2';
  dataToUpload.creator.username = dataToUpload.creator.username || 'Topxisrael';
  dataToUpload.creator.image = dataToUpload.creator.image || 'https://pbs.twimg.com/profile_images/1940446174214766592/LuC320Bt_400x400.png';

  // Ensure community is set to false
  if (dataToUpload.community === undefined) {
    dataToUpload.community = false;
  }

  // Remove undefined values
  Object.keys(dataToUpload).forEach(key => {
    if (dataToUpload[key] === undefined) {
      delete dataToUpload[key];
    }
  });

  // Use set with merge to allow partial updates
  await docRef.set(dataToUpload, { merge: true });

  return { exists, docRef };
}

/**
 * Delete a game from Firestore
 */
async function deleteGame(db, gameId) {
  const docRef = db.collection('games').doc(gameId);
  const doc = await docRef.get();
  
  if (!doc.exists) {
    console.log(`Game "${gameId}" does not exist.`);
    return false;
  }

  await docRef.delete();
  return true;
}

/**
 * Recursively convert Firestore Timestamps to ISO strings
 */
function convertTimestamps(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // Check if it's a Firestore Timestamp
  if (obj && typeof obj === 'object' && obj.toDate && typeof obj.toDate === 'function') {
    return obj.toDate().toISOString();
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => convertTimestamps(item));
  }
  
  // Handle objects
  if (typeof obj === 'object') {
    const converted = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        converted[key] = convertTimestamps(obj[key]);
      }
    }
    return converted;
  }
  
  return obj;
}

/**
 * Download a game config from Firestore to JSON file
 */
async function downloadGame(db, gameId, outputPath) {
  const docRef = db.collection('games').doc(gameId);
  const doc = await docRef.get();
  
  if (!doc.exists) {
    console.error(`Game "${gameId}" does not exist.`);
    return false;
  }

  const gameData = doc.data();
  
  // Convert all Firestore Timestamps to ISO strings recursively
  const cleanData = convertTimestamps(gameData);
  
  // Write to file
  const jsonContent = JSON.stringify(cleanData, null, 2);
  fs.writeFileSync(outputPath, jsonContent, 'utf8');
  
  return true;
}

/**
 * Main function
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  // Handle delete operation
  if (args.deleteGame) {
    if (!args.id && !args.jsonFile) {
      console.error('Error: --delete requires --id <gameId> or a JSON file with id field');
      process.exit(1);
    }

    let gameId = args.id;
    if (!gameId && args.jsonFile) {
      const data = readJsonFile(args.jsonFile);
      gameId = data.id;
    }

    if (!gameId) {
      console.error('Error: No game ID provided for deletion');
      process.exit(1);
    }

    if (args.dryRun) {
      console.log(`[DRY RUN] Would delete game: ${gameId}`);
      process.exit(0);
    }

    const db = initFirebase();
    const deleted = await deleteGame(db, gameId);
    
    if (deleted) {
      console.log(`✓ Successfully deleted game: ${gameId}`);
    }
    process.exit(0);
  }

  // Handle download operation
  if (args.download) {
    if (!args.id) {
      console.error('Error: --download requires --id <gameId>');
      console.log('Usage: node scripts/uploadGameConfig.js --download --id <gameId> [--output <file>]');
      process.exit(1);
    }

    const gameId = args.id;
    const outputPath = args.outputFile || path.resolve(process.cwd(), `downloaded-${gameId}.json`);

    if (args.dryRun) {
      console.log(`[DRY RUN] Would download game: ${gameId}`);
      console.log(`[DRY RUN] Output file: ${outputPath}`);
      process.exit(0);
    }

    console.log(`\nDownloading game: ${gameId}`);
    const db = initFirebase();
    
    try {
      // First, get the game to show summary
      const docRef = db.collection('games').doc(gameId);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        console.error(`\n❌ Game "${gameId}" does not exist.`);
        process.exit(1);
      }
      
      const gameData = doc.data();
      
      // Show summary
      console.log('\nGame Summary:');
      console.log(`  ID: ${gameId}`);
      console.log(`  Name: ${gameData.name || 'N/A'}`);
      console.log(`  Type: ${gameData.gameTypeId || 'N/A'}`);
      console.log(`  Active: ${gameData.active ?? 'N/A'}`);
      console.log(`  Language: ${gameData.language ?? 'N/A'}`);
      
      if (gameData.custom) {
        if (gameData.custom.mode) {
          console.log(`  Mode: ${gameData.custom.mode}`);
        }
        if (Array.isArray(gameData.custom.questions)) {
          console.log(`  Questions: ${gameData.custom.questions.length}`);
        }
      }
      
      const success = await downloadGame(db, gameId, outputPath);
      
      if (success) {
        console.log(`\n✓ Successfully downloaded game: ${gameId}`);
        console.log(`  Saved to: ${outputPath}`);
      } else {
        process.exit(1);
      }
    } catch (err) {
      console.error(`\n❌ Download failed: ${err.message}`);
      process.exit(1);
    }
    
    process.exit(0);
  }

  // Regular upload operation
  if (!args.jsonFile) {
    console.error('Error: No JSON file specified');
    console.log('Usage: node scripts/uploadGameConfig.js <json-file> [options]');
    console.log('Run with --help for more information');
    process.exit(1);
  }

  // Read and parse JSON
  console.log(`\nReading: ${args.jsonFile}`);
  const gameData = readJsonFile(args.jsonFile);

  // Determine game ID
  const gameId = args.id || gameData.id;
  if (!gameId) {
    console.error('Error: No game ID provided. Use --id or include "id" in JSON.');
    process.exit(1);
  }

  // Validate game data
  console.log('\nValidating game data...');
  const validationErrors = validateGameData(gameData);
  
  if (validationErrors.length > 0) {
    console.error('\n❌ Validation errors:');
    validationErrors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }

  console.log('✓ Validation passed');

  // Show summary
  console.log('\nGame Summary:');
  console.log(`  ID: ${gameId}`);
  console.log(`  Name: ${gameData.name}`);
  console.log(`  Type: ${gameData.gameTypeId}`);
  console.log(`  Active: ${gameData.active ?? true}`);
  console.log(`  Language: ${gameData.language ?? 'en'}`);
  
  if (gameData.custom) {
    if (gameData.custom.mode) {
      console.log(`  Mode: ${gameData.custom.mode}`);
    }
    if (Array.isArray(gameData.custom.questions)) {
      console.log(`  Questions: ${gameData.custom.questions.length}`);
    }
  }

  // Dry run mode
  if (args.dryRun) {
    console.log('\n[DRY RUN] Validation complete. No changes made.');
    console.log('\nJSON Preview:');
    console.log(JSON.stringify(gameData, null, 2).substring(0, 1000) + '...');
    process.exit(0);
  }

  // Upload to Firebase
  console.log('\nUploading to Firebase...');
  const db = initFirebase();
  
  try {
    const { exists } = await uploadGame(db, gameId, gameData);
    
    console.log(`\n✓ Successfully ${exists ? 'updated' : 'created'} game: ${gameId}`);
    console.log(`\nView at: https://top-x.co/games/info?game=${gameId}`);
    
    if (gameData.gameTypeId === 'quiz') {
      console.log(`Play at: https://top-x.co/games/quiz?game=${gameId}`);
    } else if (gameData.gameTypeId === 'trivia') {
      console.log(`Play at: https://top-x.co/games/trivia?game=${gameId}`);
    }
  } catch (err) {
    console.error(`\n❌ Upload failed: ${err.message}`);
    process.exit(1);
  }

  process.exit(0);
}

// Run main
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

