/**
 * Suggestion Engine
 *
 * Generates intelligence-driven suggestions that flow through CDG decision_outcome.
 * Suggestions NEVER become canonical truth directly.
 * All actions emit intelligence_event via Event Spine.
 *
 * Classification: rule-based suggestion, not ML recommendation.
 */

import { generateId, IntelligenceEvent, EventSpineEmitter, InMemoryEventSpine } from './creative-dna-analyzer';

// --- Types ---

export type SuggestionType = 'editorial_action' | 'review_focus' | 'pacing_adjustment' | 'continuity_fix';
export type SuggestionStatus = 'proposed' | 'accepted' | 'rejected' | 'expired';

export interface DerivedFrom {
  analysis_ids: string[];
  knowledge_graph_node_ids: string[];
}

export interface IntelligenceSuggestion {
  suggestion_id: string;
  suggestion_type: SuggestionType;
  target_entity_type: string;
  target_entity_id: string;
  rationale_reasoning_record_id: string;
  confidence: number;
  actionable: boolean;
  derived_from: DerivedFrom;
  created_at: string;
  status: SuggestionStatus;
}

export interface ReasoningRecord {
  reasoning_record_id: string;
  reasoning_type: string;
  inputs: Record<string, unknown>;
  conclusion: string;
  created_at: string;
}

export interface DecisionOutcome {
  decision_outcome_id: string;
  suggestion_id: string;
  outcome: 'accepted' | 'rejected';
  reasoning_record_id: string;
  decided_at: string;
}

// --- Stores ---

const suggestionStore = new Map<string, IntelligenceSuggestion>();
const reasoningRecordStore = new Map<string, ReasoningRecord>();
const decisionOutcomeStore = new Map<string, DecisionOutcome>();

// --- Event emission ---

function emitSuggestionEvent(
  spine: EventSpineEmitter,
  sourceObjectId: string,
  cdgIds: string[],
  payload: Record<string, unknown>,
): void {
  const event: IntelligenceEvent = {
    event_id: generateId(),
    event_class: 'intelligence_event',
    source_subsystem: 'suggestion_engine',
    source_object_id: sourceObjectId,
    related_cdg_object_ids: cdgIds,
    payload,
    status: 'emitted',
    emitted_at: new Date().toISOString(),
    actor_ref: 'suggestion-engine-v1',
    correlation_id: generateId(),
    causality_ref: null,
    replayable_flag: true,
  };
  spine.emit(event);
}

// --- CDG integration ---

function createReasoningRecord(analysisId: string, conclusion: string): ReasoningRecord {
  const record: ReasoningRecord = {
    reasoning_record_id: generateId(),
    reasoning_type: 'intelligence_suggestion_rationale',
    inputs: { analysis_id: analysisId },
    conclusion,
    created_at: new Date().toISOString(),
  };
  reasoningRecordStore.set(record.reasoning_record_id, record);
  return record;
}

function createDecisionOutcome(
  suggestionId: string,
  outcome: 'accepted' | 'rejected',
  reasoningRecordId: string,
): DecisionOutcome {
  const decision: DecisionOutcome = {
    decision_outcome_id: generateId(),
    suggestion_id: suggestionId,
    outcome,
    reasoning_record_id: reasoningRecordId,
    decided_at: new Date().toISOString(),
  };
  decisionOutcomeStore.set(decision.decision_outcome_id, decision);
  return decision;
}

// --- Public API ---

/**
 * Generate a suggestion linked to a CDG reasoning_record.
 * Suggestion is proposed, not canonical — must flow through decision_outcome.
 */
export function generateSuggestion(
  analysisId: string,
  targetEntityType: string,
  targetEntityId: string,
  options: {
    suggestionType?: SuggestionType;
    confidence?: number;
    knowledgeGraphNodeIds?: string[];
  } = {},
  spine: EventSpineEmitter = InMemoryEventSpine,
): IntelligenceSuggestion {
  const {
    suggestionType = 'editorial_action',
    confidence = 0.7,
    knowledgeGraphNodeIds = [],
  } = options;

  // Create CDG reasoning_record for rationale
  const reasoningRecord = createReasoningRecord(
    analysisId,
    `Intelligence analysis ${analysisId} suggests ${suggestionType} on ${targetEntityType}:${targetEntityId}`,
  );

  const suggestion: IntelligenceSuggestion = {
    suggestion_id: generateId(),
    suggestion_type: suggestionType,
    target_entity_type: targetEntityType,
    target_entity_id: targetEntityId,
    rationale_reasoning_record_id: reasoningRecord.reasoning_record_id,
    confidence,
    actionable: true,
    derived_from: {
      analysis_ids: [analysisId],
      knowledge_graph_node_ids: knowledgeGraphNodeIds,
    },
    created_at: new Date().toISOString(),
    status: 'proposed',
  };

  suggestionStore.set(suggestion.suggestion_id, suggestion);

  emitSuggestionEvent(spine, suggestion.suggestion_id, [targetEntityId, reasoningRecord.reasoning_record_id], {
    action: 'suggestion_generated',
    suggestion_type: suggestionType,
    confidence,
  });

  return suggestion;
}

/**
 * Accept a suggestion. Flows through CDG as decision_outcome entity.
 */
export function acceptSuggestion(
  suggestionId: string,
  spine: EventSpineEmitter = InMemoryEventSpine,
): DecisionOutcome {
  const suggestion = suggestionStore.get(suggestionId);
  if (!suggestion) {
    throw new Error(`Suggestion not found: ${suggestionId}`);
  }
  if (suggestion.status !== 'proposed') {
    throw new Error(`Suggestion ${suggestionId} is not in proposed status (current: ${suggestion.status})`);
  }

  suggestion.status = 'accepted';

  const outcome = createDecisionOutcome(suggestionId, 'accepted', suggestion.rationale_reasoning_record_id);

  emitSuggestionEvent(spine, suggestionId, [outcome.decision_outcome_id, suggestion.rationale_reasoning_record_id], {
    action: 'suggestion_accepted',
    decision_outcome_id: outcome.decision_outcome_id,
  });

  return outcome;
}

/**
 * Reject a suggestion. Records rejection in CDG as decision_outcome entity.
 */
export function rejectSuggestion(
  suggestionId: string,
  spine: EventSpineEmitter = InMemoryEventSpine,
): DecisionOutcome {
  const suggestion = suggestionStore.get(suggestionId);
  if (!suggestion) {
    throw new Error(`Suggestion not found: ${suggestionId}`);
  }
  if (suggestion.status !== 'proposed') {
    throw new Error(`Suggestion ${suggestionId} is not in proposed status (current: ${suggestion.status})`);
  }

  suggestion.status = 'rejected';

  const outcome = createDecisionOutcome(suggestionId, 'rejected', suggestion.rationale_reasoning_record_id);

  emitSuggestionEvent(spine, suggestionId, [outcome.decision_outcome_id, suggestion.rationale_reasoning_record_id], {
    action: 'suggestion_rejected',
    decision_outcome_id: outcome.decision_outcome_id,
  });

  return outcome;
}

/**
 * Retrieve suggestions with optional filtering.
 */
export function getSuggestions(filters?: {
  status?: SuggestionStatus;
  targetEntityType?: string;
  targetEntityId?: string;
}): IntelligenceSuggestion[] {
  let results = Array.from(suggestionStore.values());

  if (filters?.status) {
    results = results.filter((s) => s.status === filters.status);
  }
  if (filters?.targetEntityType) {
    results = results.filter((s) => s.target_entity_type === filters.targetEntityType);
  }
  if (filters?.targetEntityId) {
    results = results.filter((s) => s.target_entity_id === filters.targetEntityId);
  }

  return results;
}

/**
 * Get a reasoning record by ID.
 */
export function getReasoningRecord(recordId: string): ReasoningRecord | undefined {
  return reasoningRecordStore.get(recordId);
}

/**
 * Get a decision outcome by ID.
 */
export function getDecisionOutcome(outcomeId: string): DecisionOutcome | undefined {
  return decisionOutcomeStore.get(outcomeId);
}

/**
 * Clear all stores (for testing).
 */
export function clearSuggestions(): void {
  suggestionStore.clear();
  reasoningRecordStore.clear();
  decisionOutcomeStore.clear();
}
