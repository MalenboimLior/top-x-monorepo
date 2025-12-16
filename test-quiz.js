// Test script to check quiz result extraction
const testGameData = {
  custom: {
    quiz: {
      bucketScores: {
        "lion": 25,
        "eagle": 15,
        "bear": 10,
        "wolf": 5
      }
    }
  }
};

const testCachedGame = {
  custom: {
    personalityBuckets: [
      {
        id: "lion",
        label: "Lion",
        results: [
          {
            title: "You are a Majestic Lion!",
            imageUrl: "lion.jpg",
            description: "You are brave and strong"
          }
        ]
      },
      {
        id: "eagle",
        label: "Eagle",
        results: [
          {
            title: "You are a Wise Eagle!",
            imageUrl: "eagle.jpg",
            description: "You are intelligent and visionary"
          }
        ]
      }
    ]
  }
};

// Simulate the extraction logic
const quizCustom = testGameData.custom?.quiz;
if (quizCustom && testCachedGame) {
  const bucketScores = quizCustom.bucketScores;
  if (bucketScores && testCachedGame.custom?.personalityBuckets) {
    // Find the winning bucket (highest score)
    let winningBucketId = null;
    let highestScore = -Infinity;

    Object.entries(bucketScores).forEach(([bucketId, score]) => {
      if (score > highestScore) {
        highestScore = score;
        winningBucketId = bucketId;
      }
    });

    console.log('Winning bucket:', winningBucketId, 'Score:', highestScore);

    // Find the bucket in game config
    const winningBucket = testCachedGame.custom.personalityBuckets.find(
      (bucket) => bucket.id === winningBucketId
    );

    console.log('Winning bucket found:', winningBucket);

    if (winningBucket && winningBucket.results && winningBucket.results.length > 0) {
      // Find the appropriate result variant based on score
      const resultVariant = winningBucket.results.find((result) => {
        const minOk = result.minScore === undefined || highestScore >= result.minScore;
        const maxOk = result.maxScore === undefined || highestScore <= result.maxScore;
        return minOk && maxOk;
      }) || winningBucket.results[0]; // fallback to first result

      console.log('Result:', resultVariant);
    }
  }
}


