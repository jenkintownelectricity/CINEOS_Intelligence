"""
CINEOS Intelligence — Timeline Mutation Trace Linkage Contract.

Links timeline mutations to execution traces and intelligence analysis
outputs, enabling the intelligence system to correlate editorial changes
with AI-driven analysis results. This supports the Wave 3 requirement
for timeline → trace/intelligence linkage.

Classification: SCAFFOLD — linkage contract defined, wiring foundational.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional
import uuid


@dataclass
class TimelineMutationTraceLink:
    """Links a timeline mutation to an execution trace and optional intelligence output.

    This enables tracing which execution runs and AI analysis were active
    when a particular timeline edit operation occurred.
    """

    link_id: str
    mutation_id: str
    timeline_id: str
    trace_id: str
    execution_id: Optional[str] = None
    intelligence_output_type: Optional[str] = None  # creative_dna | knowledge_query | analysis_result
    intelligence_output_ref: Optional[str] = None
    operation_type: str = ""  # insert | trim | split | move | replace | remove
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: dict[str, Any] = field(default_factory=dict)

    @staticmethod
    def create(
        mutation_id: str,
        timeline_id: str,
        trace_id: str,
        operation_type: str = "",
        execution_id: Optional[str] = None,
        intelligence_output_type: Optional[str] = None,
        intelligence_output_ref: Optional[str] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> TimelineMutationTraceLink:
        """Factory method for creating a new trace linkage."""
        return TimelineMutationTraceLink(
            link_id=str(uuid.uuid4()),
            mutation_id=mutation_id,
            timeline_id=timeline_id,
            trace_id=trace_id,
            execution_id=execution_id,
            intelligence_output_type=intelligence_output_type,
            intelligence_output_ref=intelligence_output_ref,
            operation_type=operation_type,
            metadata=metadata or {},
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "link_id": self.link_id,
            "mutation_id": self.mutation_id,
            "timeline_id": self.timeline_id,
            "trace_id": self.trace_id,
            "execution_id": self.execution_id,
            "intelligence_output_type": self.intelligence_output_type,
            "intelligence_output_ref": self.intelligence_output_ref,
            "operation_type": self.operation_type,
            "created_at": self.created_at.isoformat(),
            "metadata": dict(self.metadata),
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> TimelineMutationTraceLink:
        if not isinstance(data, dict):
            raise ValueError(f"Expected dict, got {type(data).__name__}")
        required = {"link_id", "mutation_id", "timeline_id", "trace_id"}
        missing = required - set(data.keys())
        if missing:
            raise ValueError(f"Missing required keys: {missing}")
        created_at_raw = data.get("created_at")
        if isinstance(created_at_raw, str):
            created_at = datetime.fromisoformat(created_at_raw)
        elif isinstance(created_at_raw, datetime):
            created_at = created_at_raw
        else:
            created_at = datetime.now(timezone.utc)
        return cls(
            link_id=str(data["link_id"]),
            mutation_id=str(data["mutation_id"]),
            timeline_id=str(data["timeline_id"]),
            trace_id=str(data["trace_id"]),
            execution_id=data.get("execution_id"),
            intelligence_output_type=data.get("intelligence_output_type"),
            intelligence_output_ref=data.get("intelligence_output_ref"),
            operation_type=str(data.get("operation_type", "")),
            created_at=created_at,
            metadata=dict(data.get("metadata", {})),
        )

    def __repr__(self) -> str:
        return (
            f"TimelineMutationTraceLink(link_id={self.link_id!r}, "
            f"mutation={self.mutation_id!r}, "
            f"trace={self.trace_id!r})"
        )
