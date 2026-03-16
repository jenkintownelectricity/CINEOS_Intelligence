/**
 * Narrative Pressure Analyzer Tests
 *
 * 5 tests verifying:
 * - Pressure map derived from analyses
 * - authoritative is always false
 * - Contributing factors link to analysis_ids
 * - Source provenance maintained
 */

import { describe, it, expect, beforeEach } from 'vitest';
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

describe('NarrativePressureAnalyzer', () => {
  beforeEach(() => {
    clearPressureMaps();
  });

  it('pressure map derived from analyses', () => {
    const spine = createTestSpine();
    const map = analyzePressure('tl-001', testAnalysisSource, spine);

    expect(map.pressure_map_id).toBeDefined();
    expect(map.timeline_id).toBe('tl-001');
    expect(map.segments.length).toBe(2);
  });

  it('authoritative is always false', () => {
    const spine = createTestSpine();
    const map = analyzePressure('tl-002', testAnalysisSource, spine);

    expect(map.authoritative).toBe(false);
  });

  it('contributing factors link to analysis findings', () => {
    const spine = createTestSpine();
    const map = analyzePressure('tl-003', testAnalysisSource, spine);

    const seg1 = map.segments[0];
    expect(seg1.contributing_factors.length).toBeGreaterThan(0);
    expect(seg1.contributing_factors).toContain('rapid_cuts');
  });

  it('source analysis IDs maintained in segments', () => {
    const spine = createTestSpine();
    const map = analyzePressure('tl-004', testAnalysisSource, spine);

    for (const seg of map.segments) {
      expect(seg.source_analysis_ids.length).toBeGreaterThan(0);
      for (const aid of seg.source_analysis_ids) {
        expect(aid).toMatch(/^ana-/);
      }
    }
  });

  it('getPressureMap retrieves stored map', () => {
    const spine = createTestSpine();
    const map = analyzePressure('tl-005', testAnalysisSource, spine);

    const retrieved = getPressureMap(map.pressure_map_id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.pressure_map_id).toBe(map.pressure_map_id);
    expect(retrieved!.authoritative).toBe(false);
  });
});
