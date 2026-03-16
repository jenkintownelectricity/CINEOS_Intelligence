/**
 * Revision Heatmap Generator Tests
 *
 * 5 tests verifying:
 * - Heatmap derived from canonical mutations
 * - authoritative field is always false
 * - Refresh regenerates from sources
 * - Source mutation_ids preserved
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateHeatmap,
  getHeatmap,
  refreshHeatmap,
  clearHeatmaps,
  type MutationSource,
  type EventSpineEmitter,
} from '../../src/intelligence/revision-heatmap-generator';
import type { IntelligenceEvent } from '../../src/intelligence/creative-dna-analyzer';

// --- Test helpers ---

function createTestSpine(): EventSpineEmitter & { events: IntelligenceEvent[] } {
  return { events: [], emit(event: IntelligenceEvent) { this.events.push(event); } };
}

const testMutationSource: MutationSource = {
  getMutations(timelineId: string) {
    return [
      { mutation_id: 'mut-001', object_id: 'clip-A', timestamp: '2026-03-16T10:00:00Z' },
      { mutation_id: 'mut-002', object_id: 'clip-A', timestamp: '2026-03-16T10:05:00Z' },
      { mutation_id: 'mut-003', object_id: 'clip-B', timestamp: '2026-03-16T10:10:00Z' },
    ];
  },
};

describe('RevisionHeatmapGenerator', () => {
  beforeEach(() => {
    clearHeatmaps();
  });

  it('heatmap derived from canonical mutations', () => {
    const spine = createTestSpine();
    const heatmap = generateHeatmap('tl-001', 'clip', testMutationSource, spine);

    expect(heatmap.heatmap_id).toBeDefined();
    expect(heatmap.cells.length).toBe(2);
    expect(heatmap.source_event_count).toBe(3);

    const clipA = heatmap.cells.find((c) => c.object_id === 'clip-A');
    expect(clipA).toBeDefined();
    expect(clipA!.revision_count).toBe(2);
  });

  it('authoritative is always false', () => {
    const spine = createTestSpine();
    const heatmap = generateHeatmap('tl-002', 'scene', testMutationSource, spine);

    expect(heatmap.authoritative).toBe(false);
  });

  it('refresh regenerates from canonical sources', () => {
    const spine = createTestSpine();
    const original = generateHeatmap('tl-003', 'clip', testMutationSource, spine);

    // Refresh with updated mutation source
    const updatedSource: MutationSource = {
      getMutations() {
        return [
          { mutation_id: 'mut-001', object_id: 'clip-A', timestamp: '2026-03-16T10:00:00Z' },
          { mutation_id: 'mut-002', object_id: 'clip-A', timestamp: '2026-03-16T10:05:00Z' },
          { mutation_id: 'mut-003', object_id: 'clip-B', timestamp: '2026-03-16T10:10:00Z' },
          { mutation_id: 'mut-004', object_id: 'clip-C', timestamp: '2026-03-16T10:15:00Z' },
        ];
      },
    };

    const refreshed = refreshHeatmap(original.heatmap_id, updatedSource, spine);

    expect(refreshed.heatmap_id).toBe(original.heatmap_id);
    expect(refreshed.cells.length).toBe(3);
    expect(refreshed.source_event_count).toBe(4);
    expect(refreshed.authoritative).toBe(false);
  });

  it('source mutation_ids preserved in cells', () => {
    const spine = createTestSpine();
    const heatmap = generateHeatmap('tl-004', 'clip', testMutationSource, spine);

    const clipA = heatmap.cells.find((c) => c.object_id === 'clip-A');
    expect(clipA).toBeDefined();
    expect(clipA!.source_mutation_ids.length).toBe(2);
    expect(clipA!.source_mutation_ids).toContain('mut-001');
    expect(clipA!.source_mutation_ids).toContain('mut-002');
  });

  it('getHeatmap retrieves stored heatmap', () => {
    const spine = createTestSpine();
    const heatmap = generateHeatmap('tl-005', 'track', testMutationSource, spine);

    const retrieved = getHeatmap(heatmap.heatmap_id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.heatmap_id).toBe(heatmap.heatmap_id);
  });
});
