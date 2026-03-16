/**
 * ExplainableRecommendationEngine Tests
 *
 * Tests verifying:
 * - Generate recommendation succeeds with valid params
 * - Output has authoritative = false, identity_type = 'ai_agent'
 * - Reasoning chain has correct step numbers
 * - Missing agent_id, capability_ref, provenance_binding_ref, source_project_id each throw Error
 * - Confidence outside 0-1 throws Error
 * - Empty reasoning_steps throws Error
 * - getTraces, getTracesByType, getTracesByProject work
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExplainableRecommendationEngine } from '../../src/intelligence/explainable-recommendation-engine';

function validParams() {
  return {
    recommendation_type: 'qc_suggestion' as const,
    agent_id: 'agent-001',
    capability_ref: 'cap-ref-001',
    provenance_binding_ref: 'prov-ref-001',
    reasoning_steps: [
      { text: 'Step one reasoning', evidence_refs: ['ev-1'] },
      { text: 'Step two reasoning', evidence_refs: ['ev-2', 'ev-3'] },
    ],
    output: { suggestion: 'Adjust exposure' },
    confidence: 0.85,
    source_project_id: 'proj-001',
    source_studio_id: 'studio-001',
  };
}

describe('ExplainableRecommendationEngine', () => {
  let engine: ExplainableRecommendationEngine;

  beforeEach(() => {
    engine = new ExplainableRecommendationEngine();
  });

  it('generates recommendation successfully with valid params', () => {
    const result = engine.generateRecommendation(validParams());

    expect(result.trace_id).toBeDefined();
    expect(typeof result.trace_id).toBe('string');
    expect(result.recommendation_type).toBe('qc_suggestion');
    expect(result.recommendation_output).toEqual({ suggestion: 'Adjust exposure' });
    expect(result.confidence_score).toBe(0.85);
    expect(result.source_project_id).toBe('proj-001');
    expect(result.source_studio_id).toBe('studio-001');
    expect(result.capability_ref).toBe('cap-ref-001');
    expect(result.provenance_binding_ref).toBe('prov-ref-001');
    expect(result.generated_at).toBeDefined();
  });

  it('output has authoritative = false', () => {
    const result = engine.generateRecommendation(validParams());
    expect(result.authoritative).toBe(false);
  });

  it('output has identity_type = "ai_agent"', () => {
    const result = engine.generateRecommendation(validParams());
    expect(result.agent_identity.identity_type).toBe('ai_agent');
    expect(result.agent_identity.agent_id).toBe('agent-001');
  });

  it('reasoning chain has correct step numbers starting at 1', () => {
    const result = engine.generateRecommendation(validParams());
    expect(result.reasoning_chain).toHaveLength(2);
    expect(result.reasoning_chain[0].step_number).toBe(1);
    expect(result.reasoning_chain[0].reasoning_text).toBe('Step one reasoning');
    expect(result.reasoning_chain[0].evidence_refs).toEqual(['ev-1']);
    expect(result.reasoning_chain[1].step_number).toBe(2);
    expect(result.reasoning_chain[1].reasoning_text).toBe('Step two reasoning');
    expect(result.reasoning_chain[1].evidence_refs).toEqual(['ev-2', 'ev-3']);
  });

  it('throws Error when agent_id is empty', () => {
    const params = validParams();
    params.agent_id = '';
    expect(() => engine.generateRecommendation(params)).toThrowError('agent_id must be non-empty');
  });

  it('throws Error when capability_ref is empty', () => {
    const params = validParams();
    params.capability_ref = '';
    expect(() => engine.generateRecommendation(params)).toThrowError('capability_ref must be non-empty');
  });

  it('throws Error when provenance_binding_ref is empty', () => {
    const params = validParams();
    params.provenance_binding_ref = '';
    expect(() => engine.generateRecommendation(params)).toThrowError('provenance_binding_ref must be non-empty');
  });

  it('throws Error when source_project_id is empty', () => {
    const params = validParams();
    params.source_project_id = '';
    expect(() => engine.generateRecommendation(params)).toThrowError('source_project_id must be non-empty');
  });

  it('throws Error when source_studio_id is empty', () => {
    const params = validParams();
    params.source_studio_id = '';
    expect(() => engine.generateRecommendation(params)).toThrowError('source_studio_id must be non-empty');
  });

  it('throws Error when confidence is greater than 1', () => {
    const params = validParams();
    params.confidence = 1.5;
    expect(() => engine.generateRecommendation(params)).toThrowError('confidence must be between 0 and 1');
  });

  it('throws Error when confidence is less than 0', () => {
    const params = validParams();
    params.confidence = -0.1;
    expect(() => engine.generateRecommendation(params)).toThrowError('confidence must be between 0 and 1');
  });

  it('allows confidence at boundary values 0 and 1', () => {
    const params0 = validParams();
    params0.confidence = 0;
    expect(() => engine.generateRecommendation(params0)).not.toThrow();

    const params1 = validParams();
    params1.confidence = 1;
    expect(() => engine.generateRecommendation(params1)).not.toThrow();
  });

  it('throws Error when reasoning_steps is empty', () => {
    const params = validParams();
    params.reasoning_steps = [];
    expect(() => engine.generateRecommendation(params)).toThrowError('reasoning_steps must contain at least one step');
  });

  it('getTraces returns all generated recommendations', () => {
    expect(engine.getTraces()).toHaveLength(0);

    engine.generateRecommendation(validParams());
    engine.generateRecommendation({ ...validParams(), recommendation_type: 'render_optimization' });

    const traces = engine.getTraces();
    expect(traces).toHaveLength(2);
    expect(traces[0].recommendation_type).toBe('qc_suggestion');
    expect(traces[1].recommendation_type).toBe('render_optimization');
  });

  it('getTraces returns a copy, not the internal array', () => {
    engine.generateRecommendation(validParams());
    const traces = engine.getTraces();
    traces.pop();
    expect(engine.getTraces()).toHaveLength(1);
  });

  it('getTracesByType filters by recommendation_type', () => {
    engine.generateRecommendation(validParams());
    engine.generateRecommendation({ ...validParams(), recommendation_type: 'render_optimization' });
    engine.generateRecommendation({ ...validParams(), recommendation_type: 'editorial_insight' });

    expect(engine.getTracesByType('qc_suggestion')).toHaveLength(1);
    expect(engine.getTracesByType('render_optimization')).toHaveLength(1);
    expect(engine.getTracesByType('editorial_insight')).toHaveLength(1);
    expect(engine.getTracesByType('nonexistent')).toHaveLength(0);
  });

  it('getTracesByProject filters by source_project_id', () => {
    engine.generateRecommendation(validParams());
    engine.generateRecommendation({ ...validParams(), source_project_id: 'proj-002' });
    engine.generateRecommendation({ ...validParams(), source_project_id: 'proj-002' });

    expect(engine.getTracesByProject('proj-001')).toHaveLength(1);
    expect(engine.getTracesByProject('proj-002')).toHaveLength(2);
    expect(engine.getTracesByProject('proj-999')).toHaveLength(0);
  });
});
