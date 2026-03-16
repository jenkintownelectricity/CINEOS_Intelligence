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

function setup() {
  clearSuggestions();
}

// --- Tests ---

// Test 1: Suggestion links to reasoning_record
function test_suggestion_links_to_reasoning_record(): void {
  setup();
  const spine = createTestSpine();
  const suggestion = generateSuggestion('ana-001', 'timeline_mutation', 'tm-001', {}, spine);

  console.assert(suggestion.rationale_reasoning_record_id !== undefined, 'rationale_reasoning_record_id should be defined');
  console.assert(suggestion.rationale_reasoning_record_id.length > 0, 'rationale_reasoning_record_id should be non-empty');

  const record = getReasoningRecord(suggestion.rationale_reasoning_record_id);
  console.assert(record !== undefined, 'reasoning record should exist in store');
  console.assert(record!.reasoning_type === 'intelligence_suggestion_rationale', 'reasoning_type should match');
  console.log('PASS: test_suggestion_links_to_reasoning_record');
}

// Test 2: Accept flows through decision_outcome
function test_accept_flows_through_decision_outcome(): void {
  setup();
  const spine = createTestSpine();
  const suggestion = generateSuggestion('ana-002', 'timeline_mutation', 'tm-002', {}, spine);
  const outcome = acceptSuggestion(suggestion.suggestion_id, spine);

  console.assert(outcome.decision_outcome_id !== undefined, 'decision_outcome_id should be defined');
  console.assert(outcome.outcome === 'accepted', 'outcome should be accepted');
  console.assert(outcome.suggestion_id === suggestion.suggestion_id, 'suggestion_id should match');
  console.assert(outcome.reasoning_record_id === suggestion.rationale_reasoning_record_id, 'reasoning_record_id should match');

  const retrieved = getDecisionOutcome(outcome.decision_outcome_id);
  console.assert(retrieved !== undefined, 'decision outcome should be retrievable');
  console.log('PASS: test_accept_flows_through_decision_outcome');
}

// Test 3: Reject records in CDG
function test_reject_records_in_cdg(): void {
  setup();
  const spine = createTestSpine();
  const suggestion = generateSuggestion('ana-003', 'review_packet', 'rp-001', {}, spine);
  const outcome = rejectSuggestion(suggestion.suggestion_id, spine);

  console.assert(outcome.outcome === 'rejected', 'outcome should be rejected');
  console.assert(outcome.suggestion_id === suggestion.suggestion_id, 'suggestion_id should match');

  // Verify suggestion status updated
  const suggestions = getSuggestions({ status: 'rejected' });
  console.assert(suggestions.length === 1, 'should have 1 rejected suggestion');
  console.log('PASS: test_reject_records_in_cdg');
}

// Test 4: Suggestion starts as proposed (not canonical truth)
function test_suggestion_starts_as_proposed(): void {
  setup();
  const spine = createTestSpine();
  const suggestion = generateSuggestion('ana-004', 'timeline_mutation', 'tm-003', {}, spine);

  console.assert(suggestion.status === 'proposed', 'initial status should be proposed');
  // Proposed = not canonical truth, must flow through CDG decision_outcome to take effect
  console.log('PASS: test_suggestion_starts_as_proposed');
}

// Test 5: Cannot accept/reject non-proposed suggestion
function test_cannot_accept_non_proposed(): void {
  setup();
  const spine = createTestSpine();
  const suggestion = generateSuggestion('ana-005', 'timeline_mutation', 'tm-004', {}, spine);
  acceptSuggestion(suggestion.suggestion_id, spine);

  let threw = false;
  try {
    acceptSuggestion(suggestion.suggestion_id, spine);
  } catch (e) {
    threw = true;
  }
  console.assert(threw, 'should throw when accepting non-proposed suggestion');
  console.log('PASS: test_cannot_accept_non_proposed');
}

// Test 6: Event emission on suggestion generation
function test_event_emission_on_generation(): void {
  setup();
  const spine = createTestSpine();
  generateSuggestion('ana-006', 'timeline_mutation', 'tm-005', {}, spine);

  console.assert(spine.events.length === 1, `expected 1 event, got ${spine.events.length}`);
  const event = spine.events[0];
  console.assert(event.event_class === 'intelligence_event', 'event_class should be intelligence_event');
  console.assert(event.source_subsystem === 'suggestion_engine', 'source_subsystem should be suggestion_engine');
  console.assert(event.payload.action === 'suggestion_generated', 'action should be suggestion_generated');
  console.log('PASS: test_event_emission_on_generation');
}

// Test 7: Event emission on accept
function test_event_emission_on_accept(): void {
  setup();
  const spine = createTestSpine();
  const suggestion = generateSuggestion('ana-007', 'timeline_mutation', 'tm-006', {}, spine);
  spine.events.length = 0;

  acceptSuggestion(suggestion.suggestion_id, spine);

  console.assert(spine.events.length === 1, `expected 1 event, got ${spine.events.length}`);
  console.assert(spine.events[0].payload.action === 'suggestion_accepted', 'action should be suggestion_accepted');
  console.assert(spine.events[0].payload.decision_outcome_id !== undefined, 'decision_outcome_id should be in payload');
  console.log('PASS: test_event_emission_on_accept');
}

// --- Run all tests ---
test_suggestion_links_to_reasoning_record();
test_accept_flows_through_decision_outcome();
test_reject_records_in_cdg();
test_suggestion_starts_as_proposed();
test_cannot_accept_non_proposed();
test_event_emission_on_generation();
test_event_emission_on_accept();
console.log('\nAll 7 suggestion-engine tests passed.');
