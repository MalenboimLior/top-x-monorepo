# Game Config Upload Script

A CLI tool to upload game configurations from JSON files to Firebase Firestore. This script allows you to quickly create and update quiz, trivia, and other game types without using the admin panel.

## Prerequisites

1. **Service Account Key**: Ensure `serviceAccountKey.json` exists in the project root or `apps/client/` directory.

2. **Node.js**: The script uses ES modules and requires Node.js 16+.

## Usage

### Basic Upload

Upload a game configuration from a JSON file:

```bash
node scripts/uploadGameConfig.js ./test-data/personality-quiz.json
```

### Override Game ID

Use a custom game ID instead of the one in the JSON file:

```bash
node scripts/uploadGameConfig.js ./test-data/my-quiz.json --id custom_game_id
```

### Dry Run (Validation Only)

Validate the JSON file without uploading to Firebase:

```bash
node scripts/uploadGameConfig.js ./test-data/my-quiz.json --dry-run
```

### Download a Game

Download a game configuration from Firebase to a JSON file:

```bash
node scripts/uploadGameConfig.js --download --id game_id
```

Download to a specific file:

```bash
node scripts/uploadGameConfig.js --download --id game_id --output ./my-game.json
```

### Delete a Game

Remove a game from Firebase:

```bash
node scripts/uploadGameConfig.js --delete --id game_to_delete
```

### Help

Show all available options:

```bash
node scripts/uploadGameConfig.js --help
```

## JSON File Format

### Game Document Structure

All game JSON files should follow the `Game` interface:

```json
{
  "id": "my_game_id",
  "name": "My Game Name",
  "description": "A description of the game",
  "gameTypeId": "quiz",
  "active": true,
  "language": "en",
  "vip": [],
  "unlisted": false,
  "community": false,
  "creator": {
    "userid": "3elioaYGNBaqsuY8mL3XSG7SD7E2",
    "username": "Topxisrael",
    "image": "https://pbs.twimg.com/profile_images/1940446174214766592/LuC320Bt_400x400.png"
  },
  "custom": {
    // Game-specific configuration
  }
}
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Display name of the game |
| `gameTypeId` | string | One of: `trivia`, `quiz`, `PyramidTier`, `ZoneReveal`, `Pacman`, `FisherGame` |
| `custom` | object | Game-specific configuration |

### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | string | - | Document ID (can also use `--id` flag) |
| `description` | string | - | Game description |
| `active` | boolean | `true` | Whether game is playable |
| `language` | string | `"en"` | `"en"` or `"il"` |
| `unlisted` | boolean | `false` | Hide from public listings |
| `community` | boolean | `false` | Whether game is community-created |
| `creator` | object | Auto-set | Creator info (userid, username, image) |
| `gameInstruction` | string | - | Instructions shown before playing |

## Quiz Game Types

### Personality Quiz

"What X are you?" style quiz with bucket-based scoring:

```json
{
  "id": "animal_personality",
  "name": "What Animal Are You?",
  "gameTypeId": "quiz",
  "custom": {
    "mode": "personality",
    "questions": [
      {
        "id": "q1",
        "text": "How do you prefer to spend your time?",
        "answers": [
          { "text": "Leading activities", "bucketPoints": { "lion": 3 } },
          { "text": "Exploring alone", "bucketPoints": { "eagle": 3 } }
        ]
      }
    ],
    "personalityBuckets": [
      {
        "id": "lion",
        "label": "Lion",
        "description": "Natural leader",
        "results": [
          {
            "title": "You are a Lion!",
            "description": "You're a natural born leader...",
            "shareText": "I'm a Lion! What are you?"
          }
        ]
      }
    ]
  }
}
```

### Archetype Quiz

Multi-axis quiz like MBTI with radar chart results:

```json
{
  "id": "personality_type",
  "name": "Personality Type Quiz",
  "gameTypeId": "quiz",
  "custom": {
    "mode": "archetype",
    "questions": [
      {
        "id": "q1",
        "text": "At a party, you typically...",
        "answers": [
          { "text": "Talk to everyone", "axisPoints": { "EI": 2 } },
          { "text": "Stay with close friends", "axisPoints": { "EI": -2 } }
        ]
      }
    ],
    "archetypeAxes": [
      { "id": "EI", "lowLabel": "Introvert", "highLabel": "Extrovert" },
      { "id": "TF", "lowLabel": "Feeling", "highLabel": "Thinking" }
    ],
    "archetypeResults": [
      {
        "id": "ENTP",
        "pattern": { "EI": "high", "TF": "high" },
        "title": "The Debater",
        "description": "Quick-witted and bold..."
      }
    ]
  }
}
```

### Trivia Game

Traditional quiz with correct/incorrect answers:

```json
{
  "id": "general_trivia",
  "name": "General Knowledge",
  "gameTypeId": "trivia",
  "custom": {
    "mode": "fixed",
    "lives": 3,
    "questions": [
      {
        "id": "t1",
        "text": "What is the capital of France?",
        "answers": [
          { "text": "Paris" },
          { "text": "London" },
          { "text": "Berlin" }
        ],
        "correctAnswer": "Paris"
      }
    ]
  }
}
```

## Example Files

The `test-data/` directory contains ready-to-use examples:

| File | Description |
|------|-------------|
| `personality-quiz.json` | "What Animal Are You?" personality quiz |
| `archetype-quiz.json` | MBTI-style personality type quiz |
| `trivia-game.json` | General knowledge trivia |

## Workflow Example

### 1. Generate JSON with AI

Ask an AI coding assistant to create a quiz:

> "Create a JSON file for a personality quiz called 'What Superhero Are You?' with 6 questions and 4 hero types"

### 2. Save the JSON

Save the generated JSON to `test-data/superhero-quiz.json`

### 3. Validate First

```bash
node scripts/uploadGameConfig.js ./test-data/superhero-quiz.json --dry-run
```

### 4. Upload to Firebase

```bash
node scripts/uploadGameConfig.js ./test-data/superhero-quiz.json
```

### 5. Test the Game

The script outputs a direct link after upload:
```
✓ Successfully created game: superhero_quiz
Play at: https://top-x.co/games/quiz?game=superhero_quiz
```

## Downloading Existing Games

### Download for Editing

Download an existing game to edit it locally:

```bash
# Download to default file (./downloaded-<gameId>.json)
node scripts/uploadGameConfig.js --download --id 9yGh4YqTaj1u1nRXomYc

# Download to specific file
node scripts/uploadGameConfig.js --download --id 9yGh4YqTaj1u1nRXomYc --output ./my-edited-game.json
```

### Edit and Re-upload

1. Download the game:
   ```bash
   node scripts/uploadGameConfig.js --download --id my_game_id --output ./my-game.json
   ```

2. Edit the JSON file with your changes

3. Upload the updated version:
   ```bash
   node scripts/uploadGameConfig.js ./my-game.json
   ```

The script will automatically update the existing game (uses merge mode).

## Troubleshooting

### "serviceAccountKey.json not found"

Ensure your Firebase service account key is in one of these locations:
- Project root: `./serviceAccountKey.json`
- Client app: `./apps/client/serviceAccountKey.json`

### "Invalid gameTypeId"

Valid game types are: `trivia`, `quiz`, `PyramidTier`, `ZoneReveal`, `Pacman`, `FisherGame`

### "Quiz config must have mode"

For quiz games, ensure `custom.mode` is either `"personality"` or `"archetype"`

### Validation Errors

Run with `--dry-run` first to see all validation errors before uploading.

