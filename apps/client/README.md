# Client App Notes

This document highlights how the web client integrates with the simplified leaderboard model.

## Leaderboard destinations

Client features that read leaderboard data should request one of two paths exposed by the Cloud Functions API:

- **Global game leaderboard** – omit `dailyChallengeId` so requests hit `games/{gameId}/leaderboard/{uid}`.
- **Daily challenge leaderboard** – include `dailyChallengeId` (and optionally `dailyChallengeDate` for clarity) so reads target `games/{gameId}/daily_challenges/{dailyChallengeId}/leaderboard/{uid}`.

Endpoints such as `getTopLeaderboard`, `getAroundLeaderboard`, `getFriendsLeaderboard`, and `getVipLeaderboard` already accept an optional `dailyChallengeId` query string. Passing or omitting that value is now the only switch between the two leaderboard collections.

## Submitting scores

The `submitGameScore` callable is invoked from [`src/stores/user.ts`](./src/stores/user.ts). Payloads must conform to the streamlined contract:

```ts
const payload: SubmitGameScoreRequest = {
  gameTypeId,
  gameId,
  gameData: {
    score,
    streak,
    lastPlayed: Date.now(),
    custom: { ... },
  },
  // Optional daily challenge context
  dailyChallengeId,
  dailyChallengeDate,
  challengeMetadata,
};
```

Important details for client implementations:

- Only `score`, `streak`, timestamps, and any optional `custom` metadata are written to the leaderboard entry. Aggregated score or streak fields are no longer produced by the backend and should not be read or displayed.
- Challenge submissions **must** include `dailyChallengeId`. Providing `dailyChallengeDate` and `challengeMetadata` is encouraged when the client has that context available, but those fields are ignored without the identifier.
- The callable response includes `previousScore`, `newScore`, and, when relevant, `challengeBestScore`, `dailyChallengeId`, and `dailyChallengeDate`. Use those values to update local state instead of relying on deprecated aggregated metrics.

Following this contract keeps the client aligned with the simplified leaderboard model and prevents accidental writes to legacy collections.
