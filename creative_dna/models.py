"""
Pydantic models for the CINEOS Creative DNA system.

These models represent the data structures flowing through the creative
analytics pipeline: shot metadata, editorial decisions, lens info, color
grading data, and the resulting fingerprint vectors.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class ShotType(str, Enum):
    EXTREME_WIDE = "extreme_wide"
    WIDE = "wide"
    MEDIUM_WIDE = "medium_wide"
    MEDIUM = "medium"
    MEDIUM_CLOSE = "medium_close"
    CLOSE_UP = "close_up"
    EXTREME_CLOSE_UP = "extreme_close_up"
    INSERT = "insert"
    OVER_THE_SHOULDER = "over_the_shoulder"
    POV = "pov"
    AERIAL = "aerial"
    OTHER = "other"


class CameraMovement(str, Enum):
    STATIC = "static"
    PAN = "pan"
    TILT = "tilt"
    DOLLY = "dolly"
    CRANE = "crane"
    STEADICAM = "steadicam"
    HANDHELD = "handheld"
    DRONE = "drone"
    ZOOM = "zoom"
    RACK_FOCUS = "rack_focus"
    OTHER = "other"


# ---------------------------------------------------------------------------
# Input models — raw production data
# ---------------------------------------------------------------------------

class LensInfo(BaseModel):
    """Lens metadata for a single shot or setup."""
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    focal_length_mm: float = Field(..., gt=0, description="Focal length in mm")
    aperture: Optional[float] = None  # T-stop or f-stop
    is_anamorphic: bool = False


class ColorGrade(BaseModel):
    """Simplified colour-grading decision for a shot or scene."""
    primary_hue: Optional[float] = Field(None, ge=0, le=360, description="Dominant hue angle")
    saturation: float = Field(0.5, ge=0.0, le=1.0)
    luminance: float = Field(0.5, ge=0.0, le=1.0)
    contrast: float = Field(0.5, ge=0.0, le=1.0)
    temperature_kelvin: Optional[float] = None
    lut_name: Optional[str] = None
    palette_rgb: List[Tuple[int, int, int]] = Field(
        default_factory=list,
        description="Key colours as (R, G, B) tuples",
    )


class ShotMetadata(BaseModel):
    """Metadata for a single editorial shot (between two cuts)."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    sequence_index: int = Field(..., ge=0, description="Position in the edit timeline")
    start_timecode: float = Field(..., ge=0, description="Start time in seconds")
    end_timecode: float = Field(..., ge=0, description="End time in seconds")
    duration_seconds: float = Field(0.0, ge=0)
    shot_type: ShotType = ShotType.OTHER
    camera_movement: CameraMovement = CameraMovement.STATIC
    lens: Optional[LensInfo] = None
    color_grade: Optional[ColorGrade] = None
    scene_id: Optional[str] = None
    notes: Optional[str] = None
    properties: Dict[str, Any] = Field(default_factory=dict)

    def __init__(self, **data: Any):
        super().__init__(**data)
        if self.duration_seconds == 0.0 and self.end_timecode > self.start_timecode:
            object.__setattr__(
                self,
                "duration_seconds",
                self.end_timecode - self.start_timecode,
            )


class ProjectCreativeProfile(BaseModel):
    """Aggregated creative metadata submitted for analysis."""
    project_id: str
    tenant_id: str
    title: str = ""
    shots: List[ShotMetadata] = Field(default_factory=list)
    total_runtime_seconds: Optional[float] = None
    submitted_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Output models — fingerprints and comparisons
# ---------------------------------------------------------------------------

class FingerprintDimension(BaseModel):
    """One axis of the creative fingerprint vector."""
    name: str
    value: float = Field(..., description="Normalised 0-1 score")
    raw_value: Optional[float] = None
    unit: Optional[str] = None
    description: Optional[str] = None


class CreativeDNAFingerprint(BaseModel):
    """
    A multi-dimensional 'creative DNA fingerprint' for a project or filmmaker.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    entity_id: str = Field(..., description="Project or person ID")
    entity_type: str = Field("project", description="project | person")
    tenant_id: str
    dimensions: List[FingerprintDimension] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    version: str = "1.0"

    def to_vector(self) -> List[float]:
        """Return a flat numeric vector of dimension values."""
        return [d.value for d in self.dimensions]

    def dimension_dict(self) -> Dict[str, float]:
        return {d.name: d.value for d in self.dimensions}


class FingerprintComparison(BaseModel):
    """Result of comparing two creative fingerprints."""
    fingerprint_a_id: str
    fingerprint_b_id: str
    similarity_score: float = Field(..., ge=0.0, le=1.0)
    dimension_deltas: Dict[str, float] = Field(default_factory=dict)
    compared_at: datetime = Field(default_factory=datetime.utcnow)


class StyleEvolutionPoint(BaseModel):
    """A snapshot of a fingerprint at a specific point in time."""
    entity_id: str
    project_id: str
    timestamp: datetime
    fingerprint: CreativeDNAFingerprint
