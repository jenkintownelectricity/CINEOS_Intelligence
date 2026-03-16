/**
 * AutonomousQCAssist Tests
 *
 * Tests verifying:
 * - Perform check succeeds, result has authoritative = false
 * - Missing fields throw Error
 * - Session limit exceeded throws Error
 * - getResults, getResultsByProject work
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AutonomousQCAssist } from '../../src/intelligence/autonomous-qc-assist';

function validParams() {
  return {
    check_type: 'continuity_check' as const,
    agent_id: 'agent-001',
    capability_ref: 'cap-ref-001',
    provenance_binding_ref: 'prov-ref-001',
    source_project_id: 'proj-001',
    source_studio_id: 'studio-001',
    artifact_data: {
      scene_id: 'sc-1',
      timeline: 'tl-1',
      props: ['chair', 'lamp'],
      wardrobe: ['jacket'],
    },
  };
}

describe('AutonomousQCAssist', () => {
  let qc: AutonomousQCAssist;

  beforeEach(() => {
    qc = new AutonomousQCAssist({ max_checks_per_session: 5 });
  });

  it('performCheck succeeds with valid params', () => {
    const result = qc.performCheck(validParams());

    expect(result.check_id).toBeDefined();
    expect(typeof result.check_id).toBe('string');
    expect(result.check_type).toBe('continuity_check');
    expect(result.findings).toBeDefined();
    expect(Array.isArray(result.findings)).toBe(true);
    expect(result.suggestion).toBeDefined();
    expect(result.capability_ref).toBe('cap-ref-001');
    expect(result.provenance_binding_ref).toBe('prov-ref-001');
    expect(result.source_project_id).toBe('proj-001');
    expect(result.source_studio_id).toBe('studio-001');
    expect(result.performed_at).toBeDefined();
  });

  it('result has authoritative = false', () => {
    const result = qc.performCheck(validParams());
    expect(result.authoritative).toBe(false);
  });

  it('result has agent_identity with identity_type = "ai_agent"', () => {
    const result = qc.performCheck(validParams());
    expect(result.agent_identity.identity_type).toBe('ai_agent');
    expect(result.agent_identity.agent_id).toBe('agent-001');
  });

  it('produces info finding when all required fields present', () => {
    const result = qc.performCheck(validParams());
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].severity).toBe('info');
    expect(result.suggestion).toContain('All checks passed');
  });

  it('produces error findings when required fields are missing', () => {
    const params = validParams();
    params.artifact_data = {}; // missing all required fields for continuity_check
    const result = qc.performCheck(params);

    const errorFindings = result.findings.filter((f) => f.severity === 'error');
    expect(errorFindings.length).toBeGreaterThan(0);
    expect(result.suggestion).toContain('error(s) found');
  });

  it('produces warning findings when fields are present but empty', () => {
    const params = validParams();
    params.artifact_data = {
      scene_id: '',
      timeline: 'tl-1',
      props: ['chair'],
      wardrobe: ['hat'],
    };
    const result = qc.performCheck(params);

    const warningFindings = result.findings.filter((f) => f.severity === 'warning');
    expect(warningFindings.length).toBeGreaterThan(0);
  });

  it('throws Error when agent_id is empty', () => {
    const params = validParams();
    params.agent_id = '';
    expect(() => qc.performCheck(params)).toThrowError('agent_id must be non-empty');
  });

  it('throws Error when capability_ref is empty', () => {
    const params = validParams();
    params.capability_ref = '';
    expect(() => qc.performCheck(params)).toThrowError('capability_ref must be non-empty');
  });

  it('throws Error when provenance_binding_ref is empty', () => {
    const params = validParams();
    params.provenance_binding_ref = '';
    expect(() => qc.performCheck(params)).toThrowError('provenance_binding_ref must be non-empty');
  });

  it('throws Error when source_project_id is empty', () => {
    const params = validParams();
    params.source_project_id = '';
    expect(() => qc.performCheck(params)).toThrowError('source_project_id must be non-empty');
  });

  it('throws Error when source_studio_id is empty', () => {
    const params = validParams();
    params.source_studio_id = '';
    expect(() => qc.performCheck(params)).toThrowError('source_studio_id must be non-empty');
  });

  it('throws Error when session limit is exceeded', () => {
    const smallQC = new AutonomousQCAssist({ max_checks_per_session: 2 });
    smallQC.performCheck(validParams());
    smallQC.performCheck(validParams());

    expect(() => smallQC.performCheck(validParams())).toThrowError(
      'Session limit reached: max 2 checks per session'
    );
  });

  it('getResults returns all results', () => {
    expect(qc.getResults()).toHaveLength(0);
    qc.performCheck(validParams());
    qc.performCheck(validParams());
    expect(qc.getResults()).toHaveLength(2);
  });

  it('getResults returns a copy, not the internal array', () => {
    qc.performCheck(validParams());
    const results = qc.getResults();
    results.pop();
    expect(qc.getResults()).toHaveLength(1);
  });

  it('getResultsByProject filters by source_project_id', () => {
    qc.performCheck(validParams());
    qc.performCheck({ ...validParams(), source_project_id: 'proj-002' });
    qc.performCheck({ ...validParams(), source_project_id: 'proj-002' });

    expect(qc.getResultsByProject('proj-001')).toHaveLength(1);
    expect(qc.getResultsByProject('proj-002')).toHaveLength(2);
    expect(qc.getResultsByProject('proj-999')).toHaveLength(0);
  });

  it('getChecksPerformed returns count', () => {
    expect(qc.getChecksPerformed()).toBe(0);
    qc.performCheck(validParams());
    expect(qc.getChecksPerformed()).toBe(1);
  });

  it('getMaxChecksPerSession returns configured limit', () => {
    expect(qc.getMaxChecksPerSession()).toBe(5);
  });
});
