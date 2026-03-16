/**
 * AutonomousRenderPlanningAssist Tests
 *
 * Tests verifying:
 * - Generate plan succeeds, plan has authoritative = false
 * - Missing fields throw Error
 * - Session limit exceeded throws Error
 * - getPlans, getPlansByProject work
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AutonomousRenderPlanningAssist } from '../../src/intelligence/autonomous-render-planning-assist';

function validParams() {
  return {
    plan_type: 'resource_allocation' as const,
    agent_id: 'agent-001',
    capability_ref: 'cap-ref-001',
    provenance_binding_ref: 'prov-ref-001',
    source_project_id: 'proj-001',
    source_studio_id: 'studio-001',
    render_context: {
      frame_count: 2000,
      resolution: '1080p',
      codec: 'h264',
    },
  };
}

describe('AutonomousRenderPlanningAssist', () => {
  let planner: AutonomousRenderPlanningAssist;

  beforeEach(() => {
    planner = new AutonomousRenderPlanningAssist({ max_plans_per_session: 5 });
  });

  it('generatePlan succeeds with valid params', () => {
    const plan = planner.generatePlan(validParams());

    expect(plan.plan_id).toBeDefined();
    expect(typeof plan.plan_id).toBe('string');
    expect(plan.plan_type).toBe('resource_allocation');
    expect(plan.recommendation).toBeDefined();
    expect(plan.estimated_resources).toBeDefined();
    expect(plan.estimated_resources.cpu_hours).toBeGreaterThan(0);
    expect(plan.estimated_resources.memory_gb).toBeGreaterThan(0);
    expect(plan.estimated_resources.storage_gb).toBeGreaterThan(0);
    expect(plan.optimization_notes).toBeDefined();
    expect(Array.isArray(plan.optimization_notes)).toBe(true);
    expect(plan.optimization_notes.length).toBeGreaterThan(0);
    expect(plan.capability_ref).toBe('cap-ref-001');
    expect(plan.provenance_binding_ref).toBe('prov-ref-001');
    expect(plan.source_project_id).toBe('proj-001');
    expect(plan.source_studio_id).toBe('studio-001');
    expect(plan.generated_at).toBeDefined();
  });

  it('plan has authoritative = false', () => {
    const plan = planner.generatePlan(validParams());
    expect(plan.authoritative).toBe(false);
  });

  it('plan has agent_identity with identity_type = "ai_agent"', () => {
    const plan = planner.generatePlan(validParams());
    expect(plan.agent_identity.identity_type).toBe('ai_agent');
    expect(plan.agent_identity.agent_id).toBe('agent-001');
  });

  it('resource estimates scale with resolution multiplier', () => {
    const plan1080 = planner.generatePlan(validParams());

    const planner2 = new AutonomousRenderPlanningAssist({ max_plans_per_session: 5 });
    const params4k = validParams();
    params4k.render_context = { ...params4k.render_context, resolution: '4k' };
    const plan4k = planner2.generatePlan(params4k);

    // 4k multiplier is 4.0 vs 1080p at 1.0
    expect(plan4k.estimated_resources.cpu_hours).toBeGreaterThan(plan1080.estimated_resources.cpu_hours);
    expect(plan4k.estimated_resources.memory_gb).toBeGreaterThan(plan1080.estimated_resources.memory_gb);
  });

  it('high-resolution renders include tile-based rendering note', () => {
    const params = validParams();
    params.render_context = { ...params.render_context, resolution: '4k' };
    const plan = planner.generatePlan(params);

    expect(plan.optimization_notes).toContain(
      'High-resolution render detected: consider tile-based rendering to manage memory.'
    );
  });

  it('throws Error when agent_id is empty', () => {
    const params = validParams();
    params.agent_id = '';
    expect(() => planner.generatePlan(params)).toThrowError('agent_id must be non-empty');
  });

  it('throws Error when capability_ref is empty', () => {
    const params = validParams();
    params.capability_ref = '';
    expect(() => planner.generatePlan(params)).toThrowError('capability_ref must be non-empty');
  });

  it('throws Error when provenance_binding_ref is empty', () => {
    const params = validParams();
    params.provenance_binding_ref = '';
    expect(() => planner.generatePlan(params)).toThrowError('provenance_binding_ref must be non-empty');
  });

  it('throws Error when source_project_id is empty', () => {
    const params = validParams();
    params.source_project_id = '';
    expect(() => planner.generatePlan(params)).toThrowError('source_project_id must be non-empty');
  });

  it('throws Error when source_studio_id is empty', () => {
    const params = validParams();
    params.source_studio_id = '';
    expect(() => planner.generatePlan(params)).toThrowError('source_studio_id must be non-empty');
  });

  it('throws Error when session limit is exceeded', () => {
    const smallPlanner = new AutonomousRenderPlanningAssist({ max_plans_per_session: 2 });
    smallPlanner.generatePlan(validParams());
    smallPlanner.generatePlan(validParams());

    expect(() => smallPlanner.generatePlan(validParams())).toThrowError(
      'Session limit reached: max 2 plans per session'
    );
  });

  it('getPlans returns all generated plans', () => {
    expect(planner.getPlans()).toHaveLength(0);
    planner.generatePlan(validParams());
    planner.generatePlan({ ...validParams(), plan_type: 'quality_optimization' });
    expect(planner.getPlans()).toHaveLength(2);
  });

  it('getPlans returns a copy, not the internal array', () => {
    planner.generatePlan(validParams());
    const plans = planner.getPlans();
    plans.pop();
    expect(planner.getPlans()).toHaveLength(1);
  });

  it('getPlansByProject filters by source_project_id', () => {
    planner.generatePlan(validParams());
    planner.generatePlan({ ...validParams(), source_project_id: 'proj-002' });
    planner.generatePlan({ ...validParams(), source_project_id: 'proj-002' });

    expect(planner.getPlansByProject('proj-001')).toHaveLength(1);
    expect(planner.getPlansByProject('proj-002')).toHaveLength(2);
    expect(planner.getPlansByProject('proj-999')).toHaveLength(0);
  });

  it('getPlansGenerated returns count', () => {
    expect(planner.getPlansGenerated()).toBe(0);
    planner.generatePlan(validParams());
    expect(planner.getPlansGenerated()).toBe(1);
  });
});
