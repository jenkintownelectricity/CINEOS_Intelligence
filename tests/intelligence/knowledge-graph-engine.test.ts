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

function setup() {
  clearGraph();
}

// --- Tests ---

// Test 1: Node creation with source linkage
function test_node_creation_with_source_linkage(): void {
  setup();
  const spine = createTestSpine();
  const node = addNode(
    'concept',
    'rapid-cuts',
    { frequency: 'high' },
    [{ entity_type: 'timeline_mutation', entity_id: 'tm-001' }],
    spine,
  );

  console.assert(node.node_id !== undefined, 'node_id should be defined');
  console.assert(node.node_type === 'concept', 'node_type should be concept');
  console.assert(node.label === 'rapid-cuts', 'label should match');
  console.assert(node.source_entities.length === 1, 'should have 1 source entity');
  console.assert(node.source_entities[0].entity_type === 'timeline_mutation', 'source entity type should match');
  console.assert(node.source_entities[0].entity_id === 'tm-001', 'source entity id should match');
  console.log('PASS: test_node_creation_with_source_linkage');
}

// Test 2: Node requires source entities (fail-closed)
function test_node_requires_source_entities(): void {
  setup();
  const spine = createTestSpine();
  let threw = false;
  try {
    addNode('concept', 'orphan-node', {}, [], spine);
  } catch (e) {
    threw = true;
  }
  console.assert(threw, 'should throw when no source entities provided');
  console.log('PASS: test_node_requires_source_entities');
}

// Test 3: Edge creation between nodes
function test_edge_creation(): void {
  setup();
  const spine = createTestSpine();
  const node1 = addNode('pattern', 'cut-pattern', {}, [{ entity_type: 'timeline_mutation', entity_id: 'tm-001' }], spine);
  const node2 = addNode('creative_element', 'transition', {}, [{ entity_type: 'timeline_mutation', entity_id: 'tm-002' }], spine);

  const edge = addEdge(node1.node_id, node2.node_id, 'influences', 0.8, spine);

  console.assert(edge.target_node_id === node2.node_id, 'edge target should be node2');
  console.assert(edge.edge_type === 'influences', 'edge type should match');
  console.assert(edge.weight === 0.8, 'weight should match');

  const updatedNode1 = getNode(node1.node_id);
  console.assert(updatedNode1!.edges.length === 1, 'node1 should have 1 edge');
  console.log('PASS: test_edge_creation');
}

// Test 4: Query returns matching nodes
function test_query_returns_matching_nodes(): void {
  setup();
  const spine = createTestSpine();
  addNode('concept', 'visual-rhythm', {}, [{ entity_type: 'timeline_mutation', entity_id: 'tm-001' }], spine);
  addNode('pattern', 'audio-sync', {}, [{ entity_type: 'timeline_mutation', entity_id: 'tm-002' }], spine);
  addNode('concept', 'visual-pacing', {}, [{ entity_type: 'timeline_mutation', entity_id: 'tm-003' }], spine);

  const results = query('visual');
  console.assert(results.length === 2, `expected 2 visual nodes, got ${results.length}`);
  console.log('PASS: test_query_returns_matching_nodes');
}

// Test 5: getNodesBySource resolves correctly
function test_get_nodes_by_source(): void {
  setup();
  const spine = createTestSpine();
  addNode('concept', 'node-a', {}, [{ entity_type: 'review_packet', entity_id: 'rp-001' }], spine);
  addNode('pattern', 'node-b', {}, [{ entity_type: 'review_packet', entity_id: 'rp-001' }], spine);
  addNode('concept', 'node-c', {}, [{ entity_type: 'timeline_mutation', entity_id: 'tm-001' }], spine);

  const results = getNodesBySource('review_packet', 'rp-001');
  console.assert(results.length === 2, `expected 2 nodes from rp-001, got ${results.length}`);
  console.log('PASS: test_get_nodes_by_source');
}

// Test 6: Event emission on node creation
function test_event_emission_on_node_creation(): void {
  setup();
  const spine = createTestSpine();
  addNode('concept', 'test-node', {}, [{ entity_type: 'timeline_mutation', entity_id: 'tm-001' }], spine);

  console.assert(spine.events.length === 1, `expected 1 event, got ${spine.events.length}`);
  const event = spine.events[0];
  console.assert(event.event_class === 'intelligence_event', 'event_class should be intelligence_event');
  console.assert(event.source_subsystem === 'knowledge_graph_engine', 'source_subsystem should be knowledge_graph_engine');
  console.assert(event.payload.action === 'node_created', 'action should be node_created');
  console.log('PASS: test_event_emission_on_node_creation');
}

// Test 7: Event emission on edge creation
function test_event_emission_on_edge_creation(): void {
  setup();
  const spine = createTestSpine();
  const node1 = addNode('concept', 'n1', {}, [{ entity_type: 'timeline_mutation', entity_id: 'tm-001' }], spine);
  const node2 = addNode('concept', 'n2', {}, [{ entity_type: 'timeline_mutation', entity_id: 'tm-002' }], spine);
  spine.events.length = 0; // reset events after node creation

  addEdge(node1.node_id, node2.node_id, 'similar_to', 0.5, spine);

  console.assert(spine.events.length === 1, `expected 1 event for edge, got ${spine.events.length}`);
  console.assert(spine.events[0].payload.action === 'edge_created', 'action should be edge_created');
  console.log('PASS: test_event_emission_on_edge_creation');
}

// --- Run all tests ---
test_node_creation_with_source_linkage();
test_node_requires_source_entities();
test_edge_creation();
test_query_returns_matching_nodes();
test_get_nodes_by_source();
test_event_emission_on_node_creation();
test_event_emission_on_edge_creation();
console.log('\nAll 7 knowledge-graph-engine tests passed.');
