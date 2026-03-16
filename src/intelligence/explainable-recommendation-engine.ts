/**
 * ExplainableRecommendationEngine
 * CINEOS Intelligence — Wave 9 (Autonomous Studio)
 *
 * Generates explainable, non-authoritative recommendations with full
 * reasoning chains, agent identity, capability refs, and provenance binding.
 */

import { randomUUID } from 'crypto';

export interface ReasoningStep {
  step_number: number;
  reasoning_text: string;
  evidence_refs: string[];
}

export interface ExplainableRecommendation {
  trace_id: string;
  recommendation_type: 'qc_suggestion' | 'render_optimization' | 'editorial_insight' | 'self_optimization_hint';
  agent_identity: { agent_id: string; identity_type: 'ai_agent' };
  reasoning_chain: ReasoningStep[];
  recommendation_output: Record<string, unknown>;
  authoritative: false;
  capability_ref: string;
  provenance_binding_ref: string;
  confidence_score: number;
  source_project_id: string;
  source_studio_id: string;
  generated_at: string;
}

export class ExplainableRecommendationEngine {
  private traces: ExplainableRecommendation[] = [];

  generateRecommendation(params: {
    recommendation_type: ExplainableRecommendation['recommendation_type'];
    agent_id: string;
    capability_ref: string;
    provenance_binding_ref: string;
    reasoning_steps: Array<{ text: string; evidence_refs: string[] }>;
    output: Record<string, unknown>;
    confidence: number;
    source_project_id: string;
    source_studio_id: string;
  }): ExplainableRecommendation {
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
    if (params.confidence < 0 || params.confidence > 1) {
      throw new Error('confidence must be between 0 and 1');
    }
    if (!params.reasoning_steps || params.reasoning_steps.length < 1) {
      throw new Error('reasoning_steps must contain at least one step');
    }

    const reasoning_chain: ReasoningStep[] = params.reasoning_steps.map(
      (step, index) => ({
        step_number: index + 1,
        reasoning_text: step.text,
        evidence_refs: step.evidence_refs,
      })
    );

    const recommendation: ExplainableRecommendation = {
      trace_id: randomUUID(),
      recommendation_type: params.recommendation_type,
      agent_identity: { agent_id: params.agent_id, identity_type: 'ai_agent' },
      reasoning_chain,
      recommendation_output: params.output,
      authoritative: false,
      capability_ref: params.capability_ref,
      provenance_binding_ref: params.provenance_binding_ref,
      confidence_score: params.confidence,
      source_project_id: params.source_project_id,
      source_studio_id: params.source_studio_id,
      generated_at: new Date().toISOString(),
    };

    this.traces.push(recommendation);
    return recommendation;
  }

  getTraces(): ExplainableRecommendation[] {
    return [...this.traces];
  }

  getTracesByType(type: string): ExplainableRecommendation[] {
    return this.traces.filter((t) => t.recommendation_type === type);
  }

  getTracesByProject(project_id: string): ExplainableRecommendation[] {
    return this.traces.filter((t) => t.source_project_id === project_id);
  }
}
