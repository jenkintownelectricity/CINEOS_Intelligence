/**
 * BoundedSelfOptimization
 * CINEOS Intelligence — Wave 9 (Autonomous Studio)
 *
 * Bounded self-optimization surface. Agents can suggest parameter tuning
 * within declared bounds. All suggestions are non-authoritative proposals.
 * No unrestricted self-modification allowed.
 */

import { randomUUID } from 'crypto';

export interface OptimizationSuggestion {
  suggestion_id: string;
  optimization_type: 'parameter_tuning' | 'threshold_adjustment' | 'cache_policy' | 'query_optimization';
  current_value: unknown;
  suggested_value: unknown;
  expected_improvement: string;
  bounded_range: { min: number; max: number };
  authoritative: false;
  agent_identity: { agent_id: string; identity_type: 'ai_agent' };
  capability_ref: string;
  provenance_binding_ref: string;
  source_project_id: string;
  source_studio_id: string;
  generated_at: string;
}

export class BoundedSelfOptimization {
  private suggestions: OptimizationSuggestion[] = [];
  private readonly maxSuggestionsPerSession: number;

  constructor(config: { max_suggestions_per_session: number }) {
    this.maxSuggestionsPerSession = config.max_suggestions_per_session;
  }

  suggest(params: {
    optimization_type: OptimizationSuggestion['optimization_type'];
    agent_id: string;
    capability_ref: string;
    provenance_binding_ref: string;
    source_project_id: string;
    source_studio_id: string;
    current_value: unknown;
    suggested_value: number;
    bounded_range: { min: number; max: number };
    expected_improvement: string;
  }): OptimizationSuggestion {
    if (!params.agent_id) {
      throw new Error('agent_id must be non-empty');
    }
    if (!params.capability_ref) {
      throw new Error('capability_ref must be non-empty');
    }
    if (!params.provenance_binding_ref) {
      throw new Error('provenance_binding_ref must be non-empty');
    }
    if (!params.source_project_id) {
      throw new Error('source_project_id must be non-empty');
    }
    if (!params.source_studio_id) {
      throw new Error('source_studio_id must be non-empty');
    }
    if (!params.expected_improvement) {
      throw new Error('expected_improvement must be non-empty');
    }
    if (params.bounded_range.min > params.bounded_range.max) {
      throw new Error('bounded_range.min must not exceed bounded_range.max');
    }
    if (
      params.suggested_value < params.bounded_range.min ||
      params.suggested_value > params.bounded_range.max
    ) {
      throw new Error(
        `suggested_value ${params.suggested_value} is outside bounded_range [${params.bounded_range.min}, ${params.bounded_range.max}]`
      );
    }
    if (this.suggestions.length >= this.maxSuggestionsPerSession) {
      throw new Error(
        `Session limit reached: max ${this.maxSuggestionsPerSession} suggestions per session`
      );
    }

    const suggestion: OptimizationSuggestion = {
      suggestion_id: randomUUID(),
      optimization_type: params.optimization_type,
      current_value: params.current_value,
      suggested_value: params.suggested_value,
      expected_improvement: params.expected_improvement,
      bounded_range: { min: params.bounded_range.min, max: params.bounded_range.max },
      authoritative: false,
      agent_identity: { agent_id: params.agent_id, identity_type: 'ai_agent' },
      capability_ref: params.capability_ref,
      provenance_binding_ref: params.provenance_binding_ref,
      source_project_id: params.source_project_id,
      source_studio_id: params.source_studio_id,
      generated_at: new Date().toISOString(),
    };

    this.suggestions.push(suggestion);
    return suggestion;
  }

  getSuggestions(): OptimizationSuggestion[] {
    return [...this.suggestions];
  }

  getSuggestionsByType(type: string): OptimizationSuggestion[] {
    return this.suggestions.filter((s) => s.optimization_type === type);
  }

  getSuggestionsGenerated(): number {
    return this.suggestions.length;
  }
}
