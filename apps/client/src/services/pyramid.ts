// Client-side Pyramid Service (Firestore & Storage writes)
// ----------------------------------------------------
// ✅ Abstracts Firebase calls for pyramid game operations
// ✅ Handles image uploads and game document updates
// ✅ Provides typed results with error handling
//
// Collection paths:
// - Games: `games/{gameId}` (updates custom.communityItems)
// - Storage: `presidents/{itemId}.jpg` (image uploads)

import {
  getFirestore,
  doc,
  updateDoc,
  arrayUnion,
  type Firestore,
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  type FirebaseStorage,
} from 'firebase/storage';
import type { PyramidItem } from '@top-x/shared/types/pyramid';

// ----------------------
// Types
// ----------------------
export type { PyramidItem } from '@top-x/shared/types/pyramid';

export type AddCommunityItemParams = {
  gameId: string;
  itemData: {
    name: string;
    description?: string;
    color?: string;
    userId: string;
    userDisplayName?: string;
  };
  imageFile: File;
  storagePath?: string; // Optional custom storage path, defaults to `presidents/{itemId}.jpg`
};

export type AddCommunityItemResult = {
  item: PyramidItem | null;
  error?: string;
};

// ----------------------
// Helpers
// ----------------------
const db = ((): Firestore => getFirestore())();
const storage = ((): FirebaseStorage => getStorage())();

/**
 * Generates a unique item ID based on user ID and random number
 */
function generateItemId(userId: string): string {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${userId || 'anonymous'}_${randomNum}`;
}

/**
 * Uploads an image file to Firebase Storage
 */
async function uploadImage(
  file: File,
  storagePath: string
): Promise<string> {
  const storageReference = storageRef(storage, storagePath);
  await uploadBytes(storageReference, file);
  const downloadURL = await getDownloadURL(storageReference);
  return downloadURL;
}

// ----------------------
// API
// ----------------------

/**
 * Adds a community item to a pyramid game
 * Uploads the image to Firebase Storage and updates the game document
 */
export async function addCommunityItem(
  params: AddCommunityItemParams
): Promise<AddCommunityItemResult> {
  const { gameId, itemData, imageFile, storagePath } = params;

  try {
    if (!imageFile) {
      return { item: null, error: 'Image file is required' };
    }

    if (!gameId) {
      return { item: null, error: 'Game ID is required' };
    }

    // Generate item ID
    const itemId = generateItemId(itemData.userId);

    // Determine storage path
    const finalStoragePath = storagePath || `presidents/${itemId}.jpg`;

    // Upload image to Firebase Storage
    const imageUrl = await uploadImage(imageFile, finalStoragePath);

    // Create PyramidItem
    const newItem: PyramidItem = {
      id: itemId,
      label: itemData.name,
      name: itemData.name,
      src: imageUrl,
      description: itemData.description,
      color: itemData.color || '#9900ff',
      active: true,
      source: itemData.userDisplayName || 'anonymous',
    };

    // Update game document with new community item
    const gameRef = doc(db, 'games', gameId);
    await updateDoc(gameRef, {
      'custom.communityItems': arrayUnion(newItem),
    });

    return { item: newItem };
  } catch (e: any) {
    console.error('PyramidService: Error adding community item:', e);
    return {
      item: null,
      error: e?.message || 'Failed to add community item',
    };
  }
}

