/**
 * Creative DNA Analyzer Tests
 *
 * 7 tests verifying:
 * - Analysis produces structured findings (not prose)
 * - Findings have CDG evidence refs
 * - Event emission on analysis
 * - Timeline analysis covers multiple analysis types
 */

import { describe, it, expect, beforeEach } from 'vitest';
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

describe('CreativeDNAAnalyzer', () => {
  beforeEach(() => {
    clearAnalyses();
    InMemoryEventSpine.events.length = 0;
  });

  it('analysis produces structured findings (not prose)', () => {
    const spine = createTestSpine();
    const result = analyze('timeline_mutation', 'tm-001', 'pattern_detection', spine);

    expect(result.analysis_id).toBeDefined();
    expect(result.findings.length).toBeGreaterThan(0);
    expect(typeof result.findings[0].finding_id).toBe('string');
    expect(typeof result.findings[0].finding_type).toBe('string');
    expect(typeof result.findings[0].confidence).toBe('number');
    expect(typeof result.findings[0].description).toBe('string');
    // Verify it's structured, not just prose
    expect(result.findings[0].evidence_refs).toBeDefined();
    expect(Array.isArray(result.findings[0].evidence_refs)).toBe(true);
  });

  it('findings have CDG evidence refs', () => {
    const spine = createTestSpine();
    const result = analyze('timeline_mutation', 'tm-002', 'style_fingerprint', spine);

    for (const finding of result.findings) {
      expect(finding.evidence_refs.length).toBeGreaterThan(0);
      for (const ref of finding.evidence_refs) {
        expect(typeof ref.entity_type).toBe('string');
        expect(ref.entity_type.length).toBeGreaterThan(0);
        expect(typeof ref.entity_id).toBe('string');
        expect(ref.entity_id.length).toBeGreaterThan(0);
      }
    }
  });

  it('emits event on analysis', () => {
    const spine = createTestSpine();
    analyze('review_packet', 'rp-001', 'rhythm_analysis', spine);

    expect(spine.events.length).toBe(1);
    const event = spine.events[0];
    expect(event.event_class).toBe('intelligence_event');
    expect(event.source_subsystem).toBe('creative_dna_analyzer');
    expect(event.status).toBe('emitted');
    expect(event.related_cdg_object_ids).toContain('rp-001');
  });

  it('timeline analysis covers all 5 analysis types', () => {
    const spine = createTestSpine();
    const results = analyzeTimeline('tl-001', spine);

    expect(results.length).toBe(5);
    const types = results.map((r) => r.analysis_type);
    expect(types).toContain('pattern_detection');
    expect(types).toContain('style_fingerprint');
    expect(types).toContain('rhythm_analysis');
    expect(types).toContain('narrative_structure');
    expect(types).toContain('pacing_analysis');
  });

  it('getAnalysis retrieves stored analysis', () => {
    const spine = createTestSpine();
    const result = analyze('timeline_mutation', 'tm-003', 'pacing_analysis', spine);
    const retrieved = getAnalysis(result.analysis_id);

    expect(retrieved).toBeDefined();
    expect(retrieved!.analysis_id).toBe(result.analysis_id);
    expect(retrieved!.source_entity_id).toBe('tm-003');
  });

  it('analysis type determines findings content', () => {
    const spine = createTestSpine();
    const patternResult = analyze('timeline_mutation', 'tm-004', 'pattern_detection', spine);
    const pacingResult = analyze('timeline_mutation', 'tm-004', 'pacing_analysis', spine);

    expect(patternResult.findings[0].finding_type).not.toBe(pacingResult.findings[0].finding_type);
  });

  it('source entity type and ID preserved in analysis', () => {
    const spine = createTestSpine();
    const result = analyze('editorial_decision', 'ed-001', 'narrative_structure', spine);

    expect(result.source_entity_type).toBe('editorial_decision');
    expect(result.source_entity_id).toBe('ed-001');
    expect(result.analyzer_ref).toBe('creative-dna-analyzer-v1');
  });
});
