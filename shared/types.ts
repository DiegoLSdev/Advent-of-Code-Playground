// Shapes of the local API responses.

export interface Me {
  configured: boolean;
  valid: boolean;
  user?: string;
  contact?: string;
}

export interface YearSummary {
  year: number;
  stars: number;
  maxStars: number;
}

export interface YearStars {
  year: number;
  days: { day: number; stars: number }[];
  total: number;
  fetchedAt: number;
}

export interface Puzzle {
  year: number;
  day: number;
  title: string;
  /** HTML of each visible part (part 2 appears once part 1 is solved). */
  parts: string[];
  /** Answers already accepted by AoC, in part order. */
  answers: string[];
  fetchedAt: number;
}

export type AnswerStatus = 'correct' | 'incorrect' | 'wait' | 'already' | 'unknown';

export interface AnswerResult {
  status: AnswerStatus;
  message: string;
}
