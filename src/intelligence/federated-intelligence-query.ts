/**
 * FederatedIntelligenceQueryService — Wave 8 Network Layer
 *
 * Enables cross-project intelligence sharing through federated queries.
 * All results are non-authoritative projections per KERN-CINEOS-NETWORK-FEDERATION.
 * No cross-project canonical writes. Fail-closed on validation failure.
 */

// ---- Types ----

export interface IntelligenceQueryRequest {
  query_id: string;
  requester_identity: string;
  capability_ref: string;
  studio_scope: string;
  entity_types: string[];
  query_kind: 'creative_dna' | 'knowledge_graph' | 'suggestion_feed' | 'narrative_pressure';
}

export interface IntelligenceQueryResult {
  query_id: string;
  authoritative: false;
  source_projects: Array<{
    project_id: string;
    entity_count: number;
    canonical_source: 'project_local_cdg';
  }>;
  results: IntelligenceResultEntry[];
  projection_timestamp: string;
  staleness_warning: boolean;
}

export interface IntelligenceResultEntry {
  source_project_id: string;
  entity_id: string;
  entity_type: string;
  data: Record<string, unknown>;
  provenance_ref: string | null;
}

export interface StudioIntelligenceSummary {
  studio_id: string;
  authoritative: false;
  projects_contributing: number;
  creative_dna_entries: number;
  generated_at: string;
}

export interface KnowledgeGraphProjection {
  studio_id: string;
  authoritative: false;
  nodes: number;
  edges: number;
  source_projects: string[];
  generated_at: string;
}

// ---- Errors ----

export class IntelligenceQueryValidationError extends Error {
  constructor(message: string) {
    super(`[FC-NF] Intelligence query validation failed: ${message}`);
    this.name = 'IntelligenceQueryValidationError';
  }
}

// ---- Service ----

export class FederatedIntelligenceQueryService {
  private readonly studioId: string;
  private readonly projectId: string;
  private readonly registeredProjects: Map<string, { entity_count: number }> = new Map();

  constructor(studioId: string, projectId: string) {
    if (!studioId || !projectId) {
      throw new IntelligenceQueryValidationError('studioId and projectId are required');
    }
    this.studioId = studioId;
    this.projectId = projectId;
  }

  /**
   * Register a project as available for federated intelligence queries.
   */
  registerProject(projectId: string, entityCount: number): void {
    this.registeredProjects.set(projectId, { entity_count: entityCount });
  }

  /**
   * Query intelligence across studio projects.
   * All results are non-authoritative projections.
   */
  async queryStudioIntelligence(
    request: IntelligenceQueryRequest
  ): Promise<IntelligenceQueryResult> {
    // FC-NF: Validate requester identity
    if (!request.requester_identity) {
      throw new IntelligenceQueryValidationError('requester_identity is required');
    }

    // FC-NF: Validate capability reference
    if (!request.capability_ref) {
      throw new IntelligenceQueryValidationError('capability_ref is required');
    }

    // FC-NF: Validate studio scope matches
    if (!request.studio_scope) {
      throw new IntelligenceQueryValidationError('studio_scope is required');
    }
    if (request.studio_scope !== this.studioId) {
      throw new IntelligenceQueryValidationError(
        `Studio scope mismatch: requested ${request.studio_scope}, service bound to ${this.studioId}`
      );
    }

    // FC-NF: Validate entity types declared
    if (!request.entity_types || request.entity_types.length === 0) {
      throw new IntelligenceQueryValidationError('entity_types must be explicitly declared');
    }

    // FC-NF: Validate query kind
    const validKinds = ['creative_dna', 'knowledge_graph', 'suggestion_feed', 'narrative_pressure'];
    if (!validKinds.includes(request.query_kind)) {
      throw new IntelligenceQueryValidationError(`Invalid query_kind: ${request.query_kind}`);
    }

    // Build source projects list
    const sourceProjects: IntelligenceQueryResult['source_projects'] = [];
    for (const [pid, info] of this.registeredProjects) {
      sourceProjects.push({
        project_id: pid,
        entity_count: info.entity_count,
        canonical_source: 'project_local_cdg',
      });
    }

    // Return non-authoritative result
    const result: IntelligenceQueryResult = {
      query_id: request.query_id,
      authoritative: false as const,
      source_projects: sourceProjects,
      results: [],
      projection_timestamp: new Date().toISOString(),
      staleness_warning: false,
    };

    return result;
  }

  /**
   * Aggregate creative DNA across studio projects.
   * Returns non-authoritative summary.
   */
  async getCreativeDNASummary(
    studioId: string,
    entityTypes: string[]
  ): Promise<StudioIntelligenceSummary> {
    // FC-NF: Validate studio scope
    if (studioId !== this.studioId) {
      throw new IntelligenceQueryValidationError(
        `Studio scope mismatch: requested ${studioId}, service bound to ${this.studioId}`
      );
    }

    if (!entityTypes || entityTypes.length === 0) {
      throw new IntelligenceQueryValidationError('entity_types must be explicitly declared');
    }

    let totalEntries = 0;
    for (const [, info] of this.registeredProjects) {
      totalEntries += info.entity_count;
    }

    return {
      studio_id: studioId,
      authoritative: false as const,
      projects_contributing: this.registeredProjects.size,
      creative_dna_entries: totalEntries,
      generated_at: new Date().toISOString(),
    };
  }

  /**
   * Cross-project knowledge graph view.
   * Returns non-authoritative projection.
   */
  async getKnowledgeGraphProjection(
    studioId: string,
    entityTypes: string[]
  ): Promise<KnowledgeGraphProjection> {
    // FC-NF: Validate studio scope
    if (studioId !== this.studioId) {
      throw new IntelligenceQueryValidationError(
        `Studio scope mismatch: requested ${studioId}, service bound to ${this.studioId}`
      );
    }

    if (!entityTypes || entityTypes.length === 0) {
      throw new IntelligenceQueryValidationError('entity_types must be explicitly declared');
    }

    const sourceProjectIds = Array.from(this.registeredProjects.keys());

    return {
      studio_id: studioId,
      authoritative: false as const,
      nodes: 0,
      edges: 0,
      source_projects: sourceProjectIds,
      generated_at: new Date().toISOString(),
    };
  }
}
