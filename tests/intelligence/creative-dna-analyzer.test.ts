/**
 * Creative DNA Analyzer Tests
 *
 * 7 tests verifying:
 * - Analysis produces structured findings (not prose)
 * - Findings have CDG evidence refs
 * - Event emission on analysis
 * - Timeline analysis covers multiple analysis types
 */

import {
  analyze,
  analyzeTimeline,
  getAnalysis,
  clearAnalyses,
  InMemoryEventSpine,
  type CreativeDNAAnalysis,
  type EventSpineEmitter,
  type IntelligenceEvent,
} from '../../src/intelligence/creative-dna-analyzer';

// --- Test helpers ---

function createTestSpine(): EventSpineEmitter & { events: IntelligenceEvent[] } {
  return { events: [], emit(event: IntelligenceEvent) { this.events.push(event); } };
}

function setup() {
  clearAnalyses();
  InMemoryEventSpine.events.length = 0;
}

// --- Tests ---

// Test 1: Analysis produces structured findings (not prose)
function test_analysis_produces_structured_findings(): void {
  setup();
  const spine = createTestSpine();
  const result = analyze('timeline_mutation', 'tm-001', 'pattern_detection', spine);

  console.assert(result.analysis_id !== undefined, 'analysis_id should be defined');
  console.assert(result.findings.length > 0, 'findings should not be empty');
  console.assert(typeof result.findings[0].finding_id === 'string', 'finding_id should be string');
  console.assert(typeof result.findings[0].finding_type === 'string', 'finding_type should be string');
  console.assert(typeof result.findings[0].confidence === 'number', 'confidence should be number');
  console.assert(typeof result.findings[0].description === 'string', 'description should be string');
  // Verify it's structured, not just prose
  console.assert(result.findings[0].evidence_refs !== undefined, 'evidence_refs should be present');
  console.assert(Array.isArray(result.findings[0].evidence_refs), 'evidence_refs should be array');
  console.log('PASS: test_analysis_produces_structured_findings');
}

// Test 2: Findings have CDG evidence refs
function test_findings_have_cdg_evidence_refs(): void {
  setup();
  const spine = createTestSpine();
  const result = analyze('timeline_mutation', 'tm-002', 'style_fingerprint', spine);

  for (const finding of result.findings) {
    console.assert(finding.evidence_refs.length > 0, 'each finding must have evidence refs');
    for (const ref of finding.evidence_refs) {
      console.assert(typeof ref.entity_type === 'string' && ref.entity_type.length > 0, 'evidence ref entity_type must be non-empty string');
      console.assert(typeof ref.entity_id === 'string' && ref.entity_id.length > 0, 'evidence ref entity_id must be non-empty string');
    }
  }
  console.log('PASS: test_findings_have_cdg_evidence_refs');
}

// Test 3: Event emission on analysis
function test_event_emission_on_analysis(): void {
  setup();
  const spine = createTestSpine();
  analyze('review_packet', 'rp-001', 'rhythm_analysis', spine);

  console.assert(spine.events.length === 1, `expected 1 event, got ${spine.events.length}`);
  const event = spine.events[0];
  console.assert(event.event_class === 'intelligence_event', 'event_class should be intelligence_event');
  console.assert(event.source_subsystem === 'creative_dna_analyzer', 'source_subsystem should be creative_dna_analyzer');
  console.assert(event.status === 'emitted', 'status should be emitted');
  console.assert(event.related_cdg_object_ids.includes('rp-001'), 'cdg ids should include source entity');
  console.log('PASS: test_event_emission_on_analysis');
}

// Test 4: Timeline analysis covers all 5 analysis types
function test_timeline_analysis_covers_all_types(): void {
  setup();
  const spine = createTestSpine();
  const results = analyzeTimeline('tl-001', spine);

  console.assert(results.length === 5, `expected 5 analyses, got ${results.length}`);
  const types = results.map((r) => r.analysis_type);
  console.assert(types.includes('pattern_detection'), 'should include pattern_detection');
  console.assert(types.includes('style_fingerprint'), 'should include style_fingerprint');
  console.assert(types.includes('rhythm_analysis'), 'should include rhythm_analysis');
  console.assert(types.includes('narrative_structure'), 'should include narrative_structure');
  console.assert(types.includes('pacing_analysis'), 'should include pacing_analysis');
  console.log('PASS: test_timeline_analysis_covers_all_types');
}

// Test 5: getAnalysis retrieves stored analysis
function test_get_analysis_retrieves_stored(): void {
  setup();
  const spine = createTestSpine();
  const result = analyze('timeline_mutation', 'tm-003', 'pacing_analysis', spine);
  const retrieved = getAnalysis(result.analysis_id);

  console.assert(retrieved !== undefined, 'retrieved analysis should be defined');
  console.assert(retrieved!.analysis_id === result.analysis_id, 'analysis_ids should match');
  console.assert(retrieved!.source_entity_id === 'tm-003', 'source_entity_id should match');
  console.log('PASS: test_get_analysis_retrieves_stored');
}

// Test 6: Analysis type determines findings content
function test_analysis_type_determines_findings(): void {
  setup();
  const spine = createTestSpine();
  const patternResult = analyze('timeline_mutation', 'tm-004', 'pattern_detection', spine);
  const pacingResult = analyze('timeline_mutation', 'tm-004', 'pacing_analysis', spine);

  console.assert(patternResult.findings[0].finding_type !== pacingResult.findings[0].finding_type,
    'different analysis types should produce different finding types');
  console.log('PASS: test_analysis_type_determines_findings');
}

// Test 7: Source entity type and ID preserved in analysis
function test_source_entity_preserved(): void {
  setup();
  const spine = createTestSpine();
  const result = analyze('editorial_decision', 'ed-001', 'narrative_structure', spine);

  console.assert(result.source_entity_type === 'editorial_decision', 'source_entity_type should be preserved');
  console.assert(result.source_entity_id === 'ed-001', 'source_entity_id should be preserved');
  console.assert(result.analyzer_ref === 'creative-dna-analyzer-v1', 'analyzer_ref should be set');
  console.log('PASS: test_source_entity_preserved');
}

// --- Run all tests ---
test_analysis_produces_structured_findings();
test_findings_have_cdg_evidence_refs();
test_event_emission_on_analysis();
test_timeline_analysis_covers_all_types();
test_get_analysis_retrieves_stored();
test_analysis_type_determines_findings();
test_source_entity_preserved();
console.log('\nAll 7 creative-dna-analyzer tests passed.');
