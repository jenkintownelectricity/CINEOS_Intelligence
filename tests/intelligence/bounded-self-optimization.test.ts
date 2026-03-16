/**
 * BoundedSelfOptimization Tests
 *
 * Tests verifying:
 * - Suggest with valid params in range succeeds, authoritative = false
 * - Suggested value outside bounded_range throws Error (critical!)
 * - Missing fields throw Error
 * - Session limit exceeded throws Error
 * - getSuggestions, getSuggestionsByType work
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BoundedSelfOptimization } from '../../src/intelligence/bounded-self-optimization';

function validParams() {
  return {
    optimization_type: 'parameter_tuning' as const,
    agent_id: 'agent-001',
    capability_ref: 'cap-ref-001',
    provenance_binding_ref: 'prov-ref-001',
    source_project_id: 'proj-001',
    source_studio_id: 'studio-001',
    current_value: 0.5,
    suggested_value: 0.7,
    bounded_range: { min: 0.0, max: 1.0 },
    expected_improvement: 'Reduce latency by 15%',
  };
}

describe('BoundedSelfOptimization', () => {
  let optimizer: BoundedSelfOptimization;

  beforeEach(() => {
    optimizer = new BoundedSelfOptimization({ max_suggestions_per_session: 5 });
  });

  it('suggest succeeds with valid params within range', () => {
    const suggestion = optimizer.suggest(validParams());

    expect(suggestion.suggestion_id).toBeDefined();
    expect(typeof suggestion.suggestion_id).toBe('string');
    expect(suggestion.optimization_type).toBe('parameter_tuning');
    expect(suggestion.current_value).toBe(0.5);
    expect(suggestion.suggested_value).toBe(0.7);
    expect(suggestion.expected_improvement).toBe('Reduce latency by 15%');
    expect(suggestion.bounded_range).toEqual({ min: 0.0, max: 1.0 });
    expect(suggestion.capability_ref).toBe('cap-ref-001');
    expect(suggestion.provenance_binding_ref).toBe('prov-ref-001');
    expect(suggestion.source_project_id).toBe('proj-001');
    expect(suggestion.source_studio_id).toBe('studio-001');
    expect(suggestion.generated_at).toBeDefined();
  });

  it('suggestion has authoritative = false', () => {
    const suggestion = optimizer.suggest(validParams());
    expect(suggestion.authoritative).toBe(false);
  });

  it('suggestion has agent_identity with identity_type = "ai_agent"', () => {
    const suggestion = optimizer.suggest(validParams());
    expect(suggestion.agent_identity.identity_type).toBe('ai_agent');
    expect(suggestion.agent_identity.agent_id).toBe('agent-001');
  });

  it('allows suggested_value at boundary min', () => {
    const params = validParams();
    params.suggested_value = 0.0;
    expect(() => optimizer.suggest(params)).not.toThrow();
  });

  it('allows suggested_value at boundary max', () => {
    const params = validParams();
    params.suggested_value = 1.0;
    expect(() => optimizer.suggest(params)).not.toThrow();
  });

  it('throws Error when suggested_value is above bounded_range max (critical)', () => {
    const params = validParams();
    params.suggested_value = 1.5;
    expect(() => optimizer.suggest(params)).toThrowError(
      'suggested_value 1.5 is outside bounded_range [0, 1]'
    );
  });

  it('throws Error when suggested_value is below bounded_range min (critical)', () => {
    const params = validParams();
    params.suggested_value = -0.1;
    expect(() => optimizer.suggest(params)).toThrowError(
      'suggested_value -0.1 is outside bounded_range [0, 1]'
    );
  });

  it('throws Error when bounded_range.min exceeds bounded_range.max', () => {
    const params = validParams();
    params.bounded_range = { min: 10, max: 5 };
    params.suggested_value = 7;
    expect(() => optimizer.suggest(params)).toThrowError(
      'bounded_range.min must not exceed bounded_range.max'
    );
  });

  it('throws Error when agent_id is empty', () => {
    const params = validParams();
    params.agent_id = '';
    expect(() => optimizer.suggest(params)).toThrowError('agent_id must be non-empty');
  });

  it('throws Error when capability_ref is empty', () => {
    const params = validParams();
    params.capability_ref = '';
    expect(() => optimizer.suggest(params)).toThrowError('capability_ref must be non-empty');
  });

  it('throws Error when provenance_binding_ref is empty', () => {
    const params = validParams();
    params.provenance_binding_ref = '';
    expect(() => optimizer.suggest(params)).toThrowError('provenance_binding_ref must be non-empty');
  });

  it('throws Error when source_project_id is empty', () => {
    const params = validParams();
    params.source_project_id = '';
    expect(() => optimizer.suggest(params)).toThrowError('source_project_id must be non-empty');
  });

  it('throws Error when source_studio_id is empty', () => {
    const params = validParams();
    params.source_studio_id = '';
    expect(() => optimizer.suggest(params)).toThrowError('source_studio_id must be non-empty');
  });

  it('throws Error when expected_improvement is empty', () => {
    const params = validParams();
    params.expected_improvement = '';
    expect(() => optimizer.suggest(params)).toThrowError('expected_improvement must be non-empty');
  });

  it('throws Error when session limit is exceeded', () => {
    const smallOptimizer = new BoundedSelfOptimization({ max_suggestions_per_session: 2 });
    smallOptimizer.suggest(validParams());
    smallOptimizer.suggest(validParams());

    expect(() => smallOptimizer.suggest(validParams())).toThrowError(
      'Session limit reached: max 2 suggestions per session'
    );
  });

  it('getSuggestions returns all suggestions', () => {
    expect(optimizer.getSuggestions()).toHaveLength(0);
    optimizer.suggest(validParams());
    optimizer.suggest(validParams());
    expect(optimizer.getSuggestions()).toHaveLength(2);
  });

  it('getSuggestions returns a copy, not the internal array', () => {
    optimizer.suggest(validParams());
    const suggestions = optimizer.getSuggestions();
    suggestions.pop();
    expect(optimizer.getSuggestions()).toHaveLength(1);
  });

  it('getSuggestionsByType filters by optimization_type', () => {
    optimizer.suggest(validParams());
    optimizer.suggest({ ...validParams(), optimization_type: 'threshold_adjustment' });
    optimizer.suggest({ ...validParams(), optimization_type: 'cache_policy' });

    expect(optimizer.getSuggestionsByType('parameter_tuning')).toHaveLength(1);
    expect(optimizer.getSuggestionsByType('threshold_adjustment')).toHaveLength(1);
    expect(optimizer.getSuggestionsByType('cache_policy')).toHaveLength(1);
    expect(optimizer.getSuggestionsByType('nonexistent')).toHaveLength(0);
  });

  it('getSuggestionsGenerated returns count', () => {
    expect(optimizer.getSuggestionsGenerated()).toBe(0);
    optimizer.suggest(validParams());
    expect(optimizer.getSuggestionsGenerated()).toBe(1);
  });
});
