/**
 * Ecosystem Intelligence Bridge
 * CINEOS Intelligence — Wave 10 (Platform Ecosystem)
 *
 * Non-authoritative intelligence analysis of plugin behavior, anomaly detection,
 * and usage insights. All outputs carry authoritative: false and provenance.
 *
 * No plugin may mutate CDG or registry directly.
 * Plugin capability kernel is ABSENT — policy_bounded_runtime_contract only.
 * All ecosystem integrations subordinate to Trust-Identity + Network Federation kernels.
 */

export interface PluginActionEntry {
  action_id: string;
  plugin_id: string;
  action_type: string;
  timestamp: string;
  scope_used: string[];
  result: 'allowed' | 'denied' | 'fail_closed';
}

export interface BehaviorAnalysisResult {
  plugin_id: string;
  patterns: BehaviorPattern[];
  analysis_timestamp: string;
  authoritative: false;
  provenance: ProvenanceRef[];
}

export interface BehaviorPattern {
  pattern_type: 'frequent_action' | 'scope_concentration' | 'temporal_cluster' | 'error_spike';
  description: string;
  confidence: number;
  supporting_action_ids: string[];
}

export interface AnomalyIndicator {
  plugin_id: string;
  anomaly_type: 'unusual_scope_access' | 'frequency_spike' | 'denied_action_cluster' | 'temporal_anomaly';
  severity: 'low' | 'medium' | 'high';
  description: string;
  detected_at: string;
  supporting_evidence: string[];
  authoritative: false;
  provenance: ProvenanceRef[];
}

export interface UsageInsight {
  plugin_id: string;
  insight_type: 'most_used_capability' | 'peak_usage_window' | 'scope_utilization' | 'error_rate';
  summary: string;
  data: Record<string, unknown>;
  generated_at: string;
  authoritative: false;
  provenance: ProvenanceRef[];
}

export interface ProvenanceRef {
  entity_type: string;
  entity_id: string;
  relationship: string;
}

/**
 * Ecosystem Intelligence Bridge.
 *
 * All outputs are non-authoritative. No CDG or registry mutation permitted.
 * Fail-closed on any violation.
 */
export class EcosystemIntelligenceBridge {
  private actionStore: Map<string, PluginActionEntry[]> = new Map();

  /**
   * Ingest plugin action history for analysis.
   */
  ingestActions(pluginId: string, actions: PluginActionEntry[]): void {
    const existing = this.actionStore.get(pluginId) ?? [];
    this.actionStore.set(pluginId, [...existing, ...actions]);
  }

  /**
   * Analyze plugin behavior patterns. Returns non-authoritative analysis.
   */
  analyzePluginBehavior(pluginId: string, actionHistory: PluginActionEntry[]): BehaviorAnalysisResult {
    const patterns: BehaviorPattern[] = [];

    // Detect frequent actions
    const actionCounts = new Map<string, string[]>();
    for (const action of actionHistory) {
      const ids = actionCounts.get(action.action_type) ?? [];
      ids.push(action.action_id);
      actionCounts.set(action.action_type, ids);
    }
    for (const [actionType, ids] of actionCounts) {
      if (ids.length >= 3) {
        patterns.push({
          pattern_type: 'frequent_action',
          description: `Action "${actionType}" observed ${ids.length} times`,
          confidence: Math.min(ids.length / 10, 1.0),
          supporting_action_ids: ids,
        });
      }
    }

    // Detect error spikes
    const deniedActions = actionHistory.filter((a) => a.result === 'denied' || a.result === 'fail_closed');
    if (deniedActions.length >= 2) {
      patterns.push({
        pattern_type: 'error_spike',
        description: `${deniedActions.length} denied/fail-closed actions detected`,
        confidence: Math.min(deniedActions.length / 5, 1.0),
        supporting_action_ids: deniedActions.map((a) => a.action_id),
      });
    }

    return {
      plugin_id: pluginId,
      patterns,
      analysis_timestamp: new Date().toISOString(),
      authoritative: false,
      provenance: [
        { entity_type: 'intelligence_bridge', entity_id: 'ecosystem-bridge', relationship: 'analyzed_by' },
        { entity_type: 'plugin_action_history', entity_id: pluginId, relationship: 'derived_from' },
      ],
    };
  }

  /**
   * Detect anomalous plugin activity. Returns non-authoritative indicators.
   */
  detectAnomalousPluginActivity(pluginId: string): AnomalyIndicator[] {
    const actions = this.actionStore.get(pluginId) ?? [];
    const anomalies: AnomalyIndicator[] = [];

    // Check for denied action clusters
    const deniedActions = actions.filter((a) => a.result === 'denied' || a.result === 'fail_closed');
    if (deniedActions.length >= 2) {
      anomalies.push({
        plugin_id: pluginId,
        anomaly_type: 'denied_action_cluster',
        severity: deniedActions.length >= 5 ? 'high' : deniedActions.length >= 3 ? 'medium' : 'low',
        description: `${deniedActions.length} denied actions detected for plugin ${pluginId}`,
        detected_at: new Date().toISOString(),
        supporting_evidence: deniedActions.map((a) => a.action_id),
        authoritative: false,
        provenance: [
          { entity_type: 'intelligence_bridge', entity_id: 'ecosystem-bridge', relationship: 'detected_by' },
          { entity_type: 'plugin_action_history', entity_id: pluginId, relationship: 'derived_from' },
        ],
      });
    }

    // Check for unusual scope access breadth
    const uniqueScopes = new Set(actions.flatMap((a) => a.scope_used));
    if (uniqueScopes.size >= 5) {
      anomalies.push({
        plugin_id: pluginId,
        anomaly_type: 'unusual_scope_access',
        severity: uniqueScopes.size >= 10 ? 'high' : 'medium',
        description: `Plugin ${pluginId} accessed ${uniqueScopes.size} distinct scopes`,
        detected_at: new Date().toISOString(),
        supporting_evidence: [...uniqueScopes],
        authoritative: false,
        provenance: [
          { entity_type: 'intelligence_bridge', entity_id: 'ecosystem-bridge', relationship: 'detected_by' },
        ],
      });
    }

    return anomalies;
  }

  /**
   * Generate usage pattern insights. Returns non-authoritative insights.
   */
  generatePluginUsageInsights(pluginId: string): UsageInsight[] {
    const actions = this.actionStore.get(pluginId) ?? [];
    const insights: UsageInsight[] = [];

    // Most used capability
    const capCounts = new Map<string, number>();
    for (const action of actions) {
      capCounts.set(action.action_type, (capCounts.get(action.action_type) ?? 0) + 1);
    }
    let topCap = '';
    let topCount = 0;
    for (const [cap, count] of capCounts) {
      if (count > topCount) { topCap = cap; topCount = count; }
    }
    if (topCap) {
      insights.push({
        plugin_id: pluginId,
        insight_type: 'most_used_capability',
        summary: `Most used capability: "${topCap}" with ${topCount} invocations`,
        data: { capability: topCap, count: topCount },
        generated_at: new Date().toISOString(),
        authoritative: false,
        provenance: [
          { entity_type: 'intelligence_bridge', entity_id: 'ecosystem-bridge', relationship: 'generated_by' },
          { entity_type: 'plugin_action_history', entity_id: pluginId, relationship: 'derived_from' },
        ],
      });
    }

    // Error rate
    const totalActions = actions.length;
    const errorActions = actions.filter((a) => a.result === 'denied' || a.result === 'fail_closed').length;
    if (totalActions > 0) {
      const errorRate = errorActions / totalActions;
      insights.push({
        plugin_id: pluginId,
        insight_type: 'error_rate',
        summary: `Error rate: ${(errorRate * 100).toFixed(1)}% (${errorActions}/${totalActions})`,
        data: { error_rate: errorRate, error_count: errorActions, total_count: totalActions },
        generated_at: new Date().toISOString(),
        authoritative: false,
        provenance: [
          { entity_type: 'intelligence_bridge', entity_id: 'ecosystem-bridge', relationship: 'generated_by' },
        ],
      });
    }

    return insights;
  }
}
