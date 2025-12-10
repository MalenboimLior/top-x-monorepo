# Leaderboard System Overview

## Architecture

The leaderboard system uses a **dual-storage approach**:
- **Leaderboard entries**: Full analytics data for game creators
- **User documents**: Minimal data for profile display

This separation optimizes performance and keeps user documents small.

---

## Data Flow

### 1. Score Submission

**Endpoint**: `submitGameScore` Cloud Function

**Process**:
1. Client sends game result with `score`, `streak`, and `custom` data
2. Server validates and processes game-specific logic (trivia, quiz, etc.)
3. **Data separation** splits custom data into:
   - `leaderboardCustomData`: Full analytics (question IDs, answer hashes, etc.)
   - `userCustomData`: Minimal profile data (score, streak, rank, percentile, leaderboardRank, leaderboardTotalUsers) and some needed cutom data
4. Transaction saves:
   - User document: Minimal custom data + score/streak at top level
   - Leaderboard entry: Full analytics + user display info (name, photo, etc.)
5. After transaction: Computes rank/percentile and updates user document

**Key Files**:
- `functions/src/handlers/submitGameScore.ts` - Main submission handler
- `functions/src/handlers/submitGameScore/dataSeparation.ts` - Data separation logic

---

## Data Storage

### Leaderboard Entries

**Path**: `games/{gameId}/leaderboard/{uid}`

**Contains**:
- Score data: `score`, `streak`
- Custom analytics: Full game-specific data (question IDs, answers, etc.)
- Timestamps: `updatedAt`, date indexes for filtering

**Purpose**: Display leaderboard + provide analytics to game creators

### User Documents

**Path**: `users/{uid}/games/{gameTypeId}/{gameId}`

**Contains**:
- Top-level: `score`, `streak`, `lastPlayed`,  leaderboardRank, leaderboardTotalUsers, percentile,
- Custom: Minimal game-specific data 

**Purpose**: Profile display + game state restoration

---

## Game Type Data Structures

### Trivia

**Leaderboard Custom**:
```typescript
{
  trivia: {
    questionIds: string[];         // All question IDs answered
    answerHashes: string[];        // Hashed answers (SHA256) for analytics
    mode: 'classic' | 'speed';     // Game mode (matches TriviaConfig.mode)
    attemptCount: number;          // Total attempts
    correctCount: number;          // Number of correct answers
    accuracy: number;              // Percentage (0-1)
    score: number;                 // Final computed score
    streak: number;                // Best streak achieved
    lastQuestionIds?: string[];    // Question IDs from last session
    lastAccuracy?: number;         // Accuracy from last session
  }
}
```

**User Custom**:
```typescript
{
  trivia: {
    score: number;                 // Best score
    streak: number;                // Best streak
    leaderboardRank?: number;      // Current rank (computed after submission)
    leaderboardTotalUsers?: number;// Total users in leaderboard
    percentile?: number;           // Percentile rank (0 = best)
    lastPlayed: number;            // Timestamp of last play
  }
}
```

### Quiz (Personality/Archetype)

> **Note**: Quiz games do NOT save to leaderboard entries. They only save to user documents.
> Quiz results are stored for profile display, not competition ranking.

**User Custom** (stored in user document only):
```typescript
{
  quiz: {
    result: {
      id: string;           // bucketId (personality) or id (archetype)
      title: string;        // e.g., "You are a Lion"
      image?: string;       // Result image URL for profile display
    };
    mode: 'personality' | 'archetype';
  }
}
```

**Full submission data** (also stored in user document for reference):
```typescript
{
  personalityResult?: {       // For personality mode
    bucketId: string;
    title: string;
  };
  archetypeResult?: {         // For archetype mode
    id: string;
    title: string;
    pattern: Record<string, 'low' | 'high'>;
  };
  selectedAnswers: Record<string, number>;  // questionId -> answerIndex
}
```

### PyramidTier

**Leaderboard Custom**:
```typescript
{
  pyramid: Array<{ tier: number; slots: string[] }>;
  worstItem: { id: string };
}
```

**User Custom**:
```typescript
{
  pyramid: Array<{ tier: number; slots: string[] }>;
  worstItem: { id: string };
  score: number;
  leaderboardRank?: number; //we don't use it in PyramidTier
  leaderboardTotalUsers?: number; //we don't use it in PyramidTier
  percentile?: number;
}
```

### ZoneReveal, Pacman, FisherGame

Similar pattern: Full analytics in leaderboard, minimal data in user document.

---

## Ranking System

### Rank Computation

**Function**: `computeLeaderboardRank(gameId, uid, score, streak)`

**Performance**: Uses Firestore count aggregations - **3 reads total** regardless of leaderboard size

**Process**:
1. Count total entries (1 read)
2. Count entries with better scores: `score > userScore` (1 read)
3. Count entries with same score but better streak: `score == userScore AND streak > userStreak` (1 read)
4. Rank = better scores + same score better streak + 1
5. Percentile = `(rank - 1) / totalEntries * 100`

**Returns**:
```typescript
{
  rank: number;           // Position (1 = best)
  percentile: number;     // 0-100 (0 = best)
  totalUsers: number;     // Total users in leaderboard
}
```

**Key File**: `functions/src/utils/leaderboardRanking.ts`

---

## Leaderboard Types

### 1. Top Leaderboard
- Shows top N players globally
- Ordered by: `score DESC, streak DESC`
- Supports date filtering: daily, weekly, monthly, all-time

### 2. Around Leaderboard
- Shows user's rank ± N players
- Same ordering as Top
- Supports date filtering

### 3. VIP Leaderboard
- Shows users with `followersCount >= 0` (all users)
- Ordered by: `score DESC, streak DESC`
- Includes current user if not already present

### 4. Following Leaderboard
- Shows users the current user follows
- Ordered by: `score DESC, streak DESC`
- Includes current user if not already present

### 5. Daily Challenge Leaderboard
- Separate leaderboard per challenge
- Path: `games/{gameId}/daily_challenges/{challengeId}/leaderboard/{uid}`
- Same structure as regular leaderboard

---

## Client-Side Implementation

### Fetching Leaderboards

**Service**: `apps/client/src/services/leaderboard.ts`

**Functions**:
- `getTopLeaderboard(gameId, limit, dateRange)` - Top N players
- `getAroundLeaderboard(gameId, uid, windowSize, dateRange)` - Around user
- `getVipLeaderboard(gameId, limit)` - VIP players
- `getFriendsLeaderboard(gameId, limit)` - Following users
- `getUserPercentile(gameId, uid, score, streak, dateRange)` - User's percentile

**Performance Optimizations**:
- Uses Firestore count aggregations for percentile (3 reads)
- Batch fetches game names (up to 10 per query)
- Lazy loads leaderboards only when tab is active
- Caches game data to minimize reads

### Display Components

**Main Component**: `apps/client/src/components/Leaderboard.vue`
- Tab-based UI (Top, Around, VIP, Following)
- Date range filtering (Daily, Weekly, Monthly, All-time)
- Lazy loading and caching
- Always LTR and English regardless of locale

**Entry Component**: `apps/client/src/components/LeaderboardEntry.vue`
- Displays rank, avatar, name, score, streak
- Follow/unfollow buttons
- "Following" badge for already-followed users

**Percentile Component**: `apps/client/src/components/PercentileRank.vue`
- Shows user's percentile rank
- Displays best score (not last score)
- Auto-fetches data when needed

---

## Key Concepts

### Data Separation Philosophy

**Leaderboard entries** = Display + Analytics
- Everything needed to show leaderboard
- Full analytics for game creators
- Denormalized user data (name, photo) for performance

**User documents** = Profile + State
- Minimal data for profile page
- Game state restoration (pyramid structure, etc.)
- Rank/percentile for quick display

### Ranking Rules

1. **Primary sort**: Score descending
2. **Tiebreaker**: Streak descending
3. **Rank calculation**: Count better entries + 1
4. **Percentile**: `(rank - 1) / total * 100`

### Performance

- **Rank computation**: 3 reads (count aggregations)
- **Leaderboard fetch**: N reads (one per entry fetched)
- **Game name fetch**: Batch queries (10 per query)
- **Lazy loading**: Data fetched only when needed

---

## File Structure

### Backend (Cloud Functions)
```
functions/src/
├── handlers/
│   └── submitGameScore/
│       ├── submitGameScore.ts          # Main handler
│       ├── dataSeparation.ts           # Data separation logic
│       ├── trivia.ts                   # Trivia processing
│       ├── quiz.ts                     # Quiz processing
│       └── ...
└── utils/
    ├── leaderboardRanking.ts           # Rank/percentile computation
    └── leaderboardHelpers.ts           # Helper functions
```

### Frontend (Client)
```
apps/client/src/
├── services/
│   └── leaderboard.ts                  # Leaderboard fetching
├── components/
│   ├── Leaderboard.vue                 # Main leaderboard UI
│   ├── LeaderboardEntry.vue           # Entry row component
│   ├── LeaderboardPreview.vue         # Preview component
│   └── PercentileRank.vue              # Percentile display
└── views/
    └── games/
        └── trivia/
            ├── TriviaScene.vue         # Start screen
            └── TriviaEndScreen.vue     # End screen with leaderboard
```

### Shared Types
```
packages/shared/src/types/
├── leaderboard.ts                      # LeaderboardEntry type
├── leaderboardCustom.ts                # Leaderboard custom data types
├── userGameCustom.ts                   # User custom data types
└── user.ts                             # User, UserGameData types
```

---

## Example Flow

### User Plays Trivia Game

1. **Client**: User answers questions, calculates score
2. **Client**: Calls `submitGameScore` with:
   ```typescript
   {
     gameTypeId: 'Trivia',
     gameId: 'game123',
     gameData: {
       score: 520,
       streak: 2,
       custom: { /* full trivia data */ }
     }
   }
   ```
3. **Server**: Processes trivia submission
4. **Server**: Separates data:
   - Leaderboard: relevent data
   - User: Minimal data (score, streak)
5. **Server**: Saves to:
   - `games/game123/leaderboard/{uid}` -  relevent data
   - `users/{uid}/games/Trivia/game123` - Minimal data
6. **Server**: Computes rank/percentile (3 reads)
7. **Server**: Updates user document with rank/percentile/totalUsers
8. **Client**: Fetches leaderboard to display
9. **Client**: Shows user's position: "Rank 5 of 100 users"

---

## Important Notes

- **No backward compatibility**: Old data structure is not supported
- **Minimal user data**: User documents only contain what's needed for profile
- **Full analytics in leaderboard**: Game creators can analyze all player data
- **Performance optimized**: Count aggregations, batch queries, lazy loading
- **Always LTR**: Leaderboard UI is always left-to-right and English

