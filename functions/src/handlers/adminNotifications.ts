// Admin Email Notifications
// Sends email notifications to admins for specific events using Firebase Trigger Email extension

import * as functions from 'firebase-functions/v2';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Get admin email from environment variables, Firebase Functions config, or Firestore config document
 */
async function getAdminEmail(): Promise<string> {
  // Try environment variable first (works with both v1 and v2 functions)
  const envEmail = process.env.ADMIN_EMAIL;
  if (envEmail) {
    return envEmail;
  }

  // Note: In v2 functions, use environment variables instead of functions.config()
  // For v1 compatibility, you can still use functions.config() if needed

  // Fallback to Firestore config document
  try {
    const configDoc = await db.collection('config').doc('admin').get();
    const email = configDoc.data()?.email;
    if (email) {
      return email;
    }
  } catch (error) {
    console.error('Error fetching admin email from Firestore:', error);
  }

  // Default fallback (should be configured before deployment)
  console.warn('Using default admin email. Please configure ADMIN_EMAIL environment variable or Firestore config/admin.email');
  return 'admin@top-x.co';
}

/**
 * Create email document in mail collection to trigger email sending
 */
async function createEmailDocument(emailData: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  try {
    const adminEmail = await getAdminEmail();
    const recipients = Array.isArray(emailData.to) ? emailData.to : [emailData.to];
    
    await db.collection('mail').add({
      to: recipients.length === 1 ? recipients[0] : recipients,
      message: {
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text || emailData.html.replace(/<[^>]*>/g, ''), // Strip HTML for plaintext fallback
      },
    });

    console.log('Email document created successfully:', emailData.subject);
  } catch (error) {
    console.error('Error creating email document:', error);
    // Don't throw - email failures shouldn't break the main flow
  }
}

/**
 * Format HTML email template for new game notification
 */
function formatNewGameEmail(gameData: admin.firestore.DocumentData): string {
  const gameName = gameData.name || 'Unnamed Game';
  const creatorName = gameData.creator?.username || gameData.creator?.displayName || 'Unknown';
  const gameTypeId = gameData.gameTypeId || 'unknown';
  const isCommunity = gameData.community || false;
  const gameId = gameData.id || 'unknown';
  const gameUrl = `https://admin.top-x.co/games/${gameId}`;
  const gamePageUrl = `https://top-x.co/games/info?game=${gameId}`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .button { display: inline-block; padding: 10px 20px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
          .info-row { margin: 10px 0; }
          .label { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎮 New Game Created</h1>
          </div>
          <div class="content">
            <h2>${gameName}</h2>
            <div class="info-row">
              <span class="label">Creator:</span> ${creatorName}
            </div>
            <div class="info-row">
              <span class="label">Type:</span> ${gameTypeId}
            </div>
            <div class="info-row">
              <span class="label">Category:</span> ${isCommunity ? 'Community' : 'Official'}
            </div>
            ${gameData.description ? `<div class="info-row"><span class="label">Description:</span> ${gameData.description}</div>` : ''}
            <div style="margin-top: 20px;">
              <a href="${gameUrl}" class="button">View in Admin Panel</a>
              <a href="${gamePageUrl}" class="button">View Game Page</a>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Format HTML email template for session milestone notification
 */
function formatSessionMilestoneEmail(gameData: admin.firestore.DocumentData, milestone: number, sessions: number): string {
  const gameName = gameData.name || 'Unnamed Game';
  const gameId = gameData.id || 'unknown';
  const gameUrl = `https://admin.top-x.co/games/${gameId}`;
  const gamePageUrl = `https://top-x.co/games/info?game=${gameId}`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #FF9800; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .milestone { font-size: 48px; font-weight: bold; color: #FF9800; text-align: center; margin: 20px 0; }
          .button { display: inline-block; padding: 10px 20px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
          .info-row { margin: 10px 0; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏆 Game Milestone Reached!</h1>
          </div>
          <div class="content">
            <h2>${gameName}</h2>
            <div class="milestone">${milestone} Sessions</div>
            <div class="info-row">
              <strong>Current Total:</strong> ${sessions} sessions played
            </div>
            <div style="margin-top: 20px; text-align: center;">
              <a href="${gameUrl}" class="button">View in Admin Panel</a>
              <a href="${gamePageUrl}" class="button">View Game Page</a>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Format HTML email template for new high-profile user notification
 */
function formatNewUserEmail(userData: admin.firestore.DocumentData): string {
  const username = userData.username || 'Unknown';
  const displayName = userData.displayName || 'Unknown';
  const followersCount = userData.followersCount || 0;
  const photoURL = userData.photoURL || '';
  const userId = userData.uid || 'unknown';
  const userUrl = `https://admin.top-x.co/users/${userId}`;
  const profileUrl = `https://top-x.co/profile?user=${userId}`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #9C27B0; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .user-profile { display: flex; align-items: center; margin: 20px 0; }
          .user-avatar { width: 64px; height: 64px; border-radius: 50%; margin-right: 15px; }
          .user-info { flex: 1; }
          .followers { font-size: 24px; font-weight: bold; color: #9C27B0; margin: 10px 0; }
          .button { display: inline-block; padding: 10px 20px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⭐ New High-Profile User</h1>
          </div>
          <div class="content">
            <div class="user-profile">
              ${photoURL ? `<img src="${photoURL}" alt="${displayName}" class="user-avatar">` : ''}
              <div class="user-info">
                <h2>${displayName}</h2>
                <p>@${username}</p>
                <div class="followers">👥 ${followersCount.toLocaleString()} followers</div>
              </div>
            </div>
            <div style="margin-top: 20px; text-align: center;">
              <a href="${userUrl}" class="button">View in Admin Panel</a>
              <a href="${profileUrl}" class="button">View Profile</a>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Send email notification when a new game is created
 */
export const notifyNewGame = onDocumentCreated(
  {
    document: 'games/{gameId}',
  },
  async (event) => {
    if (!event.data) {
      console.error('No data in onCreate event');
      return;
    }
    
    const gameData = event.data.data();
    const gameId = event.params.gameId;

    console.log('New game created:', gameId, gameData.name);

    try {
      // Add game ID to the data for URL generation
      const gameDataWithId = { ...gameData, id: gameId };

      await createEmailDocument({
        to: await getAdminEmail(),
        subject: `New Game Created: ${gameData.name || 'Unnamed Game'}`,
        html: formatNewGameEmail(gameDataWithId),
      });
    } catch (error) {
      console.error('Error sending new game notification:', error);
      // Don't throw - email failures shouldn't break game creation
    }
  });

/**
 * Send email notification when a new user with 5000+ followers is created
 */
export const notifyNewHighProfileUser = onDocumentCreated(
  {
    document: 'users/{userId}',
  },
  async (event) => {
    if (!event.data) {
      console.error('No data in onCreate event');
      return;
    }
    
    const userData = event.data.data();
    const userId = event.params.userId;

    const followersCount = userData.followersCount || 0;

    // Only send notification if user has 5000+ followers
    if (followersCount < 5000) {
      console.log('User created with less than 5000 followers, skipping notification:', userId);
      return;
    }

    console.log('New high-profile user created:', userId, followersCount, 'followers');

    try {
      await createEmailDocument({
        to: await getAdminEmail(),
        subject: `New High-Profile User: ${userData.username || 'Unknown'} (${followersCount.toLocaleString()} followers)`,
        html: formatNewUserEmail(userData),
      });
    } catch (error) {
      console.error('Error sending new user notification:', error);
      // Don't throw - email failures shouldn't break user creation
    }
  });

/**
 * Send email notification for session milestones (100 or 1000 sessions)
 * Called from submitGameScore function after transaction completes
 */
export async function sendSessionMilestoneEmail(
  gameId: string,
  gameName: string,
  milestone: number,
  currentSessions: number
): Promise<void> {
  console.log(`Session milestone reached: ${gameId} - ${milestone} sessions (current: ${currentSessions})`);

  try {
    // Fetch game data for email template
    const gameDoc = await db.collection('games').doc(gameId).get();
    if (!gameDoc.exists) {
      console.error('Game not found for milestone email:', gameId);
      return;
    }

    const gameData = { ...gameDoc.data(), id: gameId };

    await createEmailDocument({
      to: await getAdminEmail(),
      subject: `Game Milestone: ${gameName} reached ${milestone} sessions`,
      html: formatSessionMilestoneEmail(gameData, milestone, currentSessions),
    });
  } catch (error) {
    console.error('Error sending session milestone notification:', error);
    // Don't throw - email failures shouldn't break score submission
  }
}

