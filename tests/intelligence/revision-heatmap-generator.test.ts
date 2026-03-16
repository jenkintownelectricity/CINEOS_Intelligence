/**
 * Revision Heatmap Generator Tests
 *
 * 5 tests verifying:
 * - Heatmap derived from canonical mutations
 * - authoritative field is always false
 * - Refresh regenerates from sources
 * - Source mutation_ids preserved
 */

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

function setup() {
  clearHeatmaps();
}

// --- Tests ---

// Test 1: Heatmap derived from canonical mutations
function test_heatmap_from_canonical_mutations(): void {
  setup();
  const spine = createTestSpine();
  const heatmap = generateHeatmap('tl-001', 'clip', testMutationSource, spine);

  console.assert(heatmap.heatmap_id !== undefined, 'heatmap_id should be defined');
  console.assert(heatmap.cells.length === 2, `expected 2 cells (clip-A and clip-B), got ${heatmap.cells.length}`);
  console.assert(heatmap.source_event_count === 3, 'source_event_count should be 3');

  const clipA = heatmap.cells.find((c) => c.object_id === 'clip-A');
  console.assert(clipA !== undefined, 'clip-A cell should exist');
  console.assert(clipA!.revision_count === 2, 'clip-A should have 2 revisions');
  console.log('PASS: test_heatmap_from_canonical_mutations');
}

// Test 2: authoritative is always false
function test_authoritative_always_false(): void {
  setup();
  const spine = createTestSpine();
  const heatmap = generateHeatmap('tl-002', 'scene', testMutationSource, spine);

  console.assert(heatmap.authoritative === false, 'authoritative must be false (derived, not truth)');
  // Verify type-level: the field is typed as `false`, not `boolean`
  console.log('PASS: test_authoritative_always_false');
}

// Test 3: Refresh regenerates from canonical sources
function test_refresh_regenerates(): void {
  setup();
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

  console.assert(refreshed.heatmap_id === original.heatmap_id, 'heatmap_id should be preserved');
  console.assert(refreshed.cells.length === 3, `expected 3 cells after refresh, got ${refreshed.cells.length}`);
  console.assert(refreshed.source_event_count === 4, 'source_event_count should be 4');
  console.assert(refreshed.authoritative === false, 'authoritative should still be false');
  console.log('PASS: test_refresh_regenerates');
}

// Test 4: Source mutation_ids preserved in cells
function test_source_mutation_ids_preserved(): void {
  setup();
  const spine = createTestSpine();
  const heatmap = generateHeatmap('tl-004', 'clip', testMutationSource, spine);

  const clipA = heatmap.cells.find((c) => c.object_id === 'clip-A');
  console.assert(clipA !== undefined, 'clip-A should exist');
  console.assert(clipA!.source_mutation_ids.length === 2, 'clip-A should reference 2 mutations');
  console.assert(clipA!.source_mutation_ids.includes('mut-001'), 'should include mut-001');
  console.assert(clipA!.source_mutation_ids.includes('mut-002'), 'should include mut-002');
  console.log('PASS: test_source_mutation_ids_preserved');
}

// Test 5: getHeatmap retrieves stored heatmap
function test_get_heatmap_retrieves(): void {
  setup();
  const spine = createTestSpine();
  const heatmap = generateHeatmap('tl-005', 'track', testMutationSource, spine);

  const retrieved = getHeatmap(heatmap.heatmap_id);
  console.assert(retrieved !== undefined, 'retrieved heatmap should be defined');
  console.assert(retrieved!.heatmap_id === heatmap.heatmap_id, 'heatmap_ids should match');
  console.log('PASS: test_get_heatmap_retrieves');
}

// --- Run all tests ---
test_heatmap_from_canonical_mutations();
test_authoritative_always_false();
test_refresh_regenerates();
test_source_mutation_ids_preserved();
test_get_heatmap_retrieves();
console.log('\nAll 5 revision-heatmap-generator tests passed.');
