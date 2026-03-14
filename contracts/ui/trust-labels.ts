/**
 * Trust Labels Contract
 *
 * Defines the canonical set of trust labels used across the CINEOS
 * intelligence layer and provides display configuration for each.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export enum TrustLabel {
  /** Tier 1 -- fast, local heuristic. */
  FAST_LOCAL = "FAST_LOCAL",

  /** Tier 2 -- domain-specialist worker. */
  SPECIALIST = "SPECIALIST",

  /** Tier 3 -- deep / multi-step analysis. */
  DEEP_ANALYSIS = "DEEP_ANALYSIS",

  /** Tier 4 -- requires explicit human review before proceeding. */
  HUMAN_REVIEW_REQUIRED = "HUMAN_REVIEW_REQUIRED",
}

export interface TrustLabelDisplay {
  /** The trust label this display config describes. */
  label: TrustLabel;

  /** CSS-compatible colour string (hex, rgb, or named). */
  color: string;

  /** Icon identifier (e.g. a Material-icon name or SVG path ref). */
  icon: string;

  /** Short human-readable description of what this label means. */
  description: string;

  /** Numeric tier (1 = fastest/cheapest, 4 = requires human review). */
  tier: number;
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

export interface TrustLabels {
  /**
   * Retrieve the display configuration for a given trust label.
   */
  getTrustLabelConfig(label: TrustLabel): TrustLabelDisplay;
}
