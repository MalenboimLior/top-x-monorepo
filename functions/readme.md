# Cloud Functions Overview

## Leaderboard HTTP APIs

The following REST endpoints now accept an optional `dailyChallengeId` query parameter in addition to `gameId` and any existing arguments:

- `GET /getTopLeaderboard`
- `GET /getAroundLeaderboard`
- `GET /getFriendsLeaderboard`
- `GET /getPercentileRank`
- `GET /getVipLeaderboard`

When `dailyChallengeId` is provided, these functions read from the challenge-specific leaderboard at `games/{gameId}/daily_challenges/{dailyChallengeId}/leaderboard`. If the parameter is omitted, they continue to return results from the aggregated leaderboard at `games/{gameId}/leaderboard`.

Example request:

```
GET https://<region>-<project>.cloudfunctions.net/getTopLeaderboard?gameId=smartest_on_x&limit=20&dailyChallengeId=2024-05-10
```

---

export const onScoreWrite = functions.firestore
  .document('leaderboards_trivia/{uid}')
  .onWrite(async (change, context) => {
    const uid = context.params.uid;
    const statsRef = db.collection('stats').doc('trivia');

    await db.runTransaction(async (tx) => {
      const statsDoc = await tx.get(statsRef);
      const currentStats = statsDoc.exists
        ? statsDoc.data()!
        : { totalPlayers: 0, scoreDistribution: {} };

      const distribution = { ...currentStats.scoreDistribution };
      let totalPlayers = currentStats.totalPlayers;

      const beforeScore = change.before.exists ? change.before.data()?.score : null;
      const afterScore = change.after.exists ? change.after.data()?.score : null;

      if (!change.before.exists && afterScore !== null) {
        distribution[afterScore] = (distribution[afterScore] || 0) + 1;
        totalPlayers++;
      } else if (!change.after.exists && beforeScore !== null) {
        distribution[beforeScore] = Math.max((distribution[beforeScore] || 1) - 1, 0);
        totalPlayers = Math.max(totalPlayers - 1, 0);
      } else if (beforeScore !== afterScore) {
        if (beforeScore !== null) {
          distribution[beforeScore] = Math.max((distribution[beforeScore] || 1) - 1, 0);
        }
        if (afterScore !== null) {
          distribution[afterScore] = (distribution[afterScore] || 0) + 1;
        }
      }

      tx.set(statsRef, {
        scoreDistribution: distribution,
        totalPlayers,
        updatedAt: Date.now(),
      });
    });
  });
