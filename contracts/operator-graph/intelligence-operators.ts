/**
 * Intelligence Operator Contracts
 * CINEOS Intelligence — Lane 3
 * Status: SCAFFOLD
 *
 * Operators for worker trace inspection, trust/evidence evaluation,
 * and intelligent analysis within the operator graph engine.
 */

export interface WorkerEvent {
  event_id: string;
  worker_id: string;
  worker_type: 'analysis' | 'generation' | 'review' | 'comparison' | 'routing';
  action: string;
  status: 'completed' | 'failed' | 'degraded' | 'pending';
  trust_tier: 'T0' | 'T1' | 'T2' | 'T3' | 'T4';
  confidence: number;
  latency_ms: number;
  input_summary: string;
  output_summary: string;
  evidence_type: 'none' | 'log' | 'runtime' | 'test' | 'integration';
  created_at: string;
  linked_objects: Array<{ object_type: string; object_id: string }>;
  error?: string;
}

export interface WorkerTrace {
  trace_id: string;
  events: WorkerEvent[];
  total_events: number;
  success_count: number;
  failure_count: number;
  degraded_count: number;
  avg_latency_ms: number;
  trust_distribution: Record<string, number>;
  time_span: { start: string; end: string };
}

export interface WorkerTraceInspection {
  inspection_id: string;
  trace: WorkerTrace;
  anomalies: Array<{
    event_id: string;
    type: 'high_latency' | 'low_confidence' | 'unexpected_failure' | 'trust_mismatch';
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  summary: string;
  recommendations: string[];
}

export interface ReviewBlockerAnalysis {
  analysis_id: string;
  review_item_id: string;
  blockers: Array<{
    blocker_id: string;
    type: 'missing_approval' | 'failing_check' | 'unresolved_conflict' | 'trust_insufficient' | 'evidence_missing';
    description: string;
    severity: 'blocking' | 'warning';
    resolution_hint: string;
  }>;
  total_blockers: number;
  blocking_count: number;
  warning_count: number;
  can_proceed: boolean;
  summary: string;
}

export interface PermissionEvent {
  event_id: string;
  actor: string;
  action: string;
  resource: string;
  result: 'allow' | 'deny' | 'escalate';
  trust_tier: string;
  timestamp: string;
  reason: string;
}

// Executor interfaces
export interface InspectWorkerTraceExecutor {
  execute(input: { worker_id?: string; time_range?: { start: string; end: string } }): Promise<{ inspection: WorkerTraceInspection }>;
}

export interface DetectReviewBlockersExecutor {
  execute(input: { review_item_id: string }): Promise<{ analysis: ReviewBlockerAnalysis }>;
}

export interface ValidateInputsExecutor {
  execute(input: { data: unknown; schema_ref: string }): Promise<{ valid: boolean; errors: string[] }>;
}

export interface EnforcePermissionsExecutor {
  execute(input: { actor: string; action: string; resource: string }): Promise<{ event: PermissionEvent }>;
}

// Demo film proof data
export const DEMO_WORKER_EVENTS: WorkerEvent[] = [
  {
    event_id: 'wk-evt-001',
    worker_id: 'analysis-worker-01',
    worker_type: 'analysis',
    action: 'detect_cut_delta',
    status: 'completed',
    trust_tier: 'T1',
    confidence: 0.91,
    latency_ms: 45,
    input_summary: 'Scene: Opening — City Dawn',
    output_summary: '2 cut deltas detected: trim on shot 2, reorder of shot 3',
    evidence_type: 'runtime',
    created_at: '2026-03-14T14:30:00Z',
    linked_objects: [{ object_type: 'scene', object_id: 'demo-scene-001' }],
  },
  {
    event_id: 'wk-evt-002',
    worker_id: 'comparison-worker-01',
    worker_type: 'comparison',
    action: 'compare_branch_intent',
    status: 'completed',
    trust_tier: 'T2',
    confidence: 0.78,
    latency_ms: 120,
    input_summary: 'Branch: Director Vision vs Producer Review Cut',
    output_summary: 'Divergent intent — pacing conflict in scene 3',
    evidence_type: 'runtime',
    created_at: '2026-03-14T14:31:00Z',
    linked_objects: [{ object_type: 'branch', object_id: 'demo-directors-cut' }, { object_type: 'branch', object_id: 'demo-producers-cut' }],
  },
  {
    event_id: 'wk-evt-003',
    worker_id: 'review-worker-01',
    worker_type: 'review',
    action: 'detect_review_blockers',
    status: 'degraded',
    trust_tier: 'T3',
    confidence: 0.65,
    latency_ms: 200,
    input_summary: 'Review item: Scene 3 conflict resolution',
    output_summary: 'Partial analysis — missing producer sign-off evidence',
    evidence_type: 'log',
    created_at: '2026-03-14T14:32:00Z',
    linked_objects: [{ object_type: 'review_item', object_id: 'review-002' }],
  },
  {
    event_id: 'wk-evt-004',
    worker_id: 'routing-worker-01',
    worker_type: 'routing',
    action: 'route_to_human_review',
    status: 'completed',
    trust_tier: 'T3',
    confidence: 0.88,
    latency_ms: 15,
    input_summary: 'Route scene 3 conflict to producer',
    output_summary: 'Routed to review-wall panel, assigned to producer',
    evidence_type: 'runtime',
    created_at: '2026-03-14T14:33:00Z',
    linked_objects: [{ object_type: 'review_item', object_id: 'review-002' }],
  },
];
