#!/usr/bin/env node
/**
 * Upload Pyramid Images Script
 *
 * Uploads JPEG images to Firebase Storage and updates pyramid game config
 *
 * Usage:
 *   node scripts/uploadPyramidImages.js <gameId> <imagesFolder>
 *
 * Example:
 *   node scripts/uploadPyramidImages.js foodpyramidil scripts/tempimages
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Valid game type IDs
const VALID_GAME_TYPES = ['trivia', 'quiz', 'PyramidTier', 'ZoneReveal', 'Pacman', 'FisherGame'];

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  if (args.length < 2) {
    console.error('Usage: node scripts/uploadPyramidImages.js <gameId> <imagesFolder>');
    console.error('Example: node scripts/uploadPyramidImages.js foodpyramidil scripts/tempimages');
    process.exit(1);
  }

  return {
    gameId: args[0],
    imagesFolder: args[1],
  };
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

  return {
    storage: getStorage(),
    db: getFirestore(),
  };
}

/**
 * Upload image to Firebase Storage
 */
async function uploadImage(storage, bucket, localPath, storagePath) {
  const fileBuffer = fs.readFileSync(localPath);

  const file = bucket.file(storagePath);
  await file.save(fileBuffer, {
    metadata: {
      contentType: 'image/jpeg',
    },
  });

  // Make the file publicly accessible
  await file.makePublic();

  // Get the public URL
  const [metadata] = await file.getMetadata();
  return `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
}

/**
 * Update pyramid game config with new image URLs
 */
async function updatePyramidConfig(db, gameId, imageUrls) {
  const gameRef = db.collection('games').doc(gameId);
  const gameDoc = await gameRef.get();

  if (!gameDoc.exists) {
    throw new Error(`Game "${gameId}" does not exist`);
  }

  const gameData = gameDoc.data();
  if (gameData.gameTypeId !== 'PyramidTier') {
    throw new Error(`Game "${gameId}" is not a pyramid game`);
  }

  // Update items with new URLs
  const updatedItems = gameData.custom.items.map(item => {
    // Try to match by filename, handling both .jpg and .jpeg extensions
    let newUrl = imageUrls[item.src];

    // If no direct match, try with different extension
    if (!newUrl) {
      const baseName = item.src.replace(/\.(jpg|jpeg)$/i, '');
      const jpgKey = `${baseName}.jpg`;
      const jpegKey = `${baseName}.jpeg`;

      newUrl = imageUrls[jpgKey] || imageUrls[jpegKey];
    }

    if (newUrl) {
      return { ...item, src: newUrl };
    }
    return item;
  });

  // Update the game document
  await gameRef.update({
    'custom.items': updatedItems,
    updatedAt: Date.now(),
  });

  return updatedItems.length;
}

/**
 * Main function
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { gameId, imagesFolder } = args;

  console.log(`\nUploading pyramid images for game: ${gameId}`);
  console.log(`Images folder: ${imagesFolder}`);

  // Initialize Firebase
  const { storage, db } = initFirebase();
  const bucket = storage.bucket('top-x-co.firebasestorage.app');

  // Read all JPEG files from the folder
  const imagesPath = path.resolve(process.cwd(), imagesFolder);
  if (!fs.existsSync(imagesPath)) {
    console.error(`Error: Images folder not found: ${imagesPath}`);
    process.exit(1);
  }

  const files = fs.readdirSync(imagesPath)
    .filter(file => file.endsWith('.jpeg') || file.endsWith('.jpg'))
    .map(file => ({
      name: file,
      path: path.join(imagesPath, file),
    }));

  console.log(`Found ${files.length} image files to upload`);

  // Upload each image and collect URLs
  const imageUrls = {};
  let uploadedCount = 0;

  for (const file of files) {
    const storagePath = `pyramid/${gameId}/${file.name}`;
    console.log(`Uploading: ${file.name} -> ${storagePath}`);

    try {
      const downloadUrl = await uploadImage(storage, bucket, file.path, storagePath);
      imageUrls[file.name] = downloadUrl;
      uploadedCount++;
      console.log(`✓ Uploaded: ${downloadUrl}`);
    } catch (error) {
      console.error(`✗ Failed to upload ${file.name}:`, error.message);
    }
  }

  console.log(`\nUploaded ${uploadedCount} out of ${files.length} images`);

  // Update the pyramid game config
  if (uploadedCount > 0) {
    console.log('\nUpdating pyramid game config...');
    try {
      const updatedCount = await updatePyramidConfig(db, gameId, imageUrls);
      console.log(`✓ Updated ${updatedCount} items in game config`);
    } catch (error) {
      console.error('✗ Failed to update game config:', error.message);
      process.exit(1);
    }
  }

  console.log(`\n🎉 Successfully uploaded pyramid images for game: ${gameId}`);
  console.log(`View at: https://top-x.co/games/info?game=${gameId}`);

  process.exit(0);
}

// Run main
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
