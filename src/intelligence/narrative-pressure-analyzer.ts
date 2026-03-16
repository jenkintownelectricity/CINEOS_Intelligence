/**
 * Narrative Pressure Analyzer
 *
 * Builds narrative pressure maps from creative DNA analyses.
 * Pressure maps are DERIVED — authoritative field is always false.
 * Contributing factors link to analysis_ids.
 *
 * Classification: derived analytics surface, rule-based, not ML.
 */

import { generateId, EventSpineEmitter, InMemoryEventSpine, IntelligenceEvent } from './creative-dna-analyzer';
import type { CreativeDNAAnalysis } from './creative-dna-analyzer';

// --- Types ---

export interface PressureSegment {
  segment_id: string;
  start: number;
  end: number;
  pressure_score: number;
  contributing_factors: string[];
  source_analysis_ids: string[];
}

export interface NarrativePressureMap {
  pressure_map_id: string;
  timeline_id: string;
  segments: PressureSegment[];
  generated_at: string;
  authoritative: false; // Always false — derived, not truth
}

export interface AnalysisSource {
  getAnalysesForTimeline(timelineId: string): CreativeDNAAnalysis[];
}

// --- Default mock analysis source ---

export const MockAnalysisSource: AnalysisSource = {
  getAnalysesForTimeline(timelineId: string): CreativeDNAAnalysis[] {
    // Mock: returns sample analyses for testing
    return [
      {
        analysis_id: `analysis-${timelineId}-001`,
        source_entity_type: 'timeline_mutation',
        source_entity_id: timelineId,
        analysis_type: 'pacing_analysis',
        findings: [
          {
            finding_id: 'finding-001',
            finding_type: 'pacing_anomaly',
            confidence: 0.8,
            evidence_refs: [{ entity_type: 'timeline_mutation', entity_id: timelineId }],
            description: 'Rapid pacing detected in opening segment.',
          },
        ],
        analyzed_at: new Date().toISOString(),
        analyzer_ref: 'creative-dna-analyzer-v1',
      },
      {
        analysis_id: `analysis-${timelineId}-002`,
        source_entity_type: 'timeline_mutation',
        source_entity_id: timelineId,
        analysis_type: 'rhythm_analysis',
        findings: [
          {
            finding_id: 'finding-002',
            finding_type: 'rhythm_consistency',
            confidence: 0.7,
            evidence_refs: [{ entity_type: 'timeline_mutation', entity_id: timelineId }],
            description: 'Consistent rhythm in middle segment.',
          },
        ],
        analyzed_at: new Date().toISOString(),
        analyzer_ref: 'creative-dna-analyzer-v1',
      },
    ];
  },
};

// --- Store ---

const pressureMapStore = new Map<string, NarrativePressureMap>();

// --- Internal ---

function derivePressureSegments(analyses: CreativeDNAAnalysis[]): PressureSegment[] {
  // Rule-based pressure derivation from analysis findings
  const segments: PressureSegment[] = [];
  const segmentDuration = 300; // frames per segment (mock)
  let offset = 0;

  for (const analysis of analyses) {
    const factors: string[] = [];
    const analysisIds: string[] = [analysis.analysis_id];

    for (const finding of analysis.findings) {
      factors.push(finding.finding_type);
    }

    // Average confidence across findings as pressure score
    const avgConfidence =
      analysis.findings.length > 0
        ? analysis.findings.reduce((sum, f) => sum + f.confidence, 0) / analysis.findings.length
        : 0;

    segments.push({
      segment_id: generateId(),
      start: offset,
      end: offset + segmentDuration,
      pressure_score: Math.min(avgConfidence, 1.0),
      contributing_factors: factors,
      source_analysis_ids: analysisIds,
    });

    offset += segmentDuration;
  }

  return segments;
}

function emitPressureEvent(
  spine: EventSpineEmitter,
  mapId: string,
  payload: Record<string, unknown>,
): void {
  const event: IntelligenceEvent = {
    event_id: generateId(),
    event_class: 'intelligence_event',
    source_subsystem: 'narrative_pressure',
    source_object_id: mapId,
    related_cdg_object_ids: [],
    payload,
    status: 'emitted',
    emitted_at: new Date().toISOString(),
    actor_ref: 'narrative-pressure-analyzer-v1',
    correlation_id: generateId(),
    causality_ref: null,
    replayable_flag: true,
  };
  spine.emit(event);
}

// --- Public API ---

/**
 * Build a narrative pressure map from creative DNA analyses.
 * The map is DERIVED and non-authoritative.
 */
export function analyzePressure(
  timelineId: string,
  analysisSource: AnalysisSource = MockAnalysisSource,
  spine: EventSpineEmitter = InMemoryEventSpine,
): NarrativePressureMap {
  const analyses = analysisSource.getAnalysesForTimeline(timelineId);
  const segments = derivePressureSegments(analyses);

  const pressureMap: NarrativePressureMap = {
    pressure_map_id: generateId(),
    timeline_id: timelineId,
    segments,
    generated_at: new Date().toISOString(),
    authoritative: false, // ALWAYS false — derived, not truth
  };

  pressureMapStore.set(pressureMap.pressure_map_id, pressureMap);

  emitPressureEvent(spine, pressureMap.pressure_map_id, {
    action: 'pressure_map_generated',
    segment_count: segments.length,
    timeline_id: timelineId,
  });

  return pressureMap;
}

/**
 * Retrieve a previously generated pressure map (non-authoritative).
 */
export function getPressureMap(pressureMapId: string): NarrativePressureMap | undefined {
  return pressureMapStore.get(pressureMapId);
}

/**
 * Clear all pressure maps (for testing).
 */
export function clearPressureMaps(): void {
  pressureMapStore.clear();
}
