import type { UserGameCustomData } from '@top-x/shared/types/user';
import type { TriviaLeaderboardCustom, QuizLeaderboardCustom, PyramidLeaderboardCustom, ZoneRevealLeaderboardCustom, PacmanLeaderboardCustom, FisherGameLeaderboardCustom } from '@top-x/shared/types/leaderboardCustom';
import type { TriviaUserCustom, QuizUserCustom, PyramidUserCustom, ZoneRevealUserCustom, PacmanUserCustom, FisherGameUserCustom } from '@top-x/shared/types/userGameCustom';
/**
 * Separates trivia custom data into leaderboard and user-specific data
 */
export declare function separateTriviaData(custom: UserGameCustomData, metrics: {
    questionIds: string[];
    answerHashes: string[];
    mode: 'fixed' | 'endless';
    attemptCount: number;
    correctCount: number;
    accuracy: number;
    score: number;
    streak: number;
}): {
    leaderboard: TriviaLeaderboardCustom;
    user: TriviaUserCustom;
};
/**
 * Separates quiz custom data into leaderboard and user-specific data
 */
export declare function separateQuizData(custom: UserGameCustomData, quizSubmission?: {
    questionIds: string[];
    selectedAnswers: Record<string, number>;
    result: {
        id: string;
        title: string;
    };
    mode: 'personality' | 'archetype';
    image?: string;
}): {
    leaderboard: QuizLeaderboardCustom;
    user: QuizUserCustom;
};
/**
 * Separates pyramid custom data into leaderboard and user-specific data
 */
export declare function separatePyramidData(custom: UserGameCustomData, score?: number): {
    leaderboard: PyramidLeaderboardCustom;
    user: PyramidUserCustom;
};
/**
 * Separates zoneReveal custom data into leaderboard and user-specific data
 */
export declare function separateZoneRevealData(custom: UserGameCustomData, score?: number, streak?: number, attemptCount?: number): {
    leaderboard: ZoneRevealLeaderboardCustom;
    user: ZoneRevealUserCustom;
};
/**
 * Separates pacman custom data into leaderboard and user-specific data
 */
export declare function separatePacmanData(custom: UserGameCustomData, score?: number): {
    leaderboard: PacmanLeaderboardCustom;
    user: PacmanUserCustom;
};
/**
 * Separates fisherGame custom data into leaderboard and user-specific data
 */
export declare function separateFisherGameData(custom: UserGameCustomData, score?: number): {
    leaderboard: FisherGameLeaderboardCustom;
    user: FisherGameUserCustom;
};
