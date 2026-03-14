"""
Knowledge Graph Query Engine — high-level analytical queries.

Builds on StudioKnowledgeGraph to answer production intelligence questions:
shortest path between people, crew recommendations, network visualisation
data, and equipment usage patterns.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any, Dict, List, Optional, Set, Tuple

from knowledge_graph.edges import EdgeType
from knowledge_graph.graph import StudioKnowledgeGraph
from knowledge_graph.nodes import NodeType


class KnowledgeGraphQueryEngine:
    """Facade for complex graph queries against a StudioKnowledgeGraph."""

    def __init__(self, graph: StudioKnowledgeGraph) -> None:
        self.graph = graph

    # ------------------------------------------------------------------
    # Path queries
    # ------------------------------------------------------------------

    def shortest_path_between_people(
        self, person_a_id: str, person_b_id: str
    ) -> Optional[List[Dict[str, Any]]]:
        """Return the shortest path as a list of node summaries, or None."""
        path_ids = self.graph.shortest_path(person_a_id, person_b_id)
        if path_ids is None:
            return None
        result: List[Dict[str, Any]] = []
        for nid in path_ids:
            node = self.graph.get_node(nid)
            if node:
                result.append({
                    "id": node.id,
                    "label": node.label,
                    "type": node.node_type,
                })
        return result

    def degrees_of_separation(self, person_a_id: str, person_b_id: str) -> Optional[int]:
        """Number of hops between two people (None if disconnected)."""
        path = self.graph.shortest_path(person_a_id, person_b_id)
        if path is None:
            return None
        return len(path) - 1

    # ------------------------------------------------------------------
    # Crew recommendation
    # ------------------------------------------------------------------

    def recommend_crew_by_project_similarity(
        self,
        reference_project_id: str,
        role_filter: Optional[str] = None,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Recommend crew who worked on projects sharing genres or traits with
        the reference project but who have **not** worked on the reference
        project itself.
        """
        ref = self.graph.get_node(reference_project_id)
        if ref is None:
            return []

        # Collect genres of the reference project
        ref_genre_ids: Set[str] = set()
        for node, edge in self.graph.neighbors(reference_project_id, direction="out"):
            if node.node_type in (NodeType.GENRE.value, NodeType.GENRE):
                ref_genre_ids.add(node.id)

        # Crew already on this project
        existing_crew: Set[str] = set()
        for node, _ in self.graph.neighbors(reference_project_id, direction="in"):
            if node.node_type in (NodeType.PERSON.value, NodeType.PERSON):
                existing_crew.add(node.id)

        # Find projects that share genres
        similar_project_ids: Set[str] = set()
        for gid in ref_genre_ids:
            for node, _ in self.graph.neighbors(gid, direction="in"):
                if node.node_type in (NodeType.PROJECT.value, NodeType.PROJECT) and node.id != reference_project_id:
                    similar_project_ids.add(node.id)

        # Score candidate crew from similar projects
        candidate_scores: Counter = Counter()
        for pid in similar_project_ids:
            for node, edge in self.graph.neighbors(pid, direction="in"):
                if node.node_type not in (NodeType.PERSON.value, NodeType.PERSON):
                    continue
                if node.id in existing_crew:
                    continue
                if role_filter:
                    if edge.edge_type != role_filter:
                        # Also check specialties
                        specs = getattr(node, "specialties", [])
                        if role_filter.lower() not in [s.lower() for s in specs]:
                            continue
                candidate_scores[node.id] += edge.weight

        recommendations: List[Dict[str, Any]] = []
        for nid, score in candidate_scores.most_common(limit):
            node = self.graph.get_node(nid)
            if node:
                recommendations.append({
                    "id": node.id,
                    "label": node.label,
                    "score": score,
                    "specialties": getattr(node, "specialties", []),
                })
        return recommendations

    # ------------------------------------------------------------------
    # Production network visualisation
    # ------------------------------------------------------------------

    def production_network_visualisation(
        self,
        *,
        center_node_id: Optional[str] = None,
        max_depth: int = 2,
        node_types: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Generate visualisation-ready network data.

        If *center_node_id* is given, perform a BFS up to *max_depth* from
        that node; otherwise return the full graph.
        """
        if center_node_id is None:
            return self.graph.project_network_data()

        # BFS subgraph
        visited_nodes: Set[str] = set()
        visited_edges: Set[str] = set()
        frontier: Set[str] = {center_node_id}

        for _ in range(max_depth):
            next_frontier: Set[str] = set()
            for nid in frontier:
                if nid in visited_nodes:
                    continue
                visited_nodes.add(nid)
                for neighbor, edge in self.graph.neighbors(nid, direction="both"):
                    if node_types and neighbor.node_type not in node_types:
                        continue
                    visited_edges.add(edge.id)
                    if neighbor.id not in visited_nodes:
                        next_frontier.add(neighbor.id)
            frontier = next_frontier

        vis_nodes = []
        for nid in visited_nodes:
            n = self.graph.get_node(nid)
            if n:
                vis_nodes.append({
                    "id": n.id,
                    "label": n.label,
                    "type": n.node_type,
                })
        vis_links = []
        for eid in visited_edges:
            e = self.graph.get_edge(eid)
            if e:
                vis_links.append({
                    "id": e.id,
                    "source": e.source_id,
                    "target": e.target_id,
                    "type": e.edge_type,
                    "weight": e.weight,
                })
        return {"nodes": vis_nodes, "links": vis_links}

    # ------------------------------------------------------------------
    # Equipment usage patterns
    # ------------------------------------------------------------------

    def equipment_usage_patterns(
        self, *, equipment_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyse equipment usage across projects.

        Returns per-equipment stats: how many projects, which people used it,
        total usage weight.
        """
        equipment_nodes = (
            [self.graph.get_node(equipment_id)]
            if equipment_id
            else self.graph.get_nodes_by_type(NodeType.EQUIPMENT)
        )

        patterns: Dict[str, Any] = {}
        for eq in equipment_nodes:
            if eq is None:
                continue
            projects: List[str] = []
            users: List[str] = []
            total_weight = 0.0

            for node, edge in self.graph.neighbors(eq.id, direction="in"):
                if edge.edge_type in (EdgeType.USED_EQUIPMENT.value, EdgeType.USED_EQUIPMENT):
                    if node.node_type in (NodeType.PROJECT.value, NodeType.PROJECT):
                        projects.append(node.label)
                    elif node.node_type in (NodeType.PERSON.value, NodeType.PERSON):
                        users.append(node.label)
                    total_weight += edge.weight

            patterns[eq.id] = {
                "label": eq.label,
                "category": getattr(eq, "category", None),
                "manufacturer": getattr(eq, "manufacturer", None),
                "model": getattr(eq, "model", None),
                "project_count": len(projects),
                "projects": projects,
                "user_count": len(users),
                "users": users,
                "total_weight": total_weight,
            }
        return patterns

    # ------------------------------------------------------------------
    # Aggregate stats
    # ------------------------------------------------------------------

    def graph_summary(self) -> Dict[str, Any]:
        """Return high-level statistics about the graph."""
        type_counts: Dict[str, int] = {}
        for nt in NodeType:
            count = len(self.graph.get_nodes_by_type(nt))
            if count:
                type_counts[nt.value] = count

        edge_counts: Dict[str, int] = {}
        for et in EdgeType:
            eids = self.graph._edges_by_type.get(et.value, set())
            if eids:
                edge_counts[et.value] = len(eids)

        return {
            "tenant_id": self.graph.tenant_id,
            "total_nodes": self.graph.node_count,
            "total_edges": self.graph.edge_count,
            "nodes_by_type": type_counts,
            "edges_by_type": edge_counts,
        }
