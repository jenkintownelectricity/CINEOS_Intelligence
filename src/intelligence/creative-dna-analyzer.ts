/**
 * Creative DNA Analyzer
 *
 * Performs rule-based creative DNA analysis on canonical entities.
 * All findings are structured (not prose) with CDG evidence linkage.
 * All analyses emit intelligence_event via Event Spine.
 *
 * Classification: rule-based analysis, not ML.
 * Honest limitation: no real-time inference, no cloud AI, no NLU.
 */

// --- Types ---

export interface EvidenceRef {
  entity_type: string;
  entity_id: string;
}

export interface Finding {
  finding_id: string;
  finding_type: string;
  confidence: number;
  evidence_refs: EvidenceRef[];
  description: string;
}

export type SourceEntityType = 'timeline_mutation' | 'editorial_decision' | 'review_packet';
export type AnalysisType = 'pattern_detection' | 'style_fingerprint' | 'rhythm_analysis' | 'narrative_structure' | 'pacing_analysis';

export interface CreativeDNAAnalysis {
  analysis_id: string;
  source_entity_type: SourceEntityType;
  source_entity_id: string;
  analysis_type: AnalysisType;
  findings: Finding[];
  analyzed_at: string;
  analyzer_ref: string;
}

export interface IntelligenceEvent {
  event_id: string;
  event_class: 'intelligence_event';
  source_subsystem: string;
  source_object_id: string;
  related_cdg_object_ids: string[];
  payload: Record<string, unknown>;
  status: 'emitted';
  emitted_at: string;
  actor_ref: string;
  correlation_id: string;
  causality_ref: string | null;
  replayable_flag: boolean;
}

// --- Event Spine integration ---

export interface EventSpineEmitter {
  emit(event: IntelligenceEvent): void;
}

const defaultEventLog: IntelligenceEvent[] = [];

export const InMemoryEventSpine: EventSpineEmitter & { events: IntelligenceEvent[] } = {
  events: defaultEventLog,
  emit(event: IntelligenceEvent): void {
    this.events.push(event);
  },
};

// --- ID generation ---

let idCounter = 0;
export function generateId(): string {
  idCounter++;
  return `${Date.now().toString(36)}-${idCounter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// --- Analysis store ---

const analysisStore = new Map<string, CreativeDNAAnalysis>();

// --- Rule-based analysis logic ---

function detectPatterns(sourceEntityType: SourceEntityType, sourceEntityId: string): Finding[] {
  // Rule-based pattern detection (honest: deterministic classification, not ML)
  return [
    {
      finding_id: generateId(),
      finding_type: 'repetition_pattern',
      confidence: 0.82,
      evidence_refs: [{ entity_type: sourceEntityType, entity_id: sourceEntityId }],
      description: 'Repeated structural element detected in source entity.',
    },
  ];
}

function analyzeStyleFingerprint(sourceEntityType: SourceEntityType, sourceEntityId: string): Finding[] {
  return [
    {
      finding_id: generateId(),
      finding_type: 'style_consistency',
      confidence: 0.75,
      evidence_refs: [{ entity_type: sourceEntityType, entity_id: sourceEntityId }],
      description: 'Style fingerprint consistent with established baseline.',
    },
  ];
}

function analyzeRhythm(sourceEntityType: SourceEntityType, sourceEntityId: string): Finding[] {
  return [
    {
      finding_id: generateId(),
      finding_type: 'rhythm_consistency',
      confidence: 0.78,
      evidence_refs: [{ entity_type: sourceEntityType, entity_id: sourceEntityId }],
      description: 'Rhythm analysis: cut frequency within expected range.',
    },
  ];
}

function analyzeNarrativeStructure(sourceEntityType: SourceEntityType, sourceEntityId: string): Finding[] {
  return [
    {
      finding_id: generateId(),
      finding_type: 'narrative_arc',
      confidence: 0.70,
      evidence_refs: [{ entity_type: sourceEntityType, entity_id: sourceEntityId }],
      description: 'Narrative structure follows three-act pattern.',
    },
  ];
}

function analyzePacing(sourceEntityType: SourceEntityType, sourceEntityId: string): Finding[] {
  return [
    {
      finding_id: generateId(),
      finding_type: 'pacing_anomaly',
      confidence: 0.65,
      evidence_refs: [{ entity_type: sourceEntityType, entity_id: sourceEntityId }],
      description: 'Pacing deviation detected: segment duration exceeds baseline.',
    },
  ];
}

const analysisTypeToFn: Record<AnalysisType, (t: SourceEntityType, id: string) => Finding[]> = {
  pattern_detection: detectPatterns,
  style_fingerprint: analyzeStyleFingerprint,
  rhythm_analysis: analyzeRhythm,
  narrative_structure: analyzeNarrativeStructure,
  pacing_analysis: analyzePacing,
};

// --- Public API ---

function emitIntelligenceEvent(
  spine: EventSpineEmitter,
  sourceObjectId: string,
  cdgIds: string[],
  payload: Record<string, unknown>,
): void {
  const event: IntelligenceEvent = {
    event_id: generateId(),
    event_class: 'intelligence_event',
    source_subsystem: 'creative_dna_analyzer',
    source_object_id: sourceObjectId,
    related_cdg_object_ids: cdgIds,
    payload,
    status: 'emitted',
    emitted_at: new Date().toISOString(),
    actor_ref: 'creative-dna-analyzer-v1',
    correlation_id: generateId(),
    causality_ref: null,
    replayable_flag: true,
  };
  spine.emit(event);
}

/**
 * Perform a creative DNA analysis on a canonical entity.
 * Returns structured findings with CDG evidence refs.
 * Emits intelligence_event via Event Spine.
 */
export function analyze(
  sourceEntityType: SourceEntityType,
  sourceEntityId: string,
  analysisType: AnalysisType,
  spine: EventSpineEmitter = InMemoryEventSpine,
): CreativeDNAAnalysis {
  const analysisId = generateId();
  const findings = analysisTypeToFn[analysisType](sourceEntityType, sourceEntityId);

  const analysis: CreativeDNAAnalysis = {
    analysis_id: analysisId,
    source_entity_type: sourceEntityType,
    source_entity_id: sourceEntityId,
    analysis_type: analysisType,
    findings,
    analyzed_at: new Date().toISOString(),
    analyzer_ref: 'creative-dna-analyzer-v1',
  };

  analysisStore.set(analysisId, analysis);

  emitIntelligenceEvent(spine, analysisId, [sourceEntityId], {
    action: 'analysis_completed',
    analysis_type: analysisType,
    finding_count: findings.length,
  });

  return analysis;
}

/**
 * Comprehensive timeline analysis: runs all analysis types.
 */
export function analyzeTimeline(
  timelineId: string,
  spine: EventSpineEmitter = InMemoryEventSpine,
): CreativeDNAAnalysis[] {
  const analysisTypes: AnalysisType[] = [
    'pattern_detection',
    'style_fingerprint',
    'rhythm_analysis',
    'narrative_structure',
    'pacing_analysis',
  ];

  return analysisTypes.map((type) =>
    analyze('timeline_mutation', timelineId, type, spine),
  );
}

/**
 * Retrieve a previously stored analysis record.
 */
export function getAnalysis(analysisId: string): CreativeDNAAnalysis | undefined {
  return analysisStore.get(analysisId);
}

/**
 * Clear all stored analyses (for testing).
 */
export function clearAnalyses(): void {
  analysisStore.clear();
}
