"""
CINEOS Intelligence — Creative DNA Tests

Tests for the knowledge graph (fingerprint), stylistic feature extraction
(analyzer), and creative analytics.
"""

from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from creative_dna.analyzer import CreativeDNAAnalyzer
from creative_dna.fingerprint import FingerprintEngine
from creative_dna.events import (
    ANALYSIS_COMPLETED,
    CLOUD_EVENTS_SPEC_VERSION,
    CloudEvent,
    FINGERPRINT_COMPARED,
    FINGERPRINT_GENERATED,
    PROFILE_INGESTED,
    analysis_completed_event,
    fingerprint_compared_event,
    fingerprint_generated_event,
    profile_ingested_event,
)
from creative_dna.models import (
    CameraMovement,
    ColorGrade,
    CreativeDNAFingerprint,
    FingerprintDimension,
    LensInfo,
    ProjectCreativeProfile,
    ShotMetadata,
    ShotType,
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

TENANT_A = "studio-alpha"
PROJECT_A = "film-001"
PROJECT_B = "film-002"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _shot(
    index: int,
    duration: float = 5.0,
    shot_type: ShotType = ShotType.MEDIUM,
    focal_length: float = 50.0,
    camera_movement: CameraMovement = CameraMovement.STATIC,
    primary_hue: float | None = None,
) -> ShotMetadata:
    lens = LensInfo(focal_length_mm=focal_length)
    grade = None
    if primary_hue is not None:
        grade = ColorGrade(primary_hue=primary_hue, saturation=0.6, luminance=0.5)
    return ShotMetadata(
        project_id=PROJECT_A,
        sequence_index=index,
        start_timecode=index * duration,
        end_timecode=(index + 1) * duration,
        duration_seconds=duration,
        shot_type=shot_type,
        camera_movement=camera_movement,
        lens=lens,
        color_grade=grade,
    )


def _profile(
    project_id: str = PROJECT_A,
    shots: list[ShotMetadata] | None = None,
    runtime: float = 60.0,
) -> ProjectCreativeProfile:
    if shots is None:
        shots = [_shot(i) for i in range(12)]
    return ProjectCreativeProfile(
        project_id=project_id,
        tenant_id=TENANT_A,
        title="Test Film",
        shots=shots,
        total_runtime_seconds=runtime,
    )


# ---------------------------------------------------------------------------
# Analyzer tests
# ---------------------------------------------------------------------------

class TestCreativeDNAAnalyzer:
    """Test stylistic feature extraction."""

    def test_analyse_returns_complete_report(self) -> None:
        analyzer = CreativeDNAAnalyzer()
        profile = _profile()
        report = analyzer.analyse(profile)
        assert report["project_id"] == PROJECT_A
        assert "fingerprint" in report
        assert "pacing" in report
        assert "lenses" in report
        assert "color" in report
        assert "composition" in report

    def test_generate_fingerprint(self) -> None:
        analyzer = CreativeDNAAnalyzer()
        profile = _profile()
        fp = analyzer.generate_fingerprint(profile)
        assert isinstance(fp, CreativeDNAFingerprint)
        assert fp.entity_id == PROJECT_A
        assert fp.entity_type == "project"
        assert fp.tenant_id == TENANT_A
        assert len(fp.dimensions) > 0

    def test_fingerprint_dimension_names(self) -> None:
        analyzer = CreativeDNAAnalyzer()
        fp = analyzer.generate_fingerprint(_profile())
        dim_names = {d.name for d in fp.dimensions}
        assert "avg_shot_duration" in dim_names
        assert "cut_frequency" in dim_names
        assert "lens_diversity" in dim_names
        assert "color_consistency" in dim_names

    def test_fingerprint_values_normalised(self) -> None:
        analyzer = CreativeDNAAnalyzer()
        fp = analyzer.generate_fingerprint(_profile())
        for d in fp.dimensions:
            assert 0.0 <= d.value <= 1.0, f"{d.name} value {d.value} out of [0,1]"

    def test_pacing_analytics(self) -> None:
        analyzer = CreativeDNAAnalyzer()
        shots = [_shot(i, duration=5.0) for i in range(10)]
        pacing = analyzer.pacing_analytics(shots, runtime_seconds=50.0)
        assert "average_shot_duration_s" in pacing
        assert pacing["average_shot_duration_s"] > 0

    def test_lens_analytics(self) -> None:
        analyzer = CreativeDNAAnalyzer()
        shots = [
            _shot(0, focal_length=24),
            _shot(1, focal_length=50),
            _shot(2, focal_length=85),
        ]
        lenses = analyzer.lens_analytics(shots)
        assert "diversity_index" in lenses
        assert lenses["diversity_index"] > 0

    def test_ingest_profile(self) -> None:
        analyzer = CreativeDNAAnalyzer()
        profile = _profile()
        analyzer.ingest_profile(profile)
        assert PROJECT_A in analyzer._profiles


# ---------------------------------------------------------------------------
# Fingerprint engine tests
# ---------------------------------------------------------------------------

class TestFingerprintEngine:
    """Test fingerprint generation, comparison, and evolution."""

    def test_generate_stores_fingerprint(self) -> None:
        engine = FingerprintEngine()
        fp = engine.generate(_profile())
        assert fp.id in engine._store

    def test_compare_identical_fingerprints(self) -> None:
        engine = FingerprintEngine()
        fp1 = engine.generate(_profile())
        fp2 = engine.generate(_profile())
        comparison = engine.compare(fp1, fp2)
        assert comparison.similarity_score > 0.99

    def test_compare_different_profiles(self) -> None:
        engine = FingerprintEngine()
        fast_shots = [_shot(i, duration=1.5) for i in range(20)]
        slow_shots = [_shot(i, duration=15.0) for i in range(4)]
        fp_fast = engine.generate(_profile(shots=fast_shots, runtime=30.0))
        fp_slow = engine.generate(_profile(project_id=PROJECT_B, shots=slow_shots, runtime=60.0))
        comparison = engine.compare(fp_fast, fp_slow)
        assert comparison.similarity_score < 1.0
        assert len(comparison.dimension_deltas) > 0

    def test_cosine_similarity(self) -> None:
        assert FingerprintEngine.cosine_similarity([1, 0], [1, 0]) == pytest.approx(1.0)
        assert FingerprintEngine.cosine_similarity([1, 0], [0, 1]) == pytest.approx(0.0)
        assert FingerprintEngine.cosine_similarity([], []) == 0.0

    def test_euclidean_distance(self) -> None:
        assert FingerprintEngine.euclidean_distance([0, 0], [3, 4]) == pytest.approx(5.0)

    def test_find_most_similar(self) -> None:
        engine = FingerprintEngine()
        target = engine.generate(_profile())
        similar = engine.generate(_profile(project_id="p2"))
        different_shots = [_shot(i, duration=20.0, shot_type=ShotType.EXTREME_WIDE) for i in range(3)]
        different = engine.generate(_profile(project_id="p3", shots=different_shots, runtime=60.0))
        results = engine.find_most_similar(target, top_n=2)
        result_ids = [fp.id for fp, score in results]
        assert similar.id in result_ids

    def test_filmmaker_fingerprint(self) -> None:
        engine = FingerprintEngine()
        profiles = [_profile(project_id=f"p{i}") for i in range(3)]
        fp = engine.generate_filmmaker_fingerprint("filmmaker-1", TENANT_A, profiles)
        assert fp.entity_type == "person"
        assert fp.entity_id == "filmmaker-1"
        assert len(fp.dimensions) > 0

    def test_filmmaker_fingerprint_empty_profiles(self) -> None:
        engine = FingerprintEngine()
        fp = engine.generate_filmmaker_fingerprint("filmmaker-2", TENANT_A, [])
        assert fp.dimensions == []

    def test_record_evolution_point(self) -> None:
        engine = FingerprintEngine()
        profile = _profile()
        point = engine.record_evolution_point("entity-1", PROJECT_A, profile)
        assert point.entity_id == "entity-1"
        assert point.fingerprint is not None

    def test_get_style_evolution(self) -> None:
        engine = FingerprintEngine()
        engine.record_evolution_point("e1", "p1", _profile(project_id="p1"))
        engine.record_evolution_point("e1", "p2", _profile(project_id="p2"))
        evolution = engine.get_style_evolution("e1")
        assert len(evolution) == 2
        assert "dimensions" in evolution[0]

    def test_style_drift(self) -> None:
        engine = FingerprintEngine()
        fast = _profile(project_id="p1", shots=[_shot(i, duration=2.0) for i in range(15)], runtime=30.0)
        slow = _profile(project_id="p2", shots=[_shot(i, duration=12.0) for i in range(5)], runtime=60.0)
        engine.record_evolution_point("filmmaker-1", "p1", fast)
        engine.record_evolution_point("filmmaker-1", "p2", slow)
        drift = engine.style_drift("filmmaker-1")
        assert drift is not None
        assert drift > 0

    def test_style_drift_insufficient_data(self) -> None:
        engine = FingerprintEngine()
        assert engine.style_drift("nobody") is None


# ---------------------------------------------------------------------------
# CloudEvent tests
# ---------------------------------------------------------------------------

class TestCreativeDNAEvents:
    """Test CloudEvent factory functions."""

    def test_profile_ingested_event(self) -> None:
        event = profile_ingested_event(
            project_id=PROJECT_A, tenant_id=TENANT_A,
            shot_count=24, title="Test Film",
        )
        assert event.type == PROFILE_INGESTED
        assert event.specversion == CLOUD_EVENTS_SPEC_VERSION
        assert event.tenant_id == TENANT_A
        assert event.data["shot_count"] == 24

    def test_fingerprint_generated_event(self) -> None:
        event = fingerprint_generated_event(
            entity_id=PROJECT_A, entity_type="project",
            tenant_id=TENANT_A, fingerprint_id="fp-1",
            dimension_count=7,
        )
        assert event.type == FINGERPRINT_GENERATED
        assert event.data["dimension_count"] == 7

    def test_fingerprint_compared_event(self) -> None:
        event = fingerprint_compared_event(
            fingerprint_a_id="fp-1", fingerprint_b_id="fp-2",
            similarity_score=0.85, tenant_id=TENANT_A,
        )
        assert event.type == FINGERPRINT_COMPARED
        assert event.data["similarity_score"] == 0.85

    def test_analysis_completed_event(self) -> None:
        event = analysis_completed_event(
            project_id=PROJECT_A, tenant_id=TENANT_A,
            metrics_summary={"shot_count": 100, "avg_duration": 4.5},
        )
        assert event.type == ANALYSIS_COMPLETED
        assert event.data["metrics_summary"]["shot_count"] == 100

    def test_event_unique_ids(self) -> None:
        e1 = profile_ingested_event(PROJECT_A, TENANT_A, 10)
        e2 = profile_ingested_event(PROJECT_A, TENANT_A, 10)
        assert e1.id != e2.id
