/**
 * Suggestion Engine Tests
 *
 * 7 tests verifying:
 * - Suggestion links to reasoning_record
 * - Accept flows through decision_outcome
 * - Reject records in CDG
 * - No suggestion becomes canonical truth directly
 * - Event emission
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateSuggestion,
  acceptSuggestion,
  rejectSuggestion,
  getSuggestions,
  getReasoningRecord,
  getDecisionOutcome,
  clearSuggestions,
  type EventSpineEmitter,
} from '../../src/intelligence/suggestion-engine';
import type { IntelligenceEvent } from '../../src/intelligence/creative-dna-analyzer';

// --- Test helpers ---

function createTestSpine(): EventSpineEmitter & { events: IntelligenceEvent[] } {
  return { events: [], emit(event: IntelligenceEvent) { this.events.push(event); } };
}

describe('SuggestionEngine', () => {
  beforeEach(() => {
    clearSuggestions();
  });

  it('suggestion links to reasoning_record', () => {
    const spine = createTestSpine();
    const suggestion = generateSuggestion('ana-001', 'timeline_mutation', 'tm-001', {}, spine);

    expect(suggestion.rationale_reasoning_record_id).toBeDefined();
    expect(suggestion.rationale_reasoning_record_id.length).toBeGreaterThan(0);

    const record = getReasoningRecord(suggestion.rationale_reasoning_record_id);
    expect(record).toBeDefined();
    expect(record!.reasoning_type).toBe('intelligence_suggestion_rationale');
  });

  it('accept flows through decision_outcome', () => {
    const spine = createTestSpine();
    const suggestion = generateSuggestion('ana-002', 'timeline_mutation', 'tm-002', {}, spine);
    const outcome = acceptSuggestion(suggestion.suggestion_id, spine);

    expect(outcome.decision_outcome_id).toBeDefined();
    expect(outcome.outcome).toBe('accepted');
    expect(outcome.suggestion_id).toBe(suggestion.suggestion_id);
    expect(outcome.reasoning_record_id).toBe(suggestion.rationale_reasoning_record_id);

    const retrieved = getDecisionOutcome(outcome.decision_outcome_id);
    expect(retrieved).toBeDefined();
  });

  it('reject records in CDG', () => {
    const spine = createTestSpine();
    const suggestion = generateSuggestion('ana-003', 'review_packet', 'rp-001', {}, spine);
    const outcome = rejectSuggestion(suggestion.suggestion_id, spine);

    expect(outcome.outcome).toBe('rejected');
    expect(outcome.suggestion_id).toBe(suggestion.suggestion_id);

    // Verify suggestion status updated
    const suggestions = getSuggestions({ status: 'rejected' });
    expect(suggestions.length).toBe(1);
  });

  it('suggestion starts as proposed (not canonical truth)', () => {
    const spine = createTestSpine();
    const suggestion = generateSuggestion('ana-004', 'timeline_mutation', 'tm-003', {}, spine);

    expect(suggestion.status).toBe('proposed');
    // Proposed = not canonical truth, must flow through CDG decision_outcome to take effect
  });

  it('cannot accept/reject non-proposed suggestion', () => {
    const spine = createTestSpine();
    const suggestion = generateSuggestion('ana-005', 'timeline_mutation', 'tm-004', {}, spine);
    acceptSuggestion(suggestion.suggestion_id, spine);

    expect(() => {
      acceptSuggestion(suggestion.suggestion_id, spine);
    }).toThrow();
  });

  it('emits event on suggestion generation', () => {
    const spine = createTestSpine();
    generateSuggestion('ana-006', 'timeline_mutation', 'tm-005', {}, spine);

    expect(spine.events.length).toBe(1);
    const event = spine.events[0];
    expect(event.event_class).toBe('intelligence_event');
    expect(event.source_subsystem).toBe('suggestion_engine');
    expect(event.payload.action).toBe('suggestion_generated');
  });

  it('emits event on accept', () => {
    const spine = createTestSpine();
    const suggestion = generateSuggestion('ana-007', 'timeline_mutation', 'tm-006', {}, spine);
    spine.events.length = 0;

    acceptSuggestion(suggestion.suggestion_id, spine);

    expect(spine.events.length).toBe(1);
    expect(spine.events[0].payload.action).toBe('suggestion_accepted');
    expect(spine.events[0].payload.decision_outcome_id).toBeDefined();
  });
});
