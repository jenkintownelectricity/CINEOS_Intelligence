/**
 * Knowledge Graph Engine
 *
 * Mock knowledge graph with source linkage to canonical entities.
 * All mutations emit intelligence_event via Event Spine.
 *
 * Classification: mock knowledge graph, not production.
 * Honest limitations: in-memory only, no persistence, no NLU, rule-based.
 */

import { generateId, IntelligenceEvent, EventSpineEmitter, InMemoryEventSpine } from './creative-dna-analyzer';

// --- Types ---

export interface SourceEntity {
  entity_type: string;
  entity_id: string;
}

export interface Edge {
  target_node_id: string;
  edge_type: string;
  weight: number;
}

export type NodeType = 'concept' | 'pattern' | 'relationship' | 'creative_element';

export interface KnowledgeGraphNode {
  node_id: string;
  node_type: NodeType;
  label: string;
  attributes: Record<string, unknown>;
  source_entities: SourceEntity[];
  created_at: string;
  updated_at: string;
  edges: Edge[];
}

// --- In-memory graph store ---

const nodeStore = new Map<string, KnowledgeGraphNode>();

// --- Event emission ---

function emitGraphEvent(
  spine: EventSpineEmitter,
  sourceObjectId: string,
  cdgIds: string[],
  payload: Record<string, unknown>,
): void {
  const event: IntelligenceEvent = {
    event_id: generateId(),
    event_class: 'intelligence_event',
    source_subsystem: 'knowledge_graph_engine',
    source_object_id: sourceObjectId,
    related_cdg_object_ids: cdgIds,
    payload,
    status: 'emitted',
    emitted_at: new Date().toISOString(),
    actor_ref: 'knowledge-graph-engine-v1',
    correlation_id: generateId(),
    causality_ref: null,
    replayable_flag: true,
  };
  spine.emit(event);
}

// --- Public API ---

/**
 * Create a knowledge graph node with source linkage to canonical entities.
 */
export function addNode(
  nodeType: NodeType,
  label: string,
  attributes: Record<string, unknown>,
  sourceEntities: SourceEntity[],
  spine: EventSpineEmitter = InMemoryEventSpine,
): KnowledgeGraphNode {
  if (sourceEntities.length === 0) {
    throw new Error('Knowledge graph nodes must link to at least one canonical source entity.');
  }

  const now = new Date().toISOString();
  const node: KnowledgeGraphNode = {
    node_id: generateId(),
    node_type: nodeType,
    label,
    attributes,
    source_entities: sourceEntities,
    created_at: now,
    updated_at: now,
    edges: [],
  };

  nodeStore.set(node.node_id, node);

  emitGraphEvent(spine, node.node_id, sourceEntities.map((s) => s.entity_id), {
    action: 'node_created',
    node_type: nodeType,
    label,
  });

  return node;
}

/**
 * Create an edge between two nodes.
 */
export function addEdge(
  sourceNodeId: string,
  targetNodeId: string,
  edgeType: string,
  weight: number,
  spine: EventSpineEmitter = InMemoryEventSpine,
): Edge {
  const sourceNode = nodeStore.get(sourceNodeId);
  if (!sourceNode) {
    throw new Error(`Source node not found: ${sourceNodeId}`);
  }
  const targetNode = nodeStore.get(targetNodeId);
  if (!targetNode) {
    throw new Error(`Target node not found: ${targetNodeId}`);
  }

  const edge: Edge = { target_node_id: targetNodeId, edge_type: edgeType, weight };
  sourceNode.edges.push(edge);
  sourceNode.updated_at = new Date().toISOString();

  emitGraphEvent(spine, sourceNodeId, [sourceNodeId, targetNodeId], {
    action: 'edge_created',
    edge_type: edgeType,
    weight,
  });

  return edge;
}

/**
 * Pattern-based graph query. Returns nodes whose label or type matches the pattern.
 * Classification: simple string matching, not full graph query language.
 */
export function query(pattern: string): KnowledgeGraphNode[] {
  const regex = new RegExp(pattern, 'i');
  const results: KnowledgeGraphNode[] = [];
  for (const node of nodeStore.values()) {
    if (regex.test(node.label) || regex.test(node.node_type)) {
      results.push(node);
    }
  }
  return results;
}

/**
 * Find nodes created from a specific canonical entity.
 */
export function getNodesBySource(entityType: string, entityId: string): KnowledgeGraphNode[] {
  const results: KnowledgeGraphNode[] = [];
  for (const node of nodeStore.values()) {
    if (node.source_entities.some((s) => s.entity_type === entityType && s.entity_id === entityId)) {
      results.push(node);
    }
  }
  return results;
}

/**
 * Get a node by ID.
 */
export function getNode(nodeId: string): KnowledgeGraphNode | undefined {
  return nodeStore.get(nodeId);
}

/**
 * Clear all nodes (for testing).
 */
export function clearGraph(): void {
  nodeStore.clear();
}
