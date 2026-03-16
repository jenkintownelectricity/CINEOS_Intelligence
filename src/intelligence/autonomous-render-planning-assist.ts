/**
 * AutonomousRenderPlanningAssist
 * CINEOS Intelligence — Wave 9 (Autonomous Studio)
 *
 * Generates non-authoritative render planning recommendations with
 * resource estimation and optimization suggestions.
 */

import { randomUUID } from 'crypto';

export interface ResourceEstimate {
  cpu_hours: number;
  memory_gb: number;
  storage_gb: number;
}

export interface RenderPlanRecommendation {
  plan_id: string;
  plan_type: 'resource_allocation' | 'quality_optimization' | 'timeline_scheduling' | 'batch_prioritization';
  recommendation: Record<string, unknown>;
  estimated_resources: ResourceEstimate;
  optimization_notes: string[];
  authoritative: false;
  agent_identity: { agent_id: string; identity_type: 'ai_agent' };
  capability_ref: string;
  provenance_binding_ref: string;
  source_project_id: string;
  source_studio_id: string;
  generated_at: string;
}

export class AutonomousRenderPlanningAssist {
  private plans: RenderPlanRecommendation[] = [];
  private readonly maxPlansPerSession: number;

  constructor(config: { max_plans_per_session: number }) {
    this.maxPlansPerSession = config.max_plans_per_session;
  }

  generatePlan(params: {
    plan_type: RenderPlanRecommendation['plan_type'];
    agent_id: string;
    capability_ref: string;
    provenance_binding_ref: string;
    source_project_id: string;
    source_studio_id: string;
    render_context: Record<string, unknown>;
  }): RenderPlanRecommendation {
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
    if (this.plans.length >= this.maxPlansPerSession) {
      throw new Error(
        `Session limit reached: max ${this.maxPlansPerSession} plans per session`
      );
    }

    const estimated_resources = this.estimateResources(params.plan_type, params.render_context);
    const optimization_notes = this.generateOptimizationNotes(params.plan_type, params.render_context);
    const recommendation = this.buildRecommendation(params.plan_type, params.render_context);

    const plan: RenderPlanRecommendation = {
      plan_id: randomUUID(),
      plan_type: params.plan_type,
      recommendation,
      estimated_resources,
      optimization_notes,
      authoritative: false,
      agent_identity: { agent_id: params.agent_id, identity_type: 'ai_agent' },
      capability_ref: params.capability_ref,
      provenance_binding_ref: params.provenance_binding_ref,
      source_project_id: params.source_project_id,
      source_studio_id: params.source_studio_id,
      generated_at: new Date().toISOString(),
    };

    this.plans.push(plan);
    return plan;
  }

  getPlans(): RenderPlanRecommendation[] {
    return [...this.plans];
  }

  getPlansByProject(project_id: string): RenderPlanRecommendation[] {
    return this.plans.filter((p) => p.source_project_id === project_id);
  }

  getPlansGenerated(): number {
    return this.plans.length;
  }

  private estimateResources(
    plan_type: RenderPlanRecommendation['plan_type'],
    render_context: Record<string, unknown>
  ): ResourceEstimate {
    const frameCount = typeof render_context.frame_count === 'number' ? render_context.frame_count : 1000;
    const resolution = typeof render_context.resolution === 'string' ? render_context.resolution : '1080p';

    const resolutionMultiplier: Record<string, number> = {
      '720p': 0.5,
      '1080p': 1.0,
      '2k': 1.5,
      '4k': 4.0,
      '8k': 16.0,
    };
    const multiplier = resolutionMultiplier[resolution] ?? 1.0;

    const baseEstimates: Record<string, ResourceEstimate> = {
      resource_allocation: { cpu_hours: 10, memory_gb: 16, storage_gb: 50 },
      quality_optimization: { cpu_hours: 20, memory_gb: 32, storage_gb: 100 },
      timeline_scheduling: { cpu_hours: 5, memory_gb: 8, storage_gb: 25 },
      batch_prioritization: { cpu_hours: 15, memory_gb: 24, storage_gb: 75 },
    };

    const base = baseEstimates[plan_type] || baseEstimates.resource_allocation;
    const frameScale = frameCount / 1000;

    return {
      cpu_hours: Math.round(base.cpu_hours * multiplier * frameScale * 100) / 100,
      memory_gb: Math.round(base.memory_gb * multiplier * 100) / 100,
      storage_gb: Math.round(base.storage_gb * multiplier * frameScale * 100) / 100,
    };
  }

  private generateOptimizationNotes(
    plan_type: RenderPlanRecommendation['plan_type'],
    render_context: Record<string, unknown>
  ): string[] {
    const notes: string[] = [];

    const notesMap: Record<string, string[]> = {
      resource_allocation: [
        'Consider distributing render tasks across available nodes for parallel processing.',
        'Monitor memory usage to avoid swap thrashing on high-resolution frames.',
      ],
      quality_optimization: [
        'Adaptive sampling can reduce render time by 20-40% with minimal quality impact.',
        'Consider denoising passes for noise-heavy scenes to reduce sample counts.',
      ],
      timeline_scheduling: [
        'Schedule heavy renders during off-peak hours to maximize throughput.',
        'Prioritize preview renders before final quality passes.',
      ],
      batch_prioritization: [
        'Group similar scenes for batch rendering to leverage cached assets.',
        'Prioritize hero shots and client-facing deliverables.',
      ],
    };

    notes.push(...(notesMap[plan_type] || []));

    if (render_context.resolution === '4k' || render_context.resolution === '8k') {
      notes.push('High-resolution render detected: consider tile-based rendering to manage memory.');
    }

    return notes;
  }

  private buildRecommendation(
    plan_type: RenderPlanRecommendation['plan_type'],
    render_context: Record<string, unknown>
  ): Record<string, unknown> {
    return {
      plan_type,
      strategy: `Deterministic ${plan_type} strategy based on provided render context.`,
      input_context_keys: Object.keys(render_context),
      generated_by: 'autonomous_render_planning_assist',
    };
  }
}
