"""
CINEOS Intelligence — Creative DNA CloudEvents.

CloudEvents v1.0 definitions for the creative analytics domain:
  - creative_dna.analysis.completed
  - creative_dna.fingerprint.generated
  - creative_dna.fingerprint.compared
  - creative_dna.metrics.computed
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id() -> str:
    return str(uuid.uuid4())


_SOURCE = "cineos://intelligence/creative-dna"
_SPEC_VERSION = "1.0"


@dataclass
class _CreativeDNACloudEventBase:
    specversion: str = field(default=_SPEC_VERSION, init=False)
    id: str = field(default_factory=_new_id)
    source: str = field(default=_SOURCE, init=False)
    time: str = field(default_factory=_now_iso)
    datacontenttype: str = field(default="application/json", init=False)
    tenantid: str = ""
    projectid: str = ""


@dataclass
class AnalysisCompletedEvent(_CreativeDNACloudEventBase):
    type: str = field(default="creative_dna.analysis.completed", init=False)
    data: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def create(
        cls,
        project_id: str,
        shot_count: int = 0,
        sections: list[str] | None = None,
        tenant_id: str = "",
    ) -> AnalysisCompletedEvent:
        return cls(
            tenantid=tenant_id,
            projectid=project_id,
            data={
                "project_id": project_id,
                "shot_count": shot_count,
                "sections": sections or [],
            },
        )


@dataclass
class FingerprintGeneratedEvent(_CreativeDNACloudEventBase):
    type: str = field(default="creative_dna.fingerprint.generated", init=False)
    data: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def create(
        cls,
        fingerprint_id: str,
        entity_id: str,
        dimension_count: int = 0,
        tenant_id: str = "",
        project_id: str = "",
    ) -> FingerprintGeneratedEvent:
        return cls(
            tenantid=tenant_id,
            projectid=project_id,
            data={
                "fingerprint_id": fingerprint_id,
                "entity_id": entity_id,
                "dimension_count": dimension_count,
            },
        )


@dataclass
class FingerprintComparedEvent(_CreativeDNACloudEventBase):
    type: str = field(default="creative_dna.fingerprint.compared", init=False)
    data: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def create(
        cls,
        fingerprint_a_id: str,
        fingerprint_b_id: str,
        similarity_score: float,
        tenant_id: str = "",
    ) -> FingerprintComparedEvent:
        return cls(
            tenantid=tenant_id,
            data={
                "fingerprint_a_id": fingerprint_a_id,
                "fingerprint_b_id": fingerprint_b_id,
                "similarity_score": similarity_score,
            },
        )


@dataclass
class MetricsComputedEvent(_CreativeDNACloudEventBase):
    type: str = field(default="creative_dna.metrics.computed", init=False)
    data: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def create(
        cls,
        project_id: str,
        metric_names: list[str] | None = None,
        tenant_id: str = "",
    ) -> MetricsComputedEvent:
        return cls(
            tenantid=tenant_id,
            projectid=project_id,
            data={
                "project_id": project_id,
                "metric_names": metric_names or [],
            },
        )
