import type { ZoneRevealAnswer } from '../types/zoneReveal';

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

const DEFAULT_MATCH_OPTIONS: Required<ZoneRevealAnswerMatchOptions> = {
  maxDistance: 2,
  relativeThreshold: 0.2,
};

/**
 * Break an answer into normalized, sortable tokens.
 */
export function normalizeZoneRevealAnswerTokens(value: string): string[] {
  if (!value) {
    return [];
  }

  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[\s,.;:!?/\\|-]+/u)
    .map((token) => token.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean)
    .sort();
}

/**
 * Create a canonical string representation from answer tokens.
 */
export function normalizeZoneRevealAnswer(value: string): string {
  return normalizeZoneRevealAnswerTokens(value).join(' ');
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) {
    return 0;
  }

  if (!a.length) {
    return b.length;
  }

  if (!b.length) {
    return a.length;
  }

  const previous = new Array(b.length + 1).fill(0).map((_, index) => index);
  const current = new Array(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        current[j] = previous[j - 1];
      } else {
        current[j] = Math.min(previous[j - 1], previous[j], current[j - 1]) + 1;
      }
    }

    for (let j = 0; j <= b.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[b.length];
}

function getDistanceThreshold(expected: string, attempt: string, options: ZoneRevealAnswerMatchOptions = {}): number {
  const { maxDistance, relativeThreshold } = { ...DEFAULT_MATCH_OPTIONS, ...options };
  const longest = Math.max(expected.length, attempt.length);
  return Math.max(maxDistance, Math.ceil(longest * relativeThreshold));
}

function tokensEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((token, index) => token === b[index]);
}

function matchesCandidate(candidate: string, attempt: string, options?: ZoneRevealAnswerMatchOptions): boolean {
  const normalizedCandidate = normalizeZoneRevealAnswer(candidate);
  const normalizedAttempt = normalizeZoneRevealAnswer(attempt);

  if (!normalizedCandidate || !normalizedAttempt) {
    return false;
  }

  if (normalizedCandidate === normalizedAttempt) {
    return true;
  }

  const candidateTokens = normalizedCandidate.split(' ');
  const attemptTokens = normalizedAttempt.split(' ');

  if (tokensEqual(candidateTokens, attemptTokens)) {
    return true;
  }

  const distance = levenshteinDistance(normalizedCandidate, normalizedAttempt);
  return distance <= getDistanceThreshold(normalizedCandidate, normalizedAttempt, options);
}

export function isZoneRevealAnswerMatch(
  answer: ZoneRevealAnswer,
  attempt: string,
  options?: ZoneRevealAnswerMatchOptions,
): boolean {
  const candidates = [answer.solution, ...(answer.accepted ?? [])];
  return candidates.some((candidate) => matchesCandidate(candidate, attempt, options));
}

