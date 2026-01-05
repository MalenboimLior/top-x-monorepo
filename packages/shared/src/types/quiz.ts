// packages/shared/src/types/quiz.ts

/**
 * Quiz Game Types
 * 
 * Supports two modes:
 * - personality: Single-axis bucket scoring ("What X are you?")
 * - archetype: Multi-axis scoring with radar chart (MBTI, Political Compass, etc.)
 */

// =============================================================================
// Answer Types
// =============================================================================

export interface QuizAnswer {
  /** Answer text displayed to user - optional if imageUrl is provided for image-only answers */
  text?: string;
  /** Optional image for the answer */
  imageUrl?: string;
  /** 
   * Points added to personality buckets when this answer is selected.
   * Used in personality mode.
   * Example: { "lion": 3, "eagle": 1 }
   */
  bucketPoints?: Record<string, number>;
  /**
   * Points added/subtracted from axes when this answer is selected.
   * Used in archetype mode. Positive = toward high label, negative = toward low label.
   * Example: { "IE": 2, "TF": -1 }
   */
  axisPoints?: Record<string, number>;
}

// =============================================================================
// Question Types
// =============================================================================

export interface QuizQuestion {
  /** Unique identifier for the question */
  id: string;
  /** Question text/prompt displayed to user - optional if imageUrl is provided for image-only questions */
  text?: string;
  /** Optional image for the question */
  imageUrl?: string;
  /** Array of possible answers */
  answers: QuizAnswer[];
  /** Optional category for organization/filtering */
  category?: string;
}

// =============================================================================
// Personality Mode Types
// =============================================================================

/**
 * A result variant shown to the user for a specific bucket.
 * Can be score-range specific or a default result.
 */
export interface PersonalityResultVariant {
  /** Minimum score for this result (inclusive). Omit for default/fallback. */
  minScore?: number;
  /** Maximum score for this result (inclusive). Omit for no upper limit. */
  maxScore?: number;
  /** Result title shown to user (e.g., "You are a Lion!") */
  title: string;
  /** Detailed description of the result */
  description: string;
  /** Optional image for the result */
  imageUrl?: string;
  /** Optional custom share text for social media */
  shareText?: string;
}

/**
 * A bucket/category that accumulates points in personality mode.
 * Contains embedded results (single or score-ranged).
 * Example: "Lion", "Eagle", "Bear", "Wolf" for an animal personality quiz.
 */
export interface PersonalityBucket {
  /** Unique identifier for the bucket */
  id: string;
  /** Display label for the bucket */
  label: string;
  /**
   * Results for this bucket.
   * - Single result: just one entry (default)
   * - Score ranges: multiple entries with minScore/maxScore
   */
  results: PersonalityResultVariant[];
}

// =============================================================================
// Archetype Mode Types
// =============================================================================

/**
 * An axis representing a spectrum between two poles.
 * Example: Introvert-Extrovert, Thinking-Feeling
 */
export interface ArchetypeAxis {
  /** Unique identifier for the axis (e.g., "IE", "TF") */
  id: string;
  /** Label for the low/negative end of the spectrum */
  lowLabel: string;
  /** Label for the high/positive end of the spectrum */
  highLabel: string;
}

/**
 * A result shown to the user based on their axis pattern.
 * Matches against a pattern of high/low values across axes.
 */
export interface ArchetypeResult {
  /** Unique identifier for the result */
  id: string;
  /** 
   * Pattern of axis values that matches this result.
   * Example for MBTI: { "EI": "high", "SN": "low", "TF": "high", "JP": "low" } = ENFP
   */
  pattern: Record<string, 'low' | 'high'>;
  /** Result title shown to user */
  title: string;
  /** Detailed description of the result */
  description: string;
  /** Optional image for the result */
  imageUrl?: string;
  /** Optional custom share text for social media */
  shareText?: string;
}

// =============================================================================
// Theme Configuration
// =============================================================================

/**
 * Visual theme configuration for quiz display.
 * Mirrors TriviaThemeConfig for consistency.
 */
export interface QuizThemeConfig {
  /** Primary accent color */
  primaryColor?: string;
  /** Secondary accent color */
  secondaryColor?: string;
  /** Background color */
  backgroundColor?: string;
  /** Type of background */
  backgroundType?: 'color' | 'gradient' | 'emoji' | 'image';
  /** CSS gradient string if type is 'gradient' */
  backgroundGradient?: string;
  /** Emoji character if type is 'emoji' */
  backgroundEmoji?: string;
  /** Background image URL if type is 'image' */
  backgroundImageUrl?: string;
}

// =============================================================================
// Main Configuration
// =============================================================================

/**
 * Main configuration for a Quiz game.
 * Supports two modes: personality and archetype.
 */
export interface QuizConfig {
  /** Quiz mode - determines scoring and result logic */
  mode: 'personality' | 'archetype';

  /** Array of questions for the quiz */
  questions: QuizQuestion[];

  /** Visual theme configuration */
  theme?: QuizThemeConfig;

  // -------------------------------------------------------------------------
  // Personality Mode Fields
  // -------------------------------------------------------------------------

  /** 
   * Available buckets for personality mode.
   * Each bucket contains its own results (single or score-ranged).
   */
  personalityBuckets?: PersonalityBucket[];

  // -------------------------------------------------------------------------
  // Archetype Mode Fields
  // -------------------------------------------------------------------------

  /** Axis definitions for archetype mode */
  archetypeAxes?: ArchetypeAxis[];

  /** Result definitions for archetype mode (one per pattern combination) */
  archetypeResults?: ArchetypeResult[];

  // -------------------------------------------------------------------------
  // Optional Features
  // -------------------------------------------------------------------------

  /** Whether to show progress indicator (e.g., "Question 3 of 10") */
  showProgress?: boolean;

  /** Whether to randomize question order */
  shuffleQuestions?: boolean;

  /** Whether to randomize answer order within each question */
  shuffleAnswers?: boolean;

  /** Whether user must login to take the quiz */
  mustLogin?: boolean;

  /** Whether user can retake the quiz */
  allowRepeats?: boolean;
}

