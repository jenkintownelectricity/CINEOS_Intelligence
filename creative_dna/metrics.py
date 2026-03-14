"""
CINEOS Intelligence — Creative DNA Metrics.

Computes aggregate creative metrics from a project's shot data:
  - Average shot duration
  - Lens diversity index
  - Pacing variance
  - Color consistency score
  - Movement dynamism score
"""

from __future__ import annotations

import math
from collections import Counter
from typing import Any

from .models import ProjectCreativeProfile, ShotMetadata


class CreativeDNAMetrics:
    """Computes high-level creative metrics from production data."""

    def __init__(self, tenant_id: str = "") -> None:
        self.tenant_id = tenant_id

    def compute(self, profile: ProjectCreativeProfile) -> dict[str, float]:
        """Compute all metrics and return as a flat dictionary."""
        shots = profile.shots
        if not shots:
            return {}

        result: dict[str, float] = {}

        result["avg_shot_duration"] = self.avg_shot_duration(shots)
        result["lens_diversity"] = self.lens_diversity(shots)
        result["pacing_variance"] = self.pacing_variance(shots)
        result["color_consistency"] = self.color_consistency(shots)
        result["movement_dynamism"] = self.movement_dynamism(shots)
        result["shot_count"] = float(len(shots))
        result["total_duration"] = sum(
            s.duration_seconds for s in shots if s.duration_seconds > 0
        )

        return result

    # ------------------------------------------------------------------
    # Individual metrics
    # ------------------------------------------------------------------

    def avg_shot_duration(self, shots: list[ShotMetadata]) -> float:
        """Average shot duration in seconds."""
        durations = [s.duration_seconds for s in shots if s.duration_seconds > 0]
        return sum(durations) / len(durations) if durations else 0.0

    def lens_diversity(self, shots: list[ShotMetadata]) -> float:
        """Normalised lens diversity index (0-1).

        Computed as the number of unique focal lengths divided by total
        shots with lens data.  Higher = more diverse lens choices.
        """
        focal_lengths = [
            s.lens.focal_length_mm for s in shots if s.lens is not None
        ]
        if not focal_lengths:
            return 0.0
        unique = len(set(focal_lengths))
        return min(1.0, unique / len(focal_lengths))

    def pacing_variance(self, shots: list[ShotMetadata]) -> float:
        """Normalised pacing variance (coefficient of variation).

        Higher values indicate more varied shot durations (dynamic pacing).
        """
        durations = [s.duration_seconds for s in shots if s.duration_seconds > 0]
        if len(durations) < 2:
            return 0.0
        avg = sum(durations) / len(durations)
        if avg == 0:
            return 0.0
        variance = sum((d - avg) ** 2 for d in durations) / len(durations)
        std = math.sqrt(variance)
        return min(1.0, std / avg)  # coefficient of variation, capped

    def color_consistency(self, shots: list[ShotMetadata]) -> float:
        """Color consistency score (0-1).

        Measures how consistent the saturation and contrast values are
        across shots.  Higher = more consistent.
        """
        saturations: list[float] = []
        contrasts: list[float] = []
        for s in shots:
            if s.color_grade:
                saturations.append(s.color_grade.saturation)
                contrasts.append(s.color_grade.contrast)

        if not saturations:
            return 0.0

        sat_std = _std(saturations)
        con_std = _std(contrasts)
        # Consistency is inverse of variance, normalised
        return max(0.0, 1.0 - (sat_std + con_std) / 2.0)

    def movement_dynamism(self, shots: list[ShotMetadata]) -> float:
        """Movement dynamism score (0-1).

        The fraction of shots with non-static camera movement.
        """
        if not shots:
            return 0.0
        dynamic = sum(
            1 for s in shots if s.camera_movement.value != "static"
        )
        return dynamic / len(shots)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _std(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    avg = sum(values) / len(values)
    variance = sum((v - avg) ** 2 for v in values) / len(values)
    return math.sqrt(variance)
