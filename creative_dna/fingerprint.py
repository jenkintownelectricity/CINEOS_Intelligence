"""
CINEOS Intelligence — Creative DNA Fingerprint.

Generates a multi-dimensional fingerprint vector from stylistic
analysis results, and provides comparison utilities.
"""

from __future__ import annotations

import math
from typing import Any

from .analyzer import CreativeDNAAnalyzer
from .models import (
    CreativeDNAFingerprint,
    FingerprintComparison,
    FingerprintDimension,
    ProjectCreativeProfile,
)


class FingerprintGenerator:
    """Generates :class:`CreativeDNAFingerprint` from a project's creative profile."""

    def __init__(self, tenant_id: str = "") -> None:
        self.tenant_id = tenant_id
        self._analyzer = CreativeDNAAnalyzer(tenant_id=tenant_id)

    def generate(self, profile: ProjectCreativeProfile) -> CreativeDNAFingerprint:
        """Generate a creative fingerprint from a project profile.

        The fingerprint has the following dimensions (all normalised 0-1):
          - avg_shot_duration  (capped at 30s)
          - pacing_variance
          - lens_diversity
          - avg_focal_length   (normalised 10-200mm)
          - anamorphic_ratio
          - avg_saturation
          - avg_contrast
          - avg_luminance
          - static_camera_pct
          - movement_diversity
          - shot_type_diversity
          - cuts_per_minute    (capped at 60)
        """
        analysis = self._analyzer.analyze(profile)
        dimensions: list[FingerprintDimension] = []

        # Pacing dimensions
        pacing = analysis.get("pacing", {})
        if pacing.get("available"):
            dimensions.extend([
                FingerprintDimension(
                    name="avg_shot_duration",
                    value=_clamp(pacing["avg_shot_duration_sec"] / 30.0),
                    raw_value=pacing["avg_shot_duration_sec"],
                    unit="seconds",
                ),
                FingerprintDimension(
                    name="pacing_variance",
                    value=_clamp(pacing["pacing_variance"]),
                    raw_value=pacing["pacing_variance"],
                ),
                FingerprintDimension(
                    name="cuts_per_minute",
                    value=_clamp(pacing["cuts_per_minute"] / 60.0),
                    raw_value=pacing["cuts_per_minute"],
                    unit="cuts/min",
                ),
            ])

        # Lens dimensions
        lens = analysis.get("lens", {})
        if lens.get("available"):
            dimensions.extend([
                FingerprintDimension(
                    name="lens_diversity",
                    value=_clamp(lens["lens_diversity"]),
                    raw_value=lens["lens_diversity"],
                ),
                FingerprintDimension(
                    name="avg_focal_length",
                    value=_clamp((lens["avg_focal_length_mm"] - 10.0) / 190.0),
                    raw_value=lens["avg_focal_length_mm"],
                    unit="mm",
                ),
                FingerprintDimension(
                    name="anamorphic_ratio",
                    value=_clamp(lens["anamorphic_ratio"]),
                    raw_value=lens["anamorphic_ratio"],
                ),
            ])

        # Color dimensions
        color = analysis.get("color", {})
        if color.get("available"):
            dimensions.extend([
                FingerprintDimension(
                    name="avg_saturation",
                    value=_clamp(color["avg_saturation"]),
                    raw_value=color["avg_saturation"],
                ),
                FingerprintDimension(
                    name="avg_contrast",
                    value=_clamp(color["avg_contrast"]),
                    raw_value=color["avg_contrast"],
                ),
                FingerprintDimension(
                    name="avg_luminance",
                    value=_clamp(color["avg_luminance"]),
                    raw_value=color["avg_luminance"],
                ),
            ])

        # Camera movement dimensions
        cam_move = analysis.get("camera_movement", {})
        if cam_move:
            dimensions.extend([
                FingerprintDimension(
                    name="static_camera_pct",
                    value=_clamp(cam_move.get("static_percentage", 0)),
                    raw_value=cam_move.get("static_percentage", 0),
                ),
                FingerprintDimension(
                    name="movement_diversity",
                    value=_clamp(cam_move.get("movement_diversity", 0)),
                    raw_value=cam_move.get("movement_diversity", 0),
                ),
            ])

        # Shot type dimensions
        shot_dist = analysis.get("shot_type_distribution", {})
        if shot_dist:
            dimensions.append(
                FingerprintDimension(
                    name="shot_type_diversity",
                    value=_clamp(shot_dist.get("type_diversity", 0)),
                    raw_value=shot_dist.get("type_diversity", 0),
                )
            )

        return CreativeDNAFingerprint(
            entity_id=profile.project_id,
            entity_type="project",
            tenant_id=profile.tenant_id,
            dimensions=dimensions,
        )


def compare_fingerprints(
    fp_a: CreativeDNAFingerprint,
    fp_b: CreativeDNAFingerprint,
) -> FingerprintComparison:
    """Compare two fingerprints and return a similarity score + dimension deltas."""
    dims_a = fp_a.dimension_dict()
    dims_b = fp_b.dimension_dict()

    all_dims = set(dims_a.keys()) | set(dims_b.keys())
    deltas: dict[str, float] = {}
    vec_a: list[float] = []
    vec_b: list[float] = []

    for dim in sorted(all_dims):
        va = dims_a.get(dim, 0.0)
        vb = dims_b.get(dim, 0.0)
        deltas[dim] = vb - va
        vec_a.append(va)
        vec_b.append(vb)

    similarity = _cosine_similarity(vec_a, vec_b) if vec_a else 0.0

    return FingerprintComparison(
        fingerprint_a_id=fp_a.id,
        fingerprint_b_id=fp_b.id,
        similarity_score=max(0.0, min(1.0, similarity)),
        dimension_deltas=deltas,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)
