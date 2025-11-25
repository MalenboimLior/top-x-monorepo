# Trivia Game - Technical & Product Documentation

## Table of Contents
1. [Product Overview](#product-overview)
2. [Game Modes](#game-modes)
3. [Core Features](#core-features)
4. [Technical Architecture](#technical-architecture)
5. [Scoring System](#scoring-system)
6. [Question Management](#question-management)
7. [Security & Answer Validation](#security--answer-validation)
8. [Daily Challenges](#daily-challenges)
9. [Power-ups System](#power-ups-system)
10. [User Interface Components](#user-interface-components)
11. [Backend API & Cloud Functions](#backend-api--cloud-functions)
12. [Data Flow & State Management](#data-flow--state-management)
13. [Configuration System](#configuration-system)
14. [Performance & Optimization](#performance--optimization)

---

## Product Overview

The TOP-X Trivia Game is an interactive quiz platform that challenges users with timed questions across various categories and difficulty levels. The game emphasizes skill, speed, and consistency through a sophisticated scoring system that rewards both accuracy and quick responses.

### Key Value Propositions
- **Competitive Gameplay**: Real-time scoring with leaderboards and percentile rankings
- **Social Features**: Challenge friends, share scores, and compete on leaderboards
- **Flexible Game Modes**: Fixed question sets or endless challenges
- **Daily Challenges**: Special themed quizzes with unique rewards
- **Secure Answer Validation**: Cryptographic hashing prevents cheating
- **Multi-language Support**: RTL/LTR support for international audiences

---

## Game Modes

### Fixed Mode
- **Description**: Predefined set of questions from a fixed pool
- **Question Source**: Questions stored in game configuration (`TriviaConfig.questions`)
- **Completion**: Game ends when all questions are answered or lives are exhausted
- **Features**:
  - Configurable total question count
  - Optional answer review after completion
  - Progress tracking (X/Y questions completed)
  - Can be configured with unlimited lives for practice mode

### Endless Mode (Planned)
- **Description**: Continuous question flow from a dynamic pool
- **Question Source**: Subcollection pool or external API (xAI hybrid mode)
- **Completion**: Game ends when lives are exhausted
- **Features**:
  - Infinite question generation
  - Hybrid mode: Falls back to xAI when pool is empty
  - Focus on streak building and survival

---

## Core Features

### 1. Lives System
- **Default**: 3 lives per game
- **Unlimited Mode**: Available in fixed mode for practice/learning
- **Life Recovery**: Every 5 correct answers in a streak restores 1 life (max lives cap)
- **Visual Indicator**: Heart icons showing remaining lives

### 2. Timer System

#### Question Timer
- **Default Duration**: 15 seconds per question
- **Configurable**: Per-question timer override
- **Behavior**:
  - Disabled in unlimited lives mode
  - Visual circular progress indicator
  - Color-coded urgency (green → orange → red)
  - Timeout results in incorrect answer

#### Global Session Timer
- **Optional**: Configurable per game
- **Purpose**: Time-limited challenge sessions
- **Display**: Progress bar showing remaining time
- **End Condition**: Game ends when timer reaches zero

### 3. Streak System
- **Definition**: Consecutive correct answers
- **Tracking**:
  - Current streak (resets on wrong answer)
  - Session best streak
  - All-time best streak (persisted)
- **Visual Feedback**: Streak counter with glow animation on increase
- **Bonus Points**: Streak multiplier affects scoring (see Scoring System)

### 4. Answer Review
- **Immediate Feedback**: Shows correct/incorrect after each answer
- **Review Period**: 2-second delay before next question
- **End Screen Review**: Optional detailed review of all questions (unlimited lives mode only)
- **Review Display**:
  - Question text and options
  - Correct answer highlighted
  - User's selected answer marked
  - Visual distinction for correct/incorrect selections

### 5. Social Features

#### Inviter System
- **Challenge Links**: Shareable URLs with inviter UID and score
- **Display**: Shows inviter's avatar, name, and score to beat
- **Motivation**: "Challenge from [Name]" or "Beat my score" messaging

#### Leaderboards
- **Top Players**: Ranked list of best scores
- **Percentile Ranking**: Shows user's position relative to all players
- **Frenemies**: Track and compete with friends
- **Daily Challenge Leaderboards**: Separate rankings for daily challenges

#### Sharing
- **Score Sharing**: Generate shareable images with percentile rank
- **Social Integration**: Share to X (Twitter) with score and challenge link
- **Custom Share Text**: Includes score, streak, and challenge URL

---

## Technical Architecture

### Frontend Stack
- **Framework**: Vue 3 with Composition API
- **State Management**: Pinia stores
- **Routing**: Vue Router
- **Styling**: CSS with CSS variables for theming
- **Build Tool**: Vite

### Backend Stack
- **Platform**: Firebase (Firestore, Cloud Functions)
- **Functions**: Firebase Functions v2 (Callable Functions)
- **Database**: Firestore (NoSQL document database)
- **Authentication**: Firebase Auth (X/Twitter OAuth)

### Project Structure
```
apps/client/src/
├── views/games/Trivia.vue          # Main game container
├── components/games/trivia/
│   ├── TriviaScene.vue             # Gameplay UI
│   ├── TriviaQuestion.vue           # Question display
│   └── TriviaEndScreen.vue         # Results screen
├── stores/trivia/
│   ├── index.ts                     # Main store (1000+ lines)
│   ├── types.ts                     # TypeScript interfaces
│   ├── utils.ts                     # Helper functions
│   └── modes/
│       ├── fixed.ts                 # Fixed mode controller
│       └── endless.ts               # Endless mode (planned)
└── services/
    ├── triviaApi.ts                 # API client
    └── trivia.ts                     # Hash utilities

functions/src/handlers/
├── getTriviaQuestions.ts            # Question fetching
├── submitGameScore/
│   └── trivia.ts                     # Score processing
└── dailyChallengeRewards.ts         # Daily challenge rewards

packages/shared/src/
├── types/trivia.ts                   # Type definitions
├── trivia/scoring.ts                 # Scoring algorithms
└── utils/triviaHash.ts               # Hash utilities
```

---

## Scoring System

### Base Scoring Formula
```
Total Score = Base Points + Streak Bonus + Speed Bonus
```

### Component Breakdown

#### 1. Base Points
- **Value**: 100 points per correct answer
- **Constant**: `TRIVIA_PER_QUESTION_BASE_POINTS = 100`
- **Application**: Awarded for every correct answer

#### 2. Streak Bonus
- **Formula**: `(Current Streak - 1) × 10`
- **Step Value**: `TRIVIA_STREAK_BONUS_STEP = 10`
- **Examples**:
  - Streak 1: 0 bonus (first correct answer)
  - Streak 2: 10 bonus
  - Streak 3: 20 bonus
  - Streak 5: 40 bonus
  - Streak 10: 90 bonus
- **Reset**: Streak resets to 0 on incorrect answer

#### 3. Speed Bonus
- **Calculation**: Based on time remaining ratio
- **Tiers**:
  ```typescript
  { minRatio: 0.75, bonus: 30 }  // 75%+ time remaining
  { minRatio: 0.50, bonus: 20 }  // 50-74% time remaining
  { minRatio: 0.25, bonus: 10 }  // 25-49% time remaining
  { minRatio: 0.00, bonus: 0 }   // <25% time remaining
  ```
- **Formula**: `timeRemaining / totalDuration`
- **Maximum**: 30 points per question
- **Disabled**: In unlimited lives mode

### Score Calculation Example
```
Question 1: Correct in 3 seconds (15s timer)
- Base: 100
- Streak: 0 (streak = 1, so (1-1)×10 = 0)
- Speed: 30 (3/15 = 0.2, but wait... 3s remaining = 12s used, so 3/15 = 0.2 → tier 0.25 = 10)
- Total: 110

Question 2: Correct in 2 seconds (15s timer, streak = 2)
- Base: 100
- Streak: 10 ((2-1)×10)
- Speed: 30 (13/15 = 0.867 → tier 0.75 = 30)
- Total: 140

Cumulative: 250 points
```

### Score Persistence
- **Best Score**: Highest score ever achieved (persisted to user profile)
- **Session Score**: Current game score (resets on new game)
- **Leaderboard**: Best scores ranked globally
- **Daily Challenge**: Separate scoring for daily challenges

---

## Question Management

### Question Structure
```typescript
interface TriviaQuestion {
  id: string;                    // Unique identifier
  text: string;                  // Question prompt
  answers: TriviaAnswer[];       // Array of answer options
  correctAnswer?: string;        // Correct answer text (admin only)
  hash?: string;                 // HMAC-SHA256 hash of correct answer
  salt?: string;                 // Unique salt per question
  imageUrl?: string;             // Optional question image
  category?: string;             // Question category
  difficulty?: TriviaDifficulty; // Difficulty level
  timerSeconds?: number;         // Per-question timer override
}

interface TriviaAnswer {
  text: string;                  // Answer text
  imageUrl?: string;             // Optional answer image
}
```

### Question Fetching Flow

1. **Initial Load**:
   - Client calls `getTriviaQuestions` Cloud Function
   - Function fetches game config from Firestore
   - Returns sanitized questions (without `correctAnswer`)
   - Includes config metadata if requested

2. **Batch Loading**:
   - Questions loaded in batches (default: 3)
   - Excludes already-answered question IDs
   - Tracks total available questions
   - Supports pagination (`hasMore` flag)

3. **Question Queue**:
   - Questions shuffled before display
   - Queue managed in-memory (Pinia store)
   - Auto-fetches more when queue is low
   - Prevents duplicate questions in same session

4. **Answer Options Shuffling**:
   - Options shuffled per question display
   - Correct answer index recalculated after shuffle
   - Maintains hash validation regardless of position

### Question Sources

#### Fixed Mode
- **Primary**: `TriviaConfig.questions` array in game document
- **Fallback**: Default question if none available
- **Validation**: Server validates question existence

#### Endless Mode (Planned)
- **Primary**: `games/{gameId}/questions` subcollection
- **Fallback**: Global `questions` collection
- **Hybrid**: xAI API when pool is empty (if `isHybrid: true`)

---

## Security & Answer Validation

### Cryptographic Hashing

#### Purpose
- Prevent client-side answer discovery
- Secure answer validation
- Prevent cheating and manipulation

#### Implementation
- **Algorithm**: HMAC-SHA256
- **Secret Key**: `VITE_TRIVIA_HASH_SECRET` (environment variable)
- **Payload Format**: `{questionId}|{answerText}|{salt}`
- **Hash Format**: 64-character hexadecimal string

#### Hash Generation
```typescript
// Client-side (for answer submission)
const hash = await hashAnswer(questionId, answerText, salt);

// Server-side (for validation)
const correctHash = computeHMAC(questionId, correctAnswer, salt);
const isValid = submittedHash === correctHash;
```

#### Salt System
- **Purpose**: Prevent rainbow table attacks
- **Generation**: 16-byte random hex string per question
- **Storage**: Stored with question in database
- **Uniqueness**: Each question has unique salt

### Answer Validation Flow

1. **Client Submission**:
   - User selects answer option
   - Client computes hash: `HMAC(questionId|answerText|salt)`
   - Hash sent to server in submission payload

2. **Server Validation**:
   - Server retrieves correct hash from question document
   - Compares submitted hash with correct hash
   - Updates statistics (answer counts, accuracy)
   - Returns validation result

3. **Hash Storage Locations**:
   - Game config: `questions[].hash`
   - Subcollection: `games/{gameId}/questions/{qId}.hash`
   - Global collection: `questions/{qId}.hash`
   - Multiple hash formats supported for backward compatibility

### Security Features
- **No Answer Exposure**: Correct answer never sent to client
- **Hash Normalization**: Handles various hash storage formats
- **Validation**: Server-side validation prevents tampering
- **Statistics**: Tracks answer distribution for analytics

---

## Daily Challenges

### Overview
Daily challenges are special trivia sessions with unique configurations, themes, and rewards.

### Configuration
- **Storage**: `games/{gameId}/daily_challenges/{challengeId}`
- **Structure**: `DailyChallenge` document with `custom: TriviaConfig`
- **Override**: Daily challenge config overrides base game config
- **URL Parameter**: `?challenge={challengeId}`

### Features
- **Custom Questions**: Unique question sets per challenge
- **Custom Themes**: Special visual themes
- **Time Windows**: Challenges available for limited time
- **Rewards**: Separate leaderboard and reward system
- **Attempt Tracking**: Tracks attempts before/after reveal
- **Status Indicators**: Visual status for challenge participation

### Reward System
- **Solve State**: `solved` (correct before close) or `attempted`
- **Leaderboard Impact**: 
  - Solved: +1 to leaderboard score
  - Attempted: +1 to leaderboard streak
- **Claiming**: Users claim rewards after challenge closes
- **Tracking**: Reward records in `users/{uid}/daily_challenge_rewards`

### Daily Challenge Flow
1. User accesses challenge via URL parameter
2. Client loads challenge config from Firestore
3. Config override applied to trivia store
4. Game plays with challenge-specific settings
5. Score submission includes `dailyChallengeId`
6. Server processes as daily challenge submission
7. Reward record created if qualified
8. User can claim rewards after challenge closes

---

## Power-ups System

### Overview
Power-ups are special abilities that can be activated during gameplay (currently in configuration phase, full implementation pending).

### Configuration
```typescript
interface TriviaPowerUpRule {
  id: string;                    // Unique identifier
  label: string;                  // Display name
  spawnRate?: number;            // Probability (0-1)
  maxUses?: number;               // Maximum uses per session
  cooldownSeconds?: number;       // Cooldown between uses
  description?: string;           // User-facing description
}
```

### Power-up State
```typescript
interface PowerUpState extends TriviaPowerUpRule {
  availableAt: number;            // Timestamp when available
  uses: number;                   // Current use count
  onCooldownUntil?: number;      // Cooldown expiration
}
```

### Spawning Logic
- **Trigger**: Spawned after correct answers (if enabled)
- **Probability**: Based on `spawnRate` (if configured)
- **Availability**: Only spawns if not already active
- **Display**: Shown in power-ups section of HUD

### Planned Power-up Types
- **50/50**: Remove two incorrect answers
- **Extra Time**: Add time to question timer
- **Skip Question**: Skip current question without penalty
- **Hint**: Show hint for current question
- **Double Points**: Double points for next correct answer

### Current Status
- Configuration system implemented
- UI display ready
- Activation logic pending implementation

---

## User Interface Components

### TriviaScene Component
**Purpose**: Main gameplay interface

**Features**:
- Start screen with stats and inviter info
- Gameplay HUD with score, streak, lives
- Question display area
- Timer visualization (circular progress)
- Progress bar (question X/Y)
- Global timer display
- Power-ups section
- Bonus point animations

**Key Props**:
- `screen`: 'start' | 'playing'
- `mode`: 'fixed' | 'endless'
- `score`, `streak`, `lives`
- `currentQuestion`
- `timeLeft`, `globalTimeLeft`
- `powerUps`

### TriviaQuestion Component
**Purpose**: Display individual question and answer options

**Features**:
- Question text with optional image
- Multiple choice options (A, B, C, D)
- Option images support
- Visual feedback (selected, correct, incorrect)
- Disabled state after answer selection
- RTL/LTR support

**Answer States**:
- Default: Normal styling
- Selected: Highlighted border
- Correct: Green border/background
- Incorrect: Red border/background

### TriviaEndScreen Component
**Purpose**: Post-game results and statistics

**Features**:
- Score summary (current vs best)
- Streak summary (session vs all-time)
- Accuracy percentage
- Percentile rank display
- Leaderboard integration
- Answer review section (if enabled)
- Share functionality
- Play again button
- Login prompt (if not authenticated)

**Answer Review Display**:
- List of all questions
- User's selected answers
- Correct answers highlighted
- Visual distinction for correct/incorrect/missed

### Styling System
- **CSS Variables**: Theme colors via `--trivia-primary`, `--trivia-secondary`
- **Responsive Design**: Mobile-first with breakpoints
- **Animations**: Fade transitions, bonus pop-ups, streak glow
- **Theming**: Customizable via `TriviaThemeConfig`

---

## Backend API & Cloud Functions

### getTriviaQuestions

**Purpose**: Fetch trivia questions for a game

**Request**:
```typescript
{
  gameId: string;
  excludeIds?: string[];
  limit?: number;
  includeConfig?: boolean;
}
```

**Response**:
```typescript
{
  questions: TriviaQuestionPayload[];  // Sanitized (no correctAnswer)
  totalQuestions: number;
  remainingQuestions: number;
  hasMore: boolean;
  config?: TriviaConfigPayload;        // If includeConfig=true
}
```

**Logic**:
1. Validates `gameId` exists
2. Fetches game document from Firestore
3. Extracts `TriviaConfig` from `game.custom`
4. Filters questions (excludes provided IDs)
5. Sanitizes questions (removes `correctAnswer`)
6. Returns batch with pagination info

**Security**:
- Never returns `correctAnswer` to client
- Only returns `hash` for validation
- Validates game existence

### submitGameScore (Trivia Handler)

**Purpose**: Process trivia game score submission

**Request**:
```typescript
{
  gameData: {
    score: number;
    streak: number;
    custom: {
      trivia: {
        mode: 'fixed';
        attempts: TriviaAttemptSubmission[];
        questionIds: string[];
        attemptCount: number;
        bestStreak?: number;
        currentStreak?: number;
      }
    }
  }
}
```

**Processing Flow**:
1. Extracts trivia submission from `custom.trivia`
2. Validates submission format
3. Fetches question documents (subcollection → global → config)
4. Collects correct hashes from questions
5. Validates each attempt hash against correct hash
6. Calculates score breakdown (base + streak + speed)
7. Updates question statistics (answer counts, accuracy)
8. Updates user game data
9. Updates leaderboards
10. Returns processing metrics

**Score Calculation**:
- Server recalculates score from attempts
- Validates client-reported speed bonuses
- Computes streak from attempt sequence
- Updates best scores/streaks

**Question Statistics**:
- Tracks answer distribution (`answerCounts`)
- Updates `stats.totalAttempts`
- Updates `stats.correctAttempts`
- Records `lastAnsweredAt` timestamp

### dailyChallengeRewards

**Purpose**: Claim rewards from daily challenges

**Logic**:
- Fetches user's reward records
- Filters qualified rewards (not claimed, challenge closed)
- Updates leaderboard scores/streaks
- Marks rewards as claimed
- Returns claim summary

---

## Data Flow & State Management

### Pinia Store Architecture

**Store Name**: `trivia`

**State Structure**:
```typescript
{
  // Screen state
  currentScreen: 'start' | 'playing' | 'gameover'
  
  // Game configuration
  activeGameId: string
  baseConfig: TriviaConfig | null
  overrideConfig: TriviaConfig | null
  configLoaded: boolean
  
  // Question state
  currentQuestion: TriviaQuestionViewModel | null
  questionQueue: TriviaQuestionViewModel[]
  allQuestions: TriviaQuestion[]
  answeredQuestionIds: string[]
  questionOrder: string[]
  
  // Gameplay state
  selectedAnswer: number | null
  isCorrect: boolean | null
  correctAnswerIndex: number | null
  isReviewingAnswer: boolean
  
  // Scoring state
  score: number
  streak: number
  sessionBestStreak: number
  bestScore: number
  bestStreak: number
  speedBonusTotal: number
  lastSpeedBonus: number
  lastStreakBonus: number
  
  // Lives & timers
  lives: number
  questionTimerDuration: number
  questionTimeLeft: number
  globalTimeLeft: number | null
  
  // Attempts & review
  attempts: TriviaAttemptPayload[]
  correctAttempts: number
  answerReview: TriviaAnswerReview[]
  
  // Power-ups
  powerUps: PowerUpState[]
  
  // Social
  inviter: InviterSnapshot | null
  leaderboard: TriviaLeaderboardEntry[]
  
  // Loading states
  isLoading: boolean
  isFetchingQuestions: boolean
}
```

### Key Actions

#### startGame()
1. Resets game state
2. Ensures config loaded
3. Sets screen to 'playing'
4. Starts global timer
5. Prepares first question

#### answerQuestion(index)
1. Validates question exists and not already answered
2. Stops question timer
3. Records attempt with hash
4. Validates answer (hash comparison)
5. Applies scoring (correct/incorrect)
6. Updates streak
7. Adds to answer review
8. Waits review delay (2s)
9. Checks end conditions (lives, questions)
10. Prepares next question or ends game

#### prepareNextQuestion()
1. Checks question queue
2. Fetches more questions if needed
3. Shuffles options
4. Determines correct answer index
5. Starts question timer
6. Updates question order

#### endGame()
1. Stops all timers
2. Sets screen to 'gameover'
3. Submits results to server
4. Updates local profile

### Data Flow Diagram

```
User Action
    ↓
Trivia.vue (View)
    ↓
triviaStore (Pinia)
    ↓
answerQuestion() → hashAnswer() → recordAttempt()
    ↓
Server Validation (submitGameScore)
    ↓
Firestore Updates
    ├── User game data
    ├── Question statistics
    └── Leaderboards
    ↓
Response → Store Update
    ↓
UI Update (Reactive)
```

---

## Configuration System

### TriviaConfig Interface
```typescript
interface TriviaConfig {
  mode: 'fixed' | 'endless';
  questions: TriviaQuestion[];
  correctAnswers?: Record<string, string>;  // Admin only
  language?: string;                        // BCP 47 tag
  powerUpsActive?: boolean;
  powerUps?: TriviaPowerUpRule[];
  theme?: TriviaThemeConfig;
  showCorrectAnswers?: boolean;            // Per-question reveal
  showCorrectAnswersOnEnd?: boolean;       // End screen review
  solveThreshold?: number;                 // 0-1 ratio for "solved"
  mustLogin?: boolean;
  allowRepeats?: boolean;
  unlimitedLives?: boolean;                 // Fixed mode only
  lives?: number;                          // Default: 3
  globalTimer?: TriviaGlobalTimerConfig;
  questionBatchSize?: number;              // Questions per fetch
  isHybrid?: boolean;                      // Endless: xAI fallback
}
```

### Theme Configuration
```typescript
interface TriviaThemeConfig {
  primaryColor?: string;           // Main accent color
  secondaryColor?: string;         // Secondary accent
  backgroundColor?: string;      // Background color
  backgroundImageUrl?: string;     // Static background image
  backgroundVideoUrl?: string;     // Animated background video
  backgroundOverlayColor?: string; // Overlay opacity/color
}
```

### Configuration Loading
1. **Base Config**: Loaded from `games/{gameId}` document
2. **Override Config**: Daily challenge or custom override
3. **Active Config**: `overrideConfig ?? baseConfig`
4. **Defaults**: Applied when config missing

### Configuration Override
- **Daily Challenges**: `applyConfigOverride(challengeConfig)`
- **Custom Games**: URL parameter `?game={gameId}`
- **Reset**: Override cleared on game reset

---

## Performance & Optimization

### Question Loading Strategy
- **Lazy Loading**: Questions fetched in batches
- **Queue Management**: Pre-loads next batch when queue low
- **Deduplication**: Tracks answered IDs to prevent repeats
- **Caching**: Questions cached in store during session

### Timer Optimization
- **Single Interval**: One interval per timer type
- **Cleanup**: Timers cleared on component unmount
- **Pause/Resume**: Not implemented (always running)

### State Management
- **Reactive Updates**: Vue reactivity for UI updates
- **Computed Properties**: Derived state computed efficiently
- **Watch Optimization**: Watchers with immediate flags where needed

### Network Optimization
- **Batch Requests**: Multiple questions per API call
- **Exclude IDs**: Prevents fetching already-answered questions
- **Config Caching**: Config loaded once per game session

### Rendering Optimization
- **Conditional Rendering**: Components render only when needed
- **Transition Groups**: Smooth transitions between screens
- **Image Lazy Loading**: Images load on demand

### Security Considerations
- **Hash Validation**: Server-side validation prevents cheating
- **Rate Limiting**: Firebase Functions rate limiting
- **Input Sanitization**: All inputs validated and sanitized

---

## Future Enhancements

### Planned Features
1. **Endless Mode**: Full implementation with pool management
2. **Power-up Activation**: Complete power-up system
3. **Question Categories**: Filter by category
4. **Difficulty Progression**: Adaptive difficulty
5. **Multiplayer**: Real-time multiplayer trivia
6. **Tournaments**: Scheduled trivia tournaments
7. **Achievements**: Badge and achievement system
8. **Question Editor**: User-generated questions (moderated)

### Technical Improvements
1. **Offline Support**: Service worker for offline play
2. **Analytics**: Enhanced analytics and tracking
3. **A/B Testing**: Feature flag system
4. **Performance Monitoring**: Real-time performance tracking
5. **Error Recovery**: Better error handling and recovery

---

## API Reference

### Client-Side Services

#### fetchTriviaQuestions(params)
```typescript
async function fetchTriviaQuestions(
  params: FetchTriviaQuestionsRequest
): Promise<FetchTriviaQuestionsResponse>
```

#### hashAnswer(questionId, answerText, salt)
```typescript
async function hashAnswer(
  questionId: string,
  answerText: string,
  salt?: string
): Promise<string>
```

### Server-Side Functions

#### getTriviaQuestions (Callable)
- **Location**: `functions/src/handlers/getTriviaQuestions.ts`
- **Authentication**: Optional (public)
- **Rate Limit**: Firebase default

#### submitGameScore (Callable)
- **Location**: `functions/src/handlers/submitGameScore.ts`
- **Authentication**: Required
- **Trivia Handler**: `functions/src/handlers/submitGameScore/trivia.ts`

---

## Testing Considerations

### Unit Tests
- Scoring calculations
- Hash generation/validation
- Question normalization
- Timer logic

### Integration Tests
- API endpoints
- Firestore operations
- Authentication flows

### E2E Tests
- Complete game flow
- Score submission
- Leaderboard updates
- Daily challenge flow

---

## Deployment

### Environment Variables
- `VITE_TRIVIA_HASH_SECRET`: HMAC secret key (required)
- Firebase config: Auto-configured via Firebase SDK

### Build Process
1. Client: `npm run build` in `apps/client`
2. Functions: `npm run build` in `functions`
3. Deploy: `firebase deploy`

### Database Indexes
- Required indexes defined in `firestore.indexes.json`
- Question queries indexed for performance

---

## Troubleshooting

### Common Issues

1. **Questions not loading**
   - Check game document exists
   - Verify `TriviaConfig` in `game.custom`
   - Check `getTriviaQuestions` function logs

2. **Score not submitting**
   - Verify user authentication
   - Check `submitGameScore` function logs
   - Validate attempt hash format

3. **Hash validation failing**
   - Verify `VITE_TRIVIA_HASH_SECRET` matches server
   - Check salt is included in hash calculation
   - Validate hash format (64-char hex)

4. **Timer not working**
   - Check `unlimitedLives` config
   - Verify timer intervals are cleared properly
   - Check browser console for errors

---

## Conclusion

The TOP-X Trivia Game is a sophisticated, feature-rich quiz platform with robust security, flexible configuration, and engaging gameplay mechanics. The architecture supports both fixed and endless game modes, with extensive customization options and social features.

The system prioritizes security through cryptographic answer validation, performance through optimized question loading, and user experience through responsive design and smooth animations.

For questions or contributions, refer to the codebase or contact the development team.

---

**Last Updated**: 2024
**Version**: 1.0
**Maintainer**: TOP-X Development Team

