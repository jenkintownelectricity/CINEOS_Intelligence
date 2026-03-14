"""
CINEOS Intelligence — Creative DNA Analyzer.

Extracts stylistic features from a project's shot metadata:
  - Lens analytics (focal length distribution, anamorphic ratio)
  - Pacing analytics (shot duration stats, rhythm patterns)
  - Color analytics (palette diversity, temperature spread)
  - Camera movement analytics (movement type distribution)
"""

from __future__ import annotations

import math
from collections import Counter
from typing import Any

from .models import (
    CameraMovement,
    ColorGrade,
    LensInfo,
    ProjectCreativeProfile,
    ShotMetadata,
    ShotType,
)


class CreativeDNAAnalyzer:
    """Extracts stylistic feature vectors from shot-level production data."""

    def __init__(self, tenant_id: str = "") -> None:
        self.tenant_id = tenant_id

    # ------------------------------------------------------------------
    # Top-level analysis
    # ------------------------------------------------------------------

    def analyze(self, profile: ProjectCreativeProfile) -> dict[str, Any]:
        """Run full stylistic analysis on a creative profile.

        Returns a dictionary of analytics sections.
        """
        shots = profile.shots
        if not shots:
            return {"lens": {}, "pacing": {}, "color": {}, "camera_movement": {}}

        return {
            "lens": self.analyze_lens(shots),
            "pacing": self.analyze_pacing(shots),
            "color": self.analyze_color(shots),
            "camera_movement": self.analyze_camera_movement(shots),
            "shot_type_distribution": self.analyze_shot_types(shots),
        }

    # ------------------------------------------------------------------
    # Lens analytics
    # ------------------------------------------------------------------

    def analyze_lens(self, shots: list[ShotMetadata]) -> dict[str, Any]:
        """Analyze lens usage patterns."""
        focal_lengths: list[float] = []
        anamorphic_count = 0
        lens_models: Counter[str] = Counter()

        for shot in shots:
            if shot.lens:
                focal_lengths.append(shot.lens.focal_length_mm)
                if shot.lens.is_anamorphic:
                    anamorphic_count += 1
                if shot.lens.model:
                    lens_models[shot.lens.model] += 1

        if not focal_lengths:
            return {"available": False}

        return {
            "available": True,
            "avg_focal_length_mm": _mean(focal_lengths),
            "min_focal_length_mm": min(focal_lengths),
            "max_focal_length_mm": max(focal_lengths),
            "focal_length_std": _std(focal_lengths),
            "lens_diversity": len(set(focal_lengths)) / max(len(focal_lengths), 1),
            "anamorphic_ratio": anamorphic_count / len(shots),
            "top_lens_models": dict(lens_models.most_common(5)),
        }

    # ------------------------------------------------------------------
    # Pacing analytics
    # ------------------------------------------------------------------

    def analyze_pacing(self, shots: list[ShotMetadata]) -> dict[str, Any]:
        """Analyze editing pace from shot durations."""
        durations = [s.duration_seconds for s in shots if s.duration_seconds > 0]
        if not durations:
            return {"available": False}

        total = sum(durations)
        avg = _mean(durations)
        std = _std(durations)

        # Classify pacing
        if avg < 2.0:
            pace_label = "fast"
        elif avg < 5.0:
            pace_label = "moderate"
        else:
            pace_label = "slow"

        # Shot duration variance (normalised)
        variance_norm = std / avg if avg > 0 else 0

        return {
            "available": True,
            "avg_shot_duration_sec": avg,
            "min_shot_duration_sec": min(durations),
            "max_shot_duration_sec": max(durations),
            "std_shot_duration_sec": std,
            "total_duration_sec": total,
            "shot_count": len(durations),
            "pacing_variance": variance_norm,
            "pace_label": pace_label,
            "cuts_per_minute": (len(durations) / total * 60) if total > 0 else 0,
        }

    # ------------------------------------------------------------------
    # Color analytics
    # ------------------------------------------------------------------

    def analyze_color(self, shots: list[ShotMetadata]) -> dict[str, Any]:
        """Analyze color grading patterns."""
        hues: list[float] = []
        saturations: list[float] = []
        luminances: list[float] = []
        contrasts: list[float] = []
        temperatures: list[float] = []

        for shot in shots:
            if not shot.color_grade:
                continue
            cg = shot.color_grade
            if cg.primary_hue is not None:
                hues.append(cg.primary_hue)
            saturations.append(cg.saturation)
            luminances.append(cg.luminance)
            contrasts.append(cg.contrast)
            if cg.temperature_kelvin is not None:
                temperatures.append(cg.temperature_kelvin)

        if not saturations:
            return {"available": False}

        result: dict[str, Any] = {
            "available": True,
            "avg_saturation": _mean(saturations),
            "avg_luminance": _mean(luminances),
            "avg_contrast": _mean(contrasts),
        }

        if hues:
            result["hue_diversity"] = _std(hues) / 180.0  # normalised
            result["avg_hue"] = _mean(hues)
        if temperatures:
            result["avg_temperature_k"] = _mean(temperatures)
            result["temperature_range_k"] = max(temperatures) - min(temperatures)

        return result

    # ------------------------------------------------------------------
    # Camera movement analytics
    # ------------------------------------------------------------------

    def analyze_camera_movement(self, shots: list[ShotMetadata]) -> dict[str, Any]:
        """Analyze camera movement distribution."""
        movements = [s.camera_movement.value for s in shots]
        counter = Counter(movements)
        total = len(movements)

        static_pct = counter.get("static", 0) / total if total else 0

        return {
            "distribution": dict(counter.most_common()),
            "static_percentage": static_pct,
            "dynamic_percentage": 1.0 - static_pct,
            "movement_diversity": len(counter) / len(CameraMovement),
        }

    # ------------------------------------------------------------------
    # Shot type distribution
    # ------------------------------------------------------------------

    def analyze_shot_types(self, shots: list[ShotMetadata]) -> dict[str, Any]:
        """Analyze shot type distribution."""
        types = [s.shot_type.value for s in shots]
        counter = Counter(types)
        total = len(types)

        return {
            "distribution": {k: v / total for k, v in counter.most_common()},
            "type_diversity": len(counter) / len(ShotType),
            "dominant_type": counter.most_common(1)[0][0] if counter else None,
        }


# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------


def _mean(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def _std(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    avg = _mean(values)
    variance = sum((v - avg) ** 2 for v in values) / len(values)
    return math.sqrt(variance)
