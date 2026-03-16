/**
 * Revision Heatmap Generator
 *
 * Builds heatmaps from canonical mutation records via Event Spine.
 * Heatmaps are DERIVED — authoritative field is always false.
 * Source: timeline_mutation records.
 *
 * Classification: derived analytics surface, not authoritative.
 */

import { generateId, EventSpineEmitter, InMemoryEventSpine, IntelligenceEvent } from './creative-dna-analyzer';

// --- Types ---

export interface HeatmapCell {
  object_id: string;
  revision_count: number;
  last_revised_at: string;
  source_mutation_ids: string[];
}

export type Granularity = 'clip' | 'track' | 'scene' | 'sequence';

export interface RevisionHeatmap {
  heatmap_id: string;
  scope: { timeline_id: string } | { project_id: string };
  granularity: Granularity;
  cells: HeatmapCell[];
  generated_at: string;
  source_event_count: number;
  authoritative: false; // Always false — heatmaps are DERIVED
}

export interface MutationRecord {
  mutation_id: string;
  object_id: string;
  timestamp: string;
}

export interface MutationSource {
  getMutations(timelineId: string): MutationRecord[];
}

// --- Default mock mutation source ---

export const MockMutationSource: MutationSource = {
  getMutations(timelineId: string): MutationRecord[] {
    // Mock: return sample mutations for testing
    return [
      { mutation_id: `mut-${timelineId}-001`, object_id: 'clip-001', timestamp: new Date().toISOString() },
      { mutation_id: `mut-${timelineId}-002`, object_id: 'clip-001', timestamp: new Date().toISOString() },
      { mutation_id: `mut-${timelineId}-003`, object_id: 'clip-002', timestamp: new Date().toISOString() },
      { mutation_id: `mut-${timelineId}-004`, object_id: 'track-001', timestamp: new Date().toISOString() },
    ];
  },
};

// --- Heatmap store ---

const heatmapStore = new Map<string, RevisionHeatmap>();
const heatmapSourceMap = new Map<string, { timelineId: string; granularity: Granularity }>();

// --- Internal ---

function buildCells(mutations: MutationRecord[]): HeatmapCell[] {
  const cellMap = new Map<string, HeatmapCell>();

  for (const m of mutations) {
    const existing = cellMap.get(m.object_id);
    if (existing) {
      existing.revision_count++;
      existing.source_mutation_ids.push(m.mutation_id);
      if (m.timestamp > existing.last_revised_at) {
        existing.last_revised_at = m.timestamp;
      }
    } else {
      cellMap.set(m.object_id, {
        object_id: m.object_id,
        revision_count: 1,
        last_revised_at: m.timestamp,
        source_mutation_ids: [m.mutation_id],
      });
    }
  }

  return Array.from(cellMap.values());
}

function emitHeatmapEvent(
  spine: EventSpineEmitter,
  heatmapId: string,
  payload: Record<string, unknown>,
): void {
  const event: IntelligenceEvent = {
    event_id: generateId(),
    event_class: 'intelligence_event',
    source_subsystem: 'revision_heatmap',
    source_object_id: heatmapId,
    related_cdg_object_ids: [],
    payload,
    status: 'emitted',
    emitted_at: new Date().toISOString(),
    actor_ref: 'revision-heatmap-generator-v1',
    correlation_id: generateId(),
    causality_ref: null,
    replayable_flag: true,
  };
  spine.emit(event);
}

// --- Public API ---

/**
 * Generate a revision heatmap from canonical mutation records.
 * The heatmap is DERIVED and non-authoritative.
 */
export function generateHeatmap(
  timelineId: string,
  granularity: Granularity,
  mutationSource: MutationSource = MockMutationSource,
  spine: EventSpineEmitter = InMemoryEventSpine,
): RevisionHeatmap {
  const mutations = mutationSource.getMutations(timelineId);
  const cells = buildCells(mutations);

  const heatmap: RevisionHeatmap = {
    heatmap_id: generateId(),
    scope: { timeline_id: timelineId },
    granularity,
    cells,
    generated_at: new Date().toISOString(),
    source_event_count: mutations.length,
    authoritative: false, // ALWAYS false — derived, not truth
  };

  heatmapStore.set(heatmap.heatmap_id, heatmap);
  heatmapSourceMap.set(heatmap.heatmap_id, { timelineId, granularity });

  emitHeatmapEvent(spine, heatmap.heatmap_id, {
    action: 'heatmap_generated',
    cell_count: cells.length,
    source_event_count: mutations.length,
  });

  return heatmap;
}

/**
 * Retrieve a previously generated heatmap (non-authoritative).
 */
export function getHeatmap(heatmapId: string): RevisionHeatmap | undefined {
  return heatmapStore.get(heatmapId);
}

/**
 * Regenerate a heatmap from canonical sources.
 */
export function refreshHeatmap(
  heatmapId: string,
  mutationSource: MutationSource = MockMutationSource,
  spine: EventSpineEmitter = InMemoryEventSpine,
): RevisionHeatmap {
  const sourceInfo = heatmapSourceMap.get(heatmapId);
  if (!sourceInfo) {
    throw new Error(`No source info for heatmap: ${heatmapId}`);
  }

  const mutations = mutationSource.getMutations(sourceInfo.timelineId);
  const cells = buildCells(mutations);

  const refreshed: RevisionHeatmap = {
    heatmap_id: heatmapId,
    scope: { timeline_id: sourceInfo.timelineId },
    granularity: sourceInfo.granularity,
    cells,
    generated_at: new Date().toISOString(),
    source_event_count: mutations.length,
    authoritative: false, // ALWAYS false
  };

  heatmapStore.set(heatmapId, refreshed);

  emitHeatmapEvent(spine, heatmapId, {
    action: 'heatmap_refreshed',
    cell_count: cells.length,
    source_event_count: mutations.length,
  });

  return refreshed;
}

/**
 * Clear all heatmaps (for testing).
 */
export function clearHeatmaps(): void {
  heatmapStore.clear();
  heatmapSourceMap.clear();
}
