/**
 * AutonomousQCAssist
 * CINEOS Intelligence — Wave 9 (Autonomous Studio)
 *
 * Provides bounded, non-authoritative QC assistance. Analyzes project
 * artifacts and generates QC suggestions as proposals.
 */

import { randomUUID } from 'crypto';

export interface QCFinding {
  finding_id: string;
  severity: 'info' | 'warning' | 'error';
  description: string;
  evidence_ref: string;
}

export interface QCCheckResult {
  check_id: string;
  check_type: 'continuity_check' | 'technical_quality' | 'narrative_consistency' | 'audio_sync' | 'color_grade';
  findings: QCFinding[];
  suggestion: string;
  authoritative: false;
  agent_identity: { agent_id: string; identity_type: 'ai_agent' };
  capability_ref: string;
  provenance_binding_ref: string;
  source_project_id: string;
  source_studio_id: string;
  performed_at: string;
}

export class AutonomousQCAssist {
  private results: QCCheckResult[] = [];
  private readonly maxChecksPerSession: number;

  constructor(config: { max_checks_per_session: number }) {
    this.maxChecksPerSession = config.max_checks_per_session;
  }

  performCheck(params: {
    check_type: QCCheckResult['check_type'];
    agent_id: string;
    capability_ref: string;
    provenance_binding_ref: string;
    source_project_id: string;
    source_studio_id: string;
    artifact_data: Record<string, unknown>;
  }): QCCheckResult {
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
    if (this.results.length >= this.maxChecksPerSession) {
      throw new Error(
        `Session limit reached: max ${this.maxChecksPerSession} checks per session`
      );
    }

    const findings = this.analyzeArtifact(params.check_type, params.artifact_data);
    const suggestion = this.generateSuggestion(params.check_type, findings);

    const result: QCCheckResult = {
      check_id: randomUUID(),
      check_type: params.check_type,
      findings,
      suggestion,
      authoritative: false,
      agent_identity: { agent_id: params.agent_id, identity_type: 'ai_agent' },
      capability_ref: params.capability_ref,
      provenance_binding_ref: params.provenance_binding_ref,
      source_project_id: params.source_project_id,
      source_studio_id: params.source_studio_id,
      performed_at: new Date().toISOString(),
    };

    this.results.push(result);
    return result;
  }

  getResults(): QCCheckResult[] {
    return [...this.results];
  }

  getResultsByProject(project_id: string): QCCheckResult[] {
    return this.results.filter((r) => r.source_project_id === project_id);
  }

  getChecksPerformed(): number {
    return this.results.length;
  }

  getMaxChecksPerSession(): number {
    return this.maxChecksPerSession;
  }

  private analyzeArtifact(
    check_type: QCCheckResult['check_type'],
    artifact_data: Record<string, unknown>
  ): QCFinding[] {
    const findings: QCFinding[] = [];

    const requiredFieldsMap: Record<string, string[]> = {
      continuity_check: ['scene_id', 'timeline', 'props', 'wardrobe'],
      technical_quality: ['resolution', 'bitrate', 'codec', 'frame_rate'],
      narrative_consistency: ['scene_id', 'dialogue', 'character_refs'],
      audio_sync: ['audio_track', 'video_track', 'sync_offset'],
      color_grade: ['lut_profile', 'exposure', 'white_balance'],
    };

    const requiredFields = requiredFieldsMap[check_type] || [];

    for (const field of requiredFields) {
      if (!(field in artifact_data)) {
        findings.push({
          finding_id: randomUUID(),
          severity: 'error',
          description: `Missing required field '${field}' for ${check_type}`,
          evidence_ref: `artifact_data.${field}`,
        });
      } else if (
        artifact_data[field] === null ||
        artifact_data[field] === undefined ||
        artifact_data[field] === ''
      ) {
        findings.push({
          finding_id: randomUUID(),
          severity: 'warning',
          description: `Field '${field}' is present but empty or null for ${check_type}`,
          evidence_ref: `artifact_data.${field}`,
        });
      }
    }

    if (findings.length === 0) {
      findings.push({
        finding_id: randomUUID(),
        severity: 'info',
        description: `All required fields present for ${check_type}`,
        evidence_ref: 'artifact_data',
      });
    }

    return findings;
  }

  private generateSuggestion(
    check_type: QCCheckResult['check_type'],
    findings: QCFinding[]
  ): string {
    const errorCount = findings.filter((f) => f.severity === 'error').length;
    const warningCount = findings.filter((f) => f.severity === 'warning').length;

    if (errorCount > 0) {
      return `${check_type}: ${errorCount} error(s) found. Address missing required fields before proceeding.`;
    }
    if (warningCount > 0) {
      return `${check_type}: ${warningCount} warning(s) found. Review empty or null fields for completeness.`;
    }
    return `${check_type}: All checks passed. No issues detected.`;
  }
}
