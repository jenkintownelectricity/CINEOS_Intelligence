"""
Graph node models for the CINEOS Studio Knowledge Graph.

Every entity in the production universe is a node: people, projects, roles,
genres, studios, equipment, and locations.  All nodes are tenant-scoped.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class NodeType(str, Enum):
    """Enumeration of supported graph node types."""

    PERSON = "person"
    PROJECT = "project"
    ROLE = "role"
    GENRE = "genre"
    STUDIO = "studio"
    EQUIPMENT = "equipment"
    LOCATION = "location"


# ---------------------------------------------------------------------------
# Base
# ---------------------------------------------------------------------------

class GraphNode(BaseModel):
    """Base graph node with tenant scoping and metadata."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str = Field(..., description="Tenant / organisation scope")
    node_type: NodeType
    label: str = Field(..., description="Human-readable label")
    properties: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    tags: List[str] = Field(default_factory=list)

    model_config = {"use_enum_values": True}


# ---------------------------------------------------------------------------
# Concrete node types
# ---------------------------------------------------------------------------

class PersonNode(GraphNode):
    """A crew member, actor, or other person in the production network."""

    node_type: NodeType = NodeType.PERSON
    full_name: str = ""
    email: Optional[str] = None
    specialties: List[str] = Field(default_factory=list)
    imdb_id: Optional[str] = None
    availability_status: Optional[str] = None  # available / on_project / unavailable

    def __init__(self, **data: Any):
        if "label" not in data and "full_name" in data:
            data["label"] = data["full_name"]
        super().__init__(**data)


class ProjectNode(GraphNode):
    """A film, series, short, commercial, or other production."""

    node_type: NodeType = NodeType.PROJECT
    title: str = ""
    project_type: Optional[str] = None  # feature / short / series / commercial
    status: Optional[str] = None  # development / pre_production / production / post / released
    release_year: Optional[int] = None
    budget_tier: Optional[str] = None  # micro / low / mid / high / tentpole
    runtime_minutes: Optional[float] = None

    def __init__(self, **data: Any):
        if "label" not in data and "title" in data:
            data["label"] = data["title"]
        super().__init__(**data)


class RoleNode(GraphNode):
    """A production role or department (Director, Editor, DP, etc.)."""

    node_type: NodeType = NodeType.ROLE
    department: Optional[str] = None  # camera / editorial / sound / art / production
    seniority_level: Optional[str] = None  # head / senior / mid / junior / intern


class GenreNode(GraphNode):
    """A genre or sub-genre classification."""

    node_type: NodeType = NodeType.GENRE
    parent_genre: Optional[str] = None


class StudioNode(GraphNode):
    """A studio, production company, or post-production facility."""

    node_type: NodeType = NodeType.STUDIO
    studio_type: Optional[str] = None  # production_company / post_house / vfx / sound_stage
    location: Optional[str] = None
    website: Optional[str] = None


class EquipmentNode(GraphNode):
    """A piece of production equipment (camera body, lens, stabiliser, etc.)."""

    node_type: NodeType = NodeType.EQUIPMENT
    category: Optional[str] = None  # camera / lens / lighting / grip / audio / stabiliser
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None


class LocationNode(GraphNode):
    """A shooting location or stage."""

    node_type: NodeType = NodeType.LOCATION
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_type: Optional[str] = None  # studio / practical / exterior / stage


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

NODE_TYPE_MAP: Dict[NodeType, type] = {
    NodeType.PERSON: PersonNode,
    NodeType.PROJECT: ProjectNode,
    NodeType.ROLE: RoleNode,
    NodeType.GENRE: GenreNode,
    NodeType.STUDIO: StudioNode,
    NodeType.EQUIPMENT: EquipmentNode,
    NodeType.LOCATION: LocationNode,
}


def create_node(node_type: NodeType, **kwargs: Any) -> GraphNode:
    """Factory: create a typed node from a NodeType enum value."""
    cls = NODE_TYPE_MAP.get(node_type)
    if cls is None:
        raise ValueError(f"Unknown node type: {node_type}")
    return cls(node_type=node_type, **kwargs)
