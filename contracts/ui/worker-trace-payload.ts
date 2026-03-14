/**
 * Worker Trace Payload Contract
 *
 * Surfaces worker execution traces for observability. Supports
 * filtering, detail retrieval, and real-time subscription.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

import type { TrustLabel } from "./trust-labels";

export type LatencyClass = "fast" | "moderate" | "slow";

export type ActionScope = "read" | "suggest" | "mutate";

export interface TraceFilter {
  /** Filter by worker class name. */
  workerClass?: string;

  /** Filter by trust label tier. */
  trustLabel?: TrustLabel;

  /** Filter by action scope. */
  actionScope?: ActionScope;

  /** Only include advisory (non-mutating) traces. */
  advisoryOnly?: boolean;

  /** Only include traces after this ISO-8601 timestamp. */
  since?: string;

  /** Maximum number of results. */
  limit?: number;

  /** Pagination offset. */
  offset?: number;
}

export interface WorkerTrace {
  /** Unique trace identifier. */
  id: string;

  /** Identifier of the worker instance. */
  workerId: string;

  /** Class / type of the worker. */
  workerClass: string;

  /** Worker tier (1 = fastest/cheapest, higher = deeper). */
  tier: number;

  /** Trust label assigned to this worker's output. */
  trustLabel: TrustLabel;

  /** Confidence score of the worker's result (0-1). */
  confidence: number;

  /** Wall-clock latency in milliseconds. */
  latencyMs: number;

  /** Categorised latency bucket. */
  latencyClass: LatencyClass;

  /** Scope of the action taken by the worker. */
  actionScope: ActionScope;

  /** Whether the action was advisory (no side effects). */
  isAdvisory: boolean;

  /** Path to the evidence supporting this trace. */
  evidencePath: string;

  /** Path to the undo record, if the action is reversible. */
  undoPath?: string;

  /** ISO-8601 timestamp of trace creation. */
  timestamp: string;
}

export interface WorkerTraceDetail extends WorkerTrace {
  /** Full input payload supplied to the worker. */
  input: Record<string, unknown>;

  /** Full output payload produced by the worker. */
  output: Record<string, unknown>;

  /** Ordered log of steps the worker executed. */
  steps: TraceStep[];
}

export interface TraceStep {
  /** Step index (0-based). */
  index: number;

  /** Human-readable description of the step. */
  description: string;

  /** Duration of this step in milliseconds. */
  durationMs: number;

  /** Optional structured data for this step. */
  data?: Record<string, unknown>;
}

/** Function returned by subscribeToTraces to cancel the subscription. */
export type Unsubscribe = () => void;

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

export interface WorkerTracePayload {
  /**
   * Query worker traces matching the given filters.
   */
  getWorkerTraces(filters: TraceFilter): Promise<WorkerTrace[]>;

  /**
   * Retrieve the full detail for a single trace.
   */
  getTraceDetail(traceId: string): Promise<WorkerTraceDetail>;

  /**
   * Subscribe to a real-time stream of new traces.
   *
   * @param callback - Invoked each time a new trace arrives.
   * @returns A function that, when called, cancels the subscription.
   */
  subscribeToTraces(callback: (trace: WorkerTrace) => void): Unsubscribe;
}
