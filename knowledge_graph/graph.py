"""
Studio Knowledge Graph — the core in-memory graph engine.

Maintains an adjacency-list graph of production relationships scoped per
tenant.  Provides CRUD, traversal, and analytics primitives that the
query engine builds on.
"""

from __future__ import annotations

import itertools
from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

from knowledge_graph.edges import EdgeType, GraphEdge, validate_edge_schema
from knowledge_graph.nodes import GraphNode, NodeType


class StudioKnowledgeGraph:
    """Tenant-scoped, in-memory knowledge graph for a studio's production universe."""

    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id

        # Primary stores
        self._nodes: Dict[str, GraphNode] = {}
        self._edges: Dict[str, GraphEdge] = {}

        # Adjacency indices  (node_id -> set of edge_ids)
        self._outgoing: Dict[str, Set[str]] = defaultdict(set)
        self._incoming: Dict[str, Set[str]] = defaultdict(set)

        # Secondary indices
        self._nodes_by_type: Dict[str, Set[str]] = defaultdict(set)
        self._edges_by_type: Dict[str, Set[str]] = defaultdict(set)

    # ------------------------------------------------------------------
    # Node CRUD
    # ------------------------------------------------------------------

    def add_node(self, node: GraphNode) -> GraphNode:
        """Insert or replace a node.  Enforces tenant scope."""
        if node.tenant_id != self.tenant_id:
            raise ValueError(
                f"Node tenant {node.tenant_id} does not match graph tenant {self.tenant_id}"
            )
        self._nodes[node.id] = node
        self._nodes_by_type[node.node_type].add(node.id)
        return node

    def get_node(self, node_id: str) -> Optional[GraphNode]:
        return self._nodes.get(node_id)

    def remove_node(self, node_id: str) -> bool:
        node = self._nodes.pop(node_id, None)
        if node is None:
            return False
        self._nodes_by_type.get(node.node_type, set()).discard(node_id)
        # Remove connected edges
        connected = self._outgoing.pop(node_id, set()) | self._incoming.pop(node_id, set())
        for eid in connected:
            self._remove_edge_from_indices(eid)
        return True

    def get_nodes_by_type(self, node_type: NodeType | str) -> List[GraphNode]:
        nt = node_type.value if isinstance(node_type, NodeType) else node_type
        return [self._nodes[nid] for nid in self._nodes_by_type.get(nt, set()) if nid in self._nodes]

    def search_nodes(
        self,
        *,
        node_type: Optional[NodeType | str] = None,
        label_contains: Optional[str] = None,
        tags: Optional[List[str]] = None,
        properties: Optional[Dict[str, Any]] = None,
    ) -> List[GraphNode]:
        """Filter nodes by various criteria."""
        candidates: Iterable[GraphNode]
        if node_type is not None:
            candidates = self.get_nodes_by_type(node_type)
        else:
            candidates = self._nodes.values()

        results: List[GraphNode] = []
        for n in candidates:
            if label_contains and label_contains.lower() not in n.label.lower():
                continue
            if tags and not set(tags).issubset(set(n.tags)):
                continue
            if properties:
                if not all(n.properties.get(k) == v for k, v in properties.items()):
                    continue
            results.append(n)
        return results

    # ------------------------------------------------------------------
    # Edge CRUD
    # ------------------------------------------------------------------

    def add_edge(self, edge: GraphEdge, *, validate: bool = True) -> GraphEdge:
        """Insert or replace an edge.  Optionally validates schema."""
        if edge.tenant_id != self.tenant_id:
            raise ValueError(
                f"Edge tenant {edge.tenant_id} does not match graph tenant {self.tenant_id}"
            )
        src = self._nodes.get(edge.source_id)
        tgt = self._nodes.get(edge.target_id)
        if src is None or tgt is None:
            missing = []
            if src is None:
                missing.append(f"source={edge.source_id}")
            if tgt is None:
                missing.append(f"target={edge.target_id}")
            raise KeyError(f"Missing node(s): {', '.join(missing)}")

        if validate:
            if not validate_edge_schema(EdgeType(edge.edge_type), src.node_type, tgt.node_type):
                raise ValueError(
                    f"Edge type {edge.edge_type} not valid between "
                    f"{src.node_type} -> {tgt.node_type}"
                )

        self._edges[edge.id] = edge
        self._outgoing[edge.source_id].add(edge.id)
        self._incoming[edge.target_id].add(edge.id)
        self._edges_by_type[edge.edge_type].add(edge.id)
        return edge

    def get_edge(self, edge_id: str) -> Optional[GraphEdge]:
        return self._edges.get(edge_id)

    def remove_edge(self, edge_id: str) -> bool:
        return self._remove_edge_from_indices(edge_id)

    def get_edges_between(self, node_a: str, node_b: str) -> List[GraphEdge]:
        """Return all edges between two nodes (in either direction)."""
        out_a = self._outgoing.get(node_a, set())
        out_b = self._outgoing.get(node_b, set())
        edge_ids = set()
        for eid in out_a:
            e = self._edges.get(eid)
            if e and e.target_id == node_b:
                edge_ids.add(eid)
        for eid in out_b:
            e = self._edges.get(eid)
            if e and e.target_id == node_a:
                edge_ids.add(eid)
        return [self._edges[eid] for eid in edge_ids]

    # ------------------------------------------------------------------
    # Traversal primitives
    # ------------------------------------------------------------------

    def neighbors(
        self,
        node_id: str,
        *,
        direction: str = "both",
        edge_type: Optional[EdgeType | str] = None,
    ) -> List[Tuple[GraphNode, GraphEdge]]:
        """Return (neighbor_node, connecting_edge) pairs."""
        results: List[Tuple[GraphNode, GraphEdge]] = []
        et = edge_type.value if isinstance(edge_type, EdgeType) else edge_type

        if direction in ("out", "both"):
            for eid in self._outgoing.get(node_id, set()):
                e = self._edges.get(eid)
                if e is None:
                    continue
                if et and e.edge_type != et:
                    continue
                n = self._nodes.get(e.target_id)
                if n:
                    results.append((n, e))

        if direction in ("in", "both"):
            for eid in self._incoming.get(node_id, set()):
                e = self._edges.get(eid)
                if e is None:
                    continue
                if et and e.edge_type != et:
                    continue
                n = self._nodes.get(e.source_id)
                if n:
                    results.append((n, e))

        return results

    def find_collaborators(self, person_id: str) -> List[GraphNode]:
        """Return people who have worked on the same projects as *person_id*."""
        project_ids: Set[str] = set()
        for node, edge in self.neighbors(person_id, direction="out"):
            if node.node_type in (NodeType.PROJECT.value, NodeType.PROJECT):
                project_ids.add(node.id)

        collaborator_ids: Set[str] = set()
        for pid in project_ids:
            for node, _ in self.neighbors(pid, direction="in"):
                if node.node_type in (NodeType.PERSON.value, NodeType.PERSON) and node.id != person_id:
                    collaborator_ids.add(node.id)

        return [self._nodes[cid] for cid in collaborator_ids if cid in self._nodes]

    def find_crew_by_specialty(self, specialty: str) -> List[GraphNode]:
        """Return all people whose specialties list contains *specialty*."""
        results = []
        for nid in self._nodes_by_type.get(NodeType.PERSON.value, set()):
            node = self._nodes.get(nid)
            if node is None:
                continue
            specs = getattr(node, "specialties", []) or node.properties.get("specialties", [])
            if specialty.lower() in [s.lower() for s in specs]:
                results.append(node)
        return results

    # ------------------------------------------------------------------
    # Shortest path (BFS)
    # ------------------------------------------------------------------

    def shortest_path(self, start_id: str, end_id: str) -> Optional[List[str]]:
        """BFS shortest path returning a list of node IDs, or None."""
        if start_id not in self._nodes or end_id not in self._nodes:
            return None
        if start_id == end_id:
            return [start_id]

        visited: Set[str] = {start_id}
        queue: List[Tuple[str, List[str]]] = [(start_id, [start_id])]

        while queue:
            current, path = queue.pop(0)
            for neighbor, _ in self.neighbors(current, direction="both"):
                if neighbor.id == end_id:
                    return path + [neighbor.id]
                if neighbor.id not in visited:
                    visited.add(neighbor.id)
                    queue.append((neighbor.id, path + [neighbor.id]))
        return None

    # ------------------------------------------------------------------
    # Network analytics
    # ------------------------------------------------------------------

    def degree(self, node_id: str) -> int:
        return len(self._outgoing.get(node_id, set())) + len(self._incoming.get(node_id, set()))

    def project_network_data(self) -> Dict[str, Any]:
        """Return graph data suitable for network visualisation (nodes + links)."""
        vis_nodes = []
        for n in self._nodes.values():
            vis_nodes.append({
                "id": n.id,
                "label": n.label,
                "type": n.node_type if isinstance(n.node_type, str) else n.node_type.value,
                "properties": n.properties,
            })
        vis_links = []
        for e in self._edges.values():
            vis_links.append({
                "id": e.id,
                "source": e.source_id,
                "target": e.target_id,
                "type": e.edge_type if isinstance(e.edge_type, str) else e.edge_type.value,
                "weight": e.weight,
            })
        return {"nodes": vis_nodes, "links": vis_links}

    @property
    def node_count(self) -> int:
        return len(self._nodes)

    @property
    def edge_count(self) -> int:
        return len(self._edges)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _remove_edge_from_indices(self, edge_id: str) -> bool:
        edge = self._edges.pop(edge_id, None)
        if edge is None:
            return False
        self._outgoing.get(edge.source_id, set()).discard(edge_id)
        self._incoming.get(edge.target_id, set()).discard(edge_id)
        self._edges_by_type.get(edge.edge_type, set()).discard(edge_id)
        return True
