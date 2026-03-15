# Worker Panel Contract

> **Upstream repo:** CINEOS_Intelligence
> **Status:** Prototype-backed (mock data adapters, no real worker orchestration yet)
> **Panel-runtime aware:** Yes — all data contracts are designed for consumption by registered CINEOS panels via typed adapter interfaces.
> **Consuming panels:** Worker Trace Panel

---

## 1. Overview

The Worker Panel Contract defines the data shapes, adapter interfaces, and commands that CINEOS Intelligence exposes for the Worker Trace Panel running inside the CINEOS workspace host. The Worker Trace Panel displays a chronological trace of worker events, each annotated with tier, trust label, confidence, latency, and undo path. This enables users to inspect, audit, and understand the behavior of AI workers operating within CINEOS.

---

## 2. Core Types

### 2.1 WorkerEvent

A discrete unit of worker activity — one step in a worker's execution trace.

```typescript
interface WorkerEvent {
  event_id: string;                 // UUID
  worker_id: string;                // The worker instance that produced this event
  worker_name: string;              // Human-readable worker name
  session_id: string;               // Session/run this event belongs to
  timestamp: string;                // ISO 8601 — when the event occurred
  type: WorkerEventType;
  tier: WorkerTier;
  trust_label: TrustLabel;
  confidence: number;               // 0.0 – 1.0
  latency_ms: number;               // Time taken to produce this event
  undo_path: UndoPath;
  summary: string;                  // One-line human-readable description
  detail: string;                   // Full detail (markdown supported)
  inputs: Record<string, unknown>;  // What the worker received
  outputs: Record<string, unknown>; // What the worker produced
  parent_event_id?: string;         // If this event was triggered by another event
  children_event_ids: string[];     // Events this event triggered
  metadata: Record<string, unknown>;
}

type WorkerEventType =
  | "plan"                          // Worker planned a sequence of actions
  | "execute"                       // Worker executed an action
  | "observe"                       // Worker observed/read something
  | "decide"                        // Worker made a decision
  | "delegate"                      // Worker delegated to another worker
  | "error"                         // Worker encountered an error
  | "checkpoint"                    // Explicit state checkpoint
  | "complete";                     // Worker completed its task
```

### 2.2 WorkerTier

The tier indicates the capability level and trust boundary of the worker.

```typescript
type WorkerTier =
  | "orchestrator"                  // Top-level coordinator
  | "specialist"                    // Domain-specific worker
  | "tool"                          // Tool-use / function-call worker
  | "validator";                    // Verification / validation worker
```

### 2.3 TrustLabel

Indicates the provenance and verification status of the worker's output.

```typescript
type TrustLabel = "verified" | "synthetic" | "user-authored";
```

### 2.4 UndoPath

Describes how the effects of this worker event can be reversed.

```typescript
interface UndoPath {
  is_undoable: boolean;
  undo_type?: UndoType;
  undo_ref?: string;                // Reference to the undo action or snapshot
  description?: string;             // Human-readable explanation of how to undo
}

type UndoType =
  | "snapshot_restore"              // Restore a prior snapshot
  | "inverse_operation"             // Apply an inverse operation
  | "manual"                        // Requires manual intervention
  | "not_applicable";               // Side-effect-free, nothing to undo
```

---

## 3. Worker Trace Data Contract

### 3.1 WorkerTrace

The full trace for a session or a filtered subset.

```typescript
interface WorkerTrace {
  session_id: string;
  worker_id?: string;               // If filtered to a single worker
  events: WorkerEvent[];
  total_events: number;
  trace_duration_ms: number;        // Total elapsed time from first to last event
  summary: WorkerTraceSummary;
}

interface WorkerTraceSummary {
  total_events: number;
  events_by_type: Record<WorkerEventType, number>;
  events_by_tier: Record<WorkerTier, number>;
  events_by_trust: Record<TrustLabel, number>;
  average_confidence: number;
  average_latency_ms: number;
  total_latency_ms: number;
  error_count: number;
  undoable_count: number;
}
```

### 3.2 Trace Query

```typescript
interface WorkerTraceQuery {
  session_id: string;
  worker_id?: string;               // Filter to specific worker
  event_types?: WorkerEventType[];  // Filter by event type
  tiers?: WorkerTier[];             // Filter by tier
  trust_labels?: TrustLabel[];      // Filter by trust label
  confidence_min?: number;          // Minimum confidence
  confidence_max?: number;          // Maximum confidence
  time_range?: {
    start: string;                  // ISO 8601
    end: string;                    // ISO 8601
  };
  sort_order?: "asc" | "desc";     // Default: "asc" (chronological)
  limit?: number;                   // Default: 100, max: 500
  offset?: number;                  // Pagination offset
}
```

### 3.3 Trace Query Response

```typescript
interface WorkerTraceResponse {
  trace: WorkerTrace;
  limit: number;
  offset: number;
  has_more: boolean;
}
```

---

## 4. Trust Label Display Contract

Defines how the Worker Trace Panel renders trust labels. This is a display contract — it tells the consuming panel what visual treatment each trust label receives.

### 4.1 TrustLabelDisplay

```typescript
interface TrustLabelDisplay {
  label: TrustLabel;
  display_text: string;
  icon: string;                     // Icon identifier (e.g., "shield-check", "cpu", "user")
  color: TrustLabelColor;
  tooltip: string;
}

interface TrustLabelColor {
  background: string;               // CSS color
  text: string;                     // CSS color
  border: string;                   // CSS color
}
```

### 4.2 Default Trust Label Mapping

| TrustLabel       | Display Text     | Icon            | Background  | Text      | Tooltip                                      |
|------------------|------------------|-----------------|-------------|-----------|----------------------------------------------|
| `verified`       | "Verified"       | `shield-check`  | `#dcfce7`   | `#166534` | "Output has been verified by a validator"     |
| `synthetic`      | "Synthetic"      | `cpu`           | `#fef3c7`   | `#92400e` | "Output was generated by an AI worker"        |
| `user-authored`  | "User Authored"  | `user`          | `#dbeafe`   | `#1e40af` | "Content was authored or approved by a user"  |

**Adapter method:**

```typescript
getTrustLabelDisplayConfig(): TrustLabelDisplay[];
```

---

## 5. Confidence Display Contract

Defines how numerical confidence values are rendered visually.

### 5.1 ConfidenceDisplay

```typescript
interface ConfidenceDisplay {
  value: number;                    // 0.0 – 1.0
  percentage: number;               // 0 – 100 (derived)
  tier: ConfidenceTier;
  color: string;                    // CSS color for the visual indicator
  label: string;                    // Human-readable label
  indicator_type: "bar" | "badge" | "ring";
}

type ConfidenceTier = "high" | "medium" | "low" | "very_low";
```

### 5.2 Confidence Tier Thresholds

| Tier        | Range          | Color     | Label         |
|-------------|----------------|-----------|---------------|
| `high`      | 0.80 – 1.00   | `#22c55e` | "High"        |
| `medium`    | 0.60 – 0.79   | `#eab308` | "Medium"      |
| `low`       | 0.40 – 0.59   | `#f97316` | "Low"         |
| `very_low`  | 0.00 – 0.39   | `#ef4444` | "Very Low"    |

**Adapter method:**

```typescript
getConfidenceDisplay(value: number): ConfidenceDisplay;
```

---

## 6. Commands

Commands are dispatched through the workspace host command bus.

| Command        | Payload                          | Target Panel         | Description                                       |
|----------------|----------------------------------|----------------------|---------------------------------------------------|
| `open_object`  | `{ object_type: "worker_event", object_id: string }` | Worker Trace Panel   | Open the Worker Trace Panel and focus on the specified worker event for detailed inspection. |

**Command dispatch via adapter:**

```typescript
interface IntelligenceCommandAdapter {
  openObject(object_type: "worker_event", object_id: string): void;
}
```

---

## 7. Typed Adapter Interface

All data access goes through the adapter provided to panels at mount time.

```typescript
interface WorkerPanelAdapter {
  // Trace data
  queryWorkerTrace(query: WorkerTraceQuery): Promise<WorkerTraceResponse>;
  getWorkerEvent(event_id: string): Promise<WorkerEvent | null>;
  getEventChildren(event_id: string): Promise<WorkerEvent[]>;
  getEventAncestry(event_id: string): Promise<WorkerEvent[]>; // From root to this event

  // Display contracts
  getTrustLabelDisplayConfig(): TrustLabelDisplay[];
  getConfidenceDisplay(value: number): ConfidenceDisplay;

  // Subscriptions
  subscribeToTrace(session_id: string, callback: (event: WorkerEvent) => void): Unsubscribe;
  subscribeToEvent(event_id: string, callback: (event: WorkerEvent) => void): Unsubscribe;

  // Commands
  commands: IntelligenceCommandAdapter;
}

type Unsubscribe = () => void;
```

---

## 8. Prototype Implementation Notes

- `queryWorkerTrace` returns a mock trace with 30 events spanning all event types, tiers, and trust labels.
- Worker events form a tree: one `orchestrator` root event delegates to 3 `specialist` events, each of which produces `tool` and `observe` sub-events.
- Confidence values are distributed across all tiers to exercise every display path.
- Latency values range from 5ms (tool calls) to 2500ms (orchestrator planning) for realistic mock data.
- `subscribeToTrace` fires once with the full mock trace and does not emit further updates.
- Trust label and confidence display configs return the default mappings documented above.
- All mock data is deterministic and keyed on IDs for test stability.
