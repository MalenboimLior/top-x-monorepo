import type { ZoneRevealAnswer } from '@top-x/shared/types/zoneReveal';
export interface ZoneRevealAnswerMatchOptions {
    /**
     * Maximum absolute distance allowed between the normalized attempt and
     * expected answer strings. Defaults to 2.
     */
    maxDistance?: number;
    /**
     * Percentage (0-1) of the longest string length that can be considered a
     * typo while still being accepted. Defaults to 0.2 (20%).
     */
    relativeThreshold?: number;
}
/**
 * Break an answer into normalized, sortable tokens.
 */
export declare function normalizeZoneRevealAnswerTokens(value: string): string[];
/**
 * Create a canonical string representation from answer tokens.
 */
export declare function normalizeZoneRevealAnswer(value: string): string;
export interface ZoneRevealAnswerEvaluation {
    originalAnswer: string;
    normalizedAnswer: string;
    distance: number | null;
    isMatch: boolean;
}
export declare function evaluateZoneRevealAnswer(answer: ZoneRevealAnswer, attempt: string, options?: ZoneRevealAnswerMatchOptions): ZoneRevealAnswerEvaluation;
export declare function isZoneRevealAnswerMatch(answer: ZoneRevealAnswer, attempt: string, options?: ZoneRevealAnswerMatchOptions): boolean;
