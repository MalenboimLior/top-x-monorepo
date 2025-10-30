# Cloud Functions Overview

## Leaderboard storage

The leaderboard logic now writes to exactly two Firestore collection trees:

- `games/{gameId}/leaderboard/{uid}` – canonical leaderboard for ongoing play.
- `games/{gameId}/daily_challenges/{dailyChallengeId}/leaderboard/{uid}` – challenge-specific leaderboard entries keyed by the challenge identifier.

No additional aggregated leaderboard document is created. Each entry is merged with the existing document (if any) and contains the score, streak, user display data, and timestamps that were supplied in the submission payload. Challenge rows also capture the challenge identifier, logical challenge date, and most recent attempt metadata when it is provided.

Both HTTP leaderboard endpoints (top, around, friends, percentile, VIP) and any Firestore reads should point to one of these two collection paths. The helper `getLeaderboardCollectionRef(gameId, dailyChallengeId?)` in `functions/src/index.ts` already encapsulates this branching logic.

## Submission expectations

`submitGameScore` is the single entry point for persisting leaderboard results. The callable expects the simplified payload below and forwards data to the appropriate leaderboard path.

```ts
interface SubmitGameScoreRequest {
  gameTypeId: string;
  gameId: string;
  gameData: {
    score: number;
    streak: number;
    lastPlayed?: number;
    custom?: Record<string, unknown>;
  };
  dailyChallengeId?: string;
  dailyChallengeDate?: string; // YYYY-MM-DD, required when submitting to a challenge leaderboard
  challengeMetadata?: Record<string, unknown>; // optional audit payload stored alongside challenge entries
}
```

Key expectations:

- When `dailyChallengeId` is omitted the write targets `games/{gameId}/leaderboard/{uid}`. When provided it targets the challenge leaderboard path listed above.
- Aggregated score or streak fields are no longer computed or returned. Downstream consumers should rely solely on the score and streak recorded in the stored leaderboard document.
- The callable merges new data with the player document, updates the leaderboard document once per request, and records challenge progress (best score, attempt counts, timestamps) when applicable.

The response mirrors this simplified contract by returning the player's previous and new score, and if relevant the best challenge score and identifiers so clients can reconcile local state without reading the leaderboard again.

## Deployment note

Because the Firebase Functions project lives inside an npm workspace, dependencies can otherwise be hoisted to the repository root. That breaks Cloud Functions deployments (modules such as `axios` are missing at runtime). The `.npmrc` in this folder sets `install-strategy=nested` so every deploy installs dependencies locally under `functions/node_modules`.
