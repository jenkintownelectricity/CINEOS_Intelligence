/**
 * Knowledge Graph Engine Tests
 *
 * 7 tests verifying:
 * - Node creation with source linkage
 * - Edge creation
 * - Query returns linked nodes
 * - getNodesBySource resolves correctly
 * - Event emission on mutations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  addNode,
  addEdge,
  query,
  getNodesBySource,
  getNode,
  clearGraph,
  type EventSpineEmitter,
} from '../../src/intelligence/knowledge-graph-engine';
import type { IntelligenceEvent } from '../../src/intelligence/creative-dna-analyzer';

// --- Test helpers ---

function createTestSpine(): EventSpineEmitter & { events: IntelligenceEvent[] } {
  return { events: [], emit(event: IntelligenceEvent) { this.events.push(event); } };
}

describe('KnowledgeGraphEngine', () => {
  beforeEach(() => {
    clearGraph();
  });

  it('node creation with source linkage', () => {
    const spine = createTestSpine();
    const node = addNode(
      'concept',
      'rapid-cuts',
      { frequency: 'high' },
      [{ entity_type: 'timeline_mutation', entity_id: 'tm-001' }],
      spine,
    );

    expect(node.node_id).toBeDefined();
    expect(node.node_type).toBe('concept');
    expect(node.label).toBe('rapid-cuts');
    expect(node.source_entities.length).toBe(1);
    expect(node.source_entities[0].entity_type).toBe('timeline_mutation');
    expect(node.source_entities[0].entity_id).toBe('tm-001');
  });

  it('node requires source entities (fail-closed)', () => {
    const spine = createTestSpine();
    expect(() => {
      addNode('concept', 'orphan-node', {}, [], spine);
    }).toThrow();
  });

  it('edge creation between nodes', () => {
    const spine = createTestSpine();
    const node1 = addNode('pattern', 'cut-pattern', {}, [{ entity_type: 'timeline_mutation', entity_id: 'tm-001' }], spine);
    const node2 = addNode('creative_element', 'transition', {}, [{ entity_type: 'timeline_mutation', entity_id: 'tm-002' }], spine);

    const edge = addEdge(node1.node_id, node2.node_id, 'influences', 0.8, spine);

    expect(edge.target_node_id).toBe(node2.node_id);
    expect(edge.edge_type).toBe('influences');
    expect(edge.weight).toBe(0.8);

    const updatedNode1 = getNode(node1.node_id);
    expect(updatedNode1!.edges.length).toBe(1);
  });

  it('query returns matching nodes', () => {
    const spine = createTestSpine();
    addNode('concept', 'visual-rhythm', {}, [{ entity_type: 'timeline_mutation', entity_id: 'tm-001' }], spine);
    addNode('pattern', 'audio-sync', {}, [{ entity_type: 'timeline_mutation', entity_id: 'tm-002' }], spine);
    addNode('concept', 'visual-pacing', {}, [{ entity_type: 'timeline_mutation', entity_id: 'tm-003' }], spine);

    const results = query('visual');
    expect(results.length).toBe(2);
  });

  it('getNodesBySource resolves correctly', () => {
    const spine = createTestSpine();
    addNode('concept', 'node-a', {}, [{ entity_type: 'review_packet', entity_id: 'rp-001' }], spine);
    addNode('pattern', 'node-b', {}, [{ entity_type: 'review_packet', entity_id: 'rp-001' }], spine);
    addNode('concept', 'node-c', {}, [{ entity_type: 'timeline_mutation', entity_id: 'tm-001' }], spine);

    const results = getNodesBySource('review_packet', 'rp-001');
    expect(results.length).toBe(2);
  });

  it('emits event on node creation', () => {
    const spine = createTestSpine();
    addNode('concept', 'test-node', {}, [{ entity_type: 'timeline_mutation', entity_id: 'tm-001' }], spine);

    expect(spine.events.length).toBe(1);
    const event = spine.events[0];
    expect(event.event_class).toBe('intelligence_event');
    expect(event.source_subsystem).toBe('knowledge_graph_engine');
    expect(event.payload.action).toBe('node_created');
  });

  it('emits event on edge creation', () => {
    const spine = createTestSpine();
    const node1 = addNode('concept', 'n1', {}, [{ entity_type: 'timeline_mutation', entity_id: 'tm-001' }], spine);
    const node2 = addNode('concept', 'n2', {}, [{ entity_type: 'timeline_mutation', entity_id: 'tm-002' }], spine);
    spine.events.length = 0; // reset events after node creation

    addEdge(node1.node_id, node2.node_id, 'similar_to', 0.5, spine);

    expect(spine.events.length).toBe(1);
    expect(spine.events[0].payload.action).toBe('edge_created');
  });
});
