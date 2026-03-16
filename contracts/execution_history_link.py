"""
Execution History Linkage Contract for CINEOS Intelligence.

Provides the data model for linking intelligence analysis results
(creative DNA, knowledge graph queries) to specific graph execution
runs. This enables tracing which intelligence outputs were produced
during which execution, supporting the durability pass requirement
for execution history persistence.

Classification: SCAFFOLD — linkage contract defined, not yet wired to live execution.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class ExecutionHistoryLink:
    """Links an intelligence output to a specific graph execution run."""
    link_id: str
    execution_id: str
    graph_id: str
    intelligence_output_type: str  # 'creative_dna' | 'knowledge_query' | 'analysis_result'
    output_ref: str  # URI or ID of the intelligence output
    created_at: datetime = field(default_factory=datetime.utcnow)
    metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            'link_id': self.link_id,
            'execution_id': self.execution_id,
            'graph_id': self.graph_id,
            'intelligence_output_type': self.intelligence_output_type,
            'output_ref': self.output_ref,
            'created_at': self.created_at.isoformat(),
            'metadata': self.metadata,
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'ExecutionHistoryLink':
        return cls(
            link_id=data['link_id'],
            execution_id=data['execution_id'],
            graph_id=data['graph_id'],
            intelligence_output_type=data['intelligence_output_type'],
            output_ref=data['output_ref'],
            created_at=datetime.fromisoformat(data['created_at']),
            metadata=data.get('metadata', {}),
        )


@dataclass
class ExecutionHistoryLinkSet:
    """Collection of intelligence-to-execution links for a given execution run."""
    execution_id: str
    links: list[ExecutionHistoryLink] = field(default_factory=list)

    def add_link(self, link: ExecutionHistoryLink) -> None:
        if link.execution_id != self.execution_id:
            raise ValueError(
                f"Link execution_id '{link.execution_id}' does not match "
                f"set execution_id '{self.execution_id}'"
            )
        self.links.append(link)

    def to_dict(self) -> dict:
        return {
            'execution_id': self.execution_id,
            'links': [link.to_dict() for link in self.links],
            'link_count': len(self.links),
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'ExecutionHistoryLinkSet':
        link_set = cls(execution_id=data['execution_id'])
        for link_data in data.get('links', []):
            link_set.links.append(ExecutionHistoryLink.from_dict(link_data))
        return link_set
