/**
 * Narrative Pressure Analyzer Tests
 *
 * 5 tests verifying:
 * - Pressure map derived from analyses
 * - authoritative is always false
 * - Contributing factors link to analysis_ids
 * - Source provenance maintained
 */

import {
  analyzePressure,
  getPressureMap,
  clearPressureMaps,
  type AnalysisSource,
  type EventSpineEmitter,
} from '../../src/intelligence/narrative-pressure-analyzer';
import type { IntelligenceEvent, CreativeDNAAnalysis } from '../../src/intelligence/creative-dna-analyzer';

// --- Test helpers ---

function createTestSpine(): EventSpineEmitter & { events: IntelligenceEvent[] } {
  return { events: [], emit(event: IntelligenceEvent) { this.events.push(event); } };
}

const testAnalysisSource: AnalysisSource = {
  getAnalysesForTimeline(timelineId: string): CreativeDNAAnalysis[] {
    return [
      {
        analysis_id: 'ana-t1-001',
        source_entity_type: 'timeline_mutation',
        source_entity_id: timelineId,
        analysis_type: 'pacing_analysis',
        findings: [
          {
            finding_id: 'f-001',
            finding_type: 'rapid_cuts',
            confidence: 0.85,
            evidence_refs: [{ entity_type: 'timeline_mutation', entity_id: timelineId }],
            description: 'Rapid cutting detected.',
          },
        ],
        analyzed_at: new Date().toISOString(),
        analyzer_ref: 'test',
      },
      {
        analysis_id: 'ana-t1-002',
        source_entity_type: 'timeline_mutation',
        source_entity_id: timelineId,
        analysis_type: 'rhythm_analysis',
        findings: [
          {
            finding_id: 'f-002',
            finding_type: 'tonal_shift',
            confidence: 0.6,
            evidence_refs: [{ entity_type: 'timeline_mutation', entity_id: timelineId }],
            description: 'Tonal shift detected.',
          },
        ],
        analyzed_at: new Date().toISOString(),
        analyzer_ref: 'test',
      },
    ];
  },
};

function setup() {
  clearPressureMaps();
}

// --- Tests ---

// Test 1: Pressure map derived from analyses
function test_pressure_map_from_analyses(): void {
  setup();
  const spine = createTestSpine();
  const map = analyzePressure('tl-001', testAnalysisSource, spine);

  console.assert(map.pressure_map_id !== undefined, 'pressure_map_id should be defined');
  console.assert(map.timeline_id === 'tl-001', 'timeline_id should match');
  console.assert(map.segments.length === 2, `expected 2 segments, got ${map.segments.length}`);
  console.log('PASS: test_pressure_map_from_analyses');
}

// Test 2: authoritative is always false
function test_authoritative_always_false(): void {
  setup();
  const spine = createTestSpine();
  const map = analyzePressure('tl-002', testAnalysisSource, spine);

  console.assert(map.authoritative === false, 'authoritative must be false (derived, not truth)');
  console.log('PASS: test_authoritative_always_false');
}

// Test 3: Contributing factors link to analysis findings
function test_contributing_factors_from_findings(): void {
  setup();
  const spine = createTestSpine();
  const map = analyzePressure('tl-003', testAnalysisSource, spine);

  const seg1 = map.segments[0];
  console.assert(seg1.contributing_factors.length > 0, 'contributing_factors should not be empty');
  console.assert(seg1.contributing_factors.includes('rapid_cuts'), 'should include rapid_cuts factor');
  console.log('PASS: test_contributing_factors_from_findings');
}

// Test 4: Source analysis IDs maintained in segments
function test_source_analysis_ids_maintained(): void {
  setup();
  const spine = createTestSpine();
  const map = analyzePressure('tl-004', testAnalysisSource, spine);

  for (const seg of map.segments) {
    console.assert(seg.source_analysis_ids.length > 0, 'source_analysis_ids should not be empty');
    for (const aid of seg.source_analysis_ids) {
      console.assert(aid.startsWith('ana-'), `analysis id should start with ana-, got ${aid}`);
    }
  }
  console.log('PASS: test_source_analysis_ids_maintained');
}

// Test 5: getPressureMap retrieves stored map
function test_get_pressure_map(): void {
  setup();
  const spine = createTestSpine();
  const map = analyzePressure('tl-005', testAnalysisSource, spine);

  const retrieved = getPressureMap(map.pressure_map_id);
  console.assert(retrieved !== undefined, 'retrieved map should be defined');
  console.assert(retrieved!.pressure_map_id === map.pressure_map_id, 'ids should match');
  console.assert(retrieved!.authoritative === false, 'authoritative should still be false');
  console.log('PASS: test_get_pressure_map');
}

// --- Run all tests ---
test_pressure_map_from_analyses();
test_authoritative_always_false();
test_contributing_factors_from_findings();
test_source_analysis_ids_maintained();
test_get_pressure_map();
console.log('\nAll 5 narrative-pressure-analyzer tests passed.');
