/**
 * Confidence Display Contract
 *
 * Maps numeric confidence scores to human-friendly display values
 * (colour, label, description) for consistent UI rendering.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConfidenceLevel = "very_low" | "low" | "medium" | "high" | "very_high";

export interface ConfidenceDisplay {
  /** Categorised confidence level. */
  level: ConfidenceLevel;

  /** CSS-compatible colour string for the confidence badge. */
  color: string;

  /** Short label (e.g. "High", "Low"). */
  label: string;

  /** Longer human-readable description. */
  description: string;
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

export interface ConfidenceDisplayContract {
  /**
   * Convert a raw confidence score (0-1) into a display descriptor.
   *
   * @param confidence - A number between 0 and 1 inclusive.
   * @returns The display configuration for the corresponding confidence level.
   */
  getConfidenceDisplay(confidence: number): ConfidenceDisplay;
}
