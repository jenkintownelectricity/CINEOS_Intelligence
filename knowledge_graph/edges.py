"""
Graph edge models for the CINEOS Studio Knowledge Graph.

Edges encode typed, weighted, temporal relationships between nodes.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class EdgeType(str, Enum):
    """Enumeration of supported relationship types."""

    WORKED_ON = "worked_on"
    COLLABORATED_WITH = "collaborated_with"
    USED_EQUIPMENT = "used_equipment"
    SHOT_AT = "shot_at"
    DIRECTED = "directed"
    EDITED = "edited"
    PRODUCED = "produced"
    ACTED_IN = "acted_in"
    BELONGS_TO_GENRE = "belongs_to_genre"
    HAS_ROLE = "has_role"
    AFFILIATED_WITH = "affiliated_with"


# Allowed (source_type, target_type) for each edge type — lightweight schema.
EDGE_SCHEMA: Dict[EdgeType, List[tuple]] = {
    EdgeType.WORKED_ON: [("person", "project")],
    EdgeType.COLLABORATED_WITH: [("person", "person")],
    EdgeType.USED_EQUIPMENT: [("project", "equipment"), ("person", "equipment")],
    EdgeType.SHOT_AT: [("project", "location")],
    EdgeType.DIRECTED: [("person", "project")],
    EdgeType.EDITED: [("person", "project")],
    EdgeType.PRODUCED: [("person", "project"), ("studio", "project")],
    EdgeType.ACTED_IN: [("person", "project")],
    EdgeType.BELONGS_TO_GENRE: [("project", "genre")],
    EdgeType.HAS_ROLE: [("person", "role")],
    EdgeType.AFFILIATED_WITH: [("person", "studio")],
}


class GraphEdge(BaseModel):
    """A directed, typed, weighted edge between two graph nodes."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str = Field(..., description="Tenant / organisation scope")
    edge_type: EdgeType
    source_id: str = Field(..., description="ID of the source node")
    target_id: str = Field(..., description="ID of the target node")
    weight: float = Field(default=1.0, ge=0.0, description="Relationship strength")
    properties: Dict[str, Any] = Field(default_factory=dict)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"use_enum_values": True}

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @property
    def is_active(self) -> bool:
        """Return True when the relationship has no end date or end is in the future."""
        if self.end_date is None:
            return True
        return self.end_date > datetime.utcnow()

    @property
    def duration_days(self) -> Optional[float]:
        """Duration of the relationship in days, if both dates present."""
        if self.start_date is None:
            return None
        end = self.end_date or datetime.utcnow()
        return (end - self.start_date).total_seconds() / 86_400


def validate_edge_schema(
    edge_type: EdgeType,
    source_node_type: str,
    target_node_type: str,
) -> bool:
    """Check whether a given (source, target) pair is valid for the edge type."""
    allowed = EDGE_SCHEMA.get(edge_type, [])
    return (source_node_type, target_node_type) in allowed
