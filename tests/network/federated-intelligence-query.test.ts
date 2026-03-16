/**
 * Wave 8 Network Tests - FederatedIntelligenceQueryService
 *
 * Validates kernel law enforcement:
 *   - Results authoritative: false
 *   - Fail-closed on missing identity
 *   - Fail-closed on missing capability
 *   - Studio scope enforcement
 *   - Entity types required
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  FederatedIntelligenceQueryService,
  IntelligenceQueryValidationError,
} from '../../src/intelligence/federated-intelligence-query';
import type { IntelligenceQueryRequest } from '../../src/intelligence/federated-intelligence-query';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const studioId = 'stid-00000000-0000-0000-0000-000000000001';
const projectId = 'proj-001';

function makeService(): FederatedIntelligenceQueryService {
  const svc = new FederatedIntelligenceQueryService(studioId, projectId);
  svc.registerProject('proj-001', 10);
  svc.registerProject('proj-002', 20);
  return svc;
}

function makeRequest(overrides: Partial<IntelligenceQueryRequest> = {}): IntelligenceQueryRequest {
  return {
    query_id: 'q-001',
    requester_identity: 'huid-00000000-0000-0000-0000-000000000001',
    capability_ref: 'grant-001',
    studio_scope: studioId,
    entity_types: ['timeline', 'scene'],
    query_kind: 'creative_dna',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FederatedIntelligenceQueryService', () => {
  let service: FederatedIntelligenceQueryService;

  beforeEach(() => {
    service = makeService();
  });

  // -------------------------------------------------------------------------
  // Results authoritative: false
  // -------------------------------------------------------------------------

  describe('results authoritative: false', () => {
    it('queryStudioIntelligence returns authoritative: false', async () => {
      const result = await service.queryStudioIntelligence(makeRequest());
      expect(result.authoritative).toBe(false);
    });

    it('authoritative is literally false, not falsy', async () => {
      const result = await service.queryStudioIntelligence(makeRequest());
      expect(result.authoritative).toStrictEqual(false);
    });

    it('source projects have canonical_source: project_local_cdg', async () => {
      const result = await service.queryStudioIntelligence(makeRequest());
      for (const sp of result.source_projects) {
        expect(sp.canonical_source).toBe('project_local_cdg');
      }
    });

    it('result includes query_id from request', async () => {
      const result = await service.queryStudioIntelligence(makeRequest());
      expect(result.query_id).toBe('q-001');
    });

    it('result includes projection_timestamp', async () => {
      const result = await service.queryStudioIntelligence(makeRequest());
      expect(result.projection_timestamp).toBeDefined();
      expect(typeof result.projection_timestamp).toBe('string');
    });

    it('creative DNA summary is non-authoritative', async () => {
      const summary = await service.getCreativeDNASummary(studioId, ['timeline']);
      expect(summary.authoritative).toBe(false);
      expect(summary.projects_contributing).toBe(2);
    });

    it('knowledge graph projection is non-authoritative', async () => {
      const proj = await service.getKnowledgeGraphProjection(studioId, ['scene']);
      expect(proj.authoritative).toBe(false);
      expect(proj.source_projects.length).toBe(2);
    });

    it('creative DNA summary aggregates entity counts', async () => {
      const summary = await service.getCreativeDNASummary(studioId, ['timeline']);
      expect(summary.creative_dna_entries).toBe(30); // 10 + 20
    });
  });

  // -------------------------------------------------------------------------
  // Fail-closed on missing identity
  // -------------------------------------------------------------------------

  describe('fail-closed on missing identity', () => {
    it('rejects missing requester_identity (empty)', async () => {
      await expect(
        service.queryStudioIntelligence(makeRequest({ requester_identity: '' })),
      ).rejects.toThrow(IntelligenceQueryValidationError);
    });

    it('rejects missing requester_identity (undefined)', async () => {
      await expect(
        service.queryStudioIntelligence(makeRequest({ requester_identity: undefined as any })),
      ).rejects.toThrow(IntelligenceQueryValidationError);
    });

    it('error message references requester_identity', async () => {
      await expect(
        service.queryStudioIntelligence(makeRequest({ requester_identity: '' })),
      ).rejects.toThrow(/requester_identity/);
    });
  });

  // -------------------------------------------------------------------------
  // Fail-closed on missing capability
  // -------------------------------------------------------------------------

  describe('fail-closed on missing capability', () => {
    it('rejects missing capability_ref (empty)', async () => {
      await expect(
        service.queryStudioIntelligence(makeRequest({ capability_ref: '' })),
      ).rejects.toThrow(IntelligenceQueryValidationError);
    });

    it('rejects missing capability_ref (undefined)', async () => {
      await expect(
        service.queryStudioIntelligence(makeRequest({ capability_ref: undefined as any })),
      ).rejects.toThrow(IntelligenceQueryValidationError);
    });

    it('error message references capability_ref', async () => {
      await expect(
        service.queryStudioIntelligence(makeRequest({ capability_ref: '' })),
      ).rejects.toThrow(/capability_ref/);
    });
  });

  // -------------------------------------------------------------------------
  // Studio scope enforcement
  // -------------------------------------------------------------------------

  describe('studio scope enforcement', () => {
    it('rejects empty studio_scope', async () => {
      await expect(
        service.queryStudioIntelligence(makeRequest({ studio_scope: '' })),
      ).rejects.toThrow(IntelligenceQueryValidationError);
    });

    it('rejects studio scope mismatch', async () => {
      await expect(
        service.queryStudioIntelligence(makeRequest({ studio_scope: 'stid-wrong' })),
      ).rejects.toThrow(IntelligenceQueryValidationError);
    });

    it('error message references scope mismatch', async () => {
      await expect(
        service.queryStudioIntelligence(makeRequest({ studio_scope: 'stid-wrong' })),
      ).rejects.toThrow(/scope mismatch/i);
    });

    it('getCreativeDNASummary rejects mismatched studio', async () => {
      await expect(
        service.getCreativeDNASummary('stid-wrong', ['timeline']),
      ).rejects.toThrow(IntelligenceQueryValidationError);
    });

    it('getKnowledgeGraphProjection rejects mismatched studio', async () => {
      await expect(
        service.getKnowledgeGraphProjection('stid-wrong', ['scene']),
      ).rejects.toThrow(IntelligenceQueryValidationError);
    });

    it('accepts correct studio scope', async () => {
      const result = await service.queryStudioIntelligence(makeRequest({ studio_scope: studioId }));
      expect(result.authoritative).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Entity types required
  // -------------------------------------------------------------------------

  describe('entity types required', () => {
    it('rejects empty entity_types', async () => {
      await expect(
        service.queryStudioIntelligence(makeRequest({ entity_types: [] })),
      ).rejects.toThrow(IntelligenceQueryValidationError);
    });

    it('rejects undefined entity_types', async () => {
      await expect(
        service.queryStudioIntelligence(makeRequest({ entity_types: undefined as any })),
      ).rejects.toThrow(IntelligenceQueryValidationError);
    });

    it('rejects null entity_types', async () => {
      await expect(
        service.queryStudioIntelligence(makeRequest({ entity_types: null as any })),
      ).rejects.toThrow(IntelligenceQueryValidationError);
    });

    it('getCreativeDNASummary rejects empty entity_types', async () => {
      await expect(
        service.getCreativeDNASummary(studioId, []),
      ).rejects.toThrow(IntelligenceQueryValidationError);
    });

    it('getKnowledgeGraphProjection rejects empty entity_types', async () => {
      await expect(
        service.getKnowledgeGraphProjection(studioId, []),
      ).rejects.toThrow(IntelligenceQueryValidationError);
    });

    it('accepts valid entity_types', async () => {
      const result = await service.queryStudioIntelligence(
        makeRequest({ entity_types: ['shot'] }),
      );
      expect(result.authoritative).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Query kind validation
  // -------------------------------------------------------------------------

  describe('query kind validation', () => {
    it('accepts creative_dna', async () => {
      const result = await service.queryStudioIntelligence(makeRequest({ query_kind: 'creative_dna' }));
      expect(result.authoritative).toBe(false);
    });

    it('accepts knowledge_graph', async () => {
      const result = await service.queryStudioIntelligence(makeRequest({ query_kind: 'knowledge_graph' }));
      expect(result.authoritative).toBe(false);
    });

    it('accepts suggestion_feed', async () => {
      const result = await service.queryStudioIntelligence(makeRequest({ query_kind: 'suggestion_feed' }));
      expect(result.authoritative).toBe(false);
    });

    it('accepts narrative_pressure', async () => {
      const result = await service.queryStudioIntelligence(makeRequest({ query_kind: 'narrative_pressure' }));
      expect(result.authoritative).toBe(false);
    });

    it('rejects invalid query_kind', async () => {
      await expect(
        service.queryStudioIntelligence(makeRequest({ query_kind: 'invalid' as any })),
      ).rejects.toThrow(IntelligenceQueryValidationError);
    });
  });

  // -------------------------------------------------------------------------
  // Constructor validation
  // -------------------------------------------------------------------------

  describe('constructor validation', () => {
    it('throws on missing studioId', () => {
      expect(() => new FederatedIntelligenceQueryService('', projectId)).toThrow(
        IntelligenceQueryValidationError,
      );
    });

    it('throws on missing projectId', () => {
      expect(() => new FederatedIntelligenceQueryService(studioId, '')).toThrow(
        IntelligenceQueryValidationError,
      );
    });
  });
});
