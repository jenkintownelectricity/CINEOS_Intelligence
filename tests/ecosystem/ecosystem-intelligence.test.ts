/**
 * Ecosystem Intelligence Bridge Tests
 *
 * Verifies non-authoritative behavior analysis, anomaly detection,
 * and usage insights — all outputs carry authoritative: false and provenance.
 */

import { describe, it, expect } from 'vitest';
import {
  EcosystemIntelligenceBridge,
  type PluginActionEntry,
} from '../../src/ecosystem/ecosystem-intelligence-bridge';

// --- Mock Data ---

function makeActions(count: number, overrides?: Partial<PluginActionEntry>): PluginActionEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    action_id: `action-${i}`,
    plugin_id: 'plugin-001',
    action_type: 'read_timeline',
    timestamp: `2026-03-16T0${i}:00:00Z`,
    scope_used: ['project:proj-001'],
    result: 'allowed' as const,
    ...overrides,
  }));
}

// --- Tests ---

describe('EcosystemIntelligenceBridge', () => {
  it('behavior analysis returns non-authoritative results with provenance', () => {
    const bridge = new EcosystemIntelligenceBridge();
    const actions = makeActions(5);

    const result = bridge.analyzePluginBehavior('plugin-001', actions);

    expect(result.plugin_id).toBe('plugin-001');
    expect(result.authoritative).toBe(false);
    expect(result.provenance.length).toBeGreaterThan(0);
    expect(result.provenance.some((p) => p.entity_type === 'intelligence_bridge')).toBe(true);
    expect(result.provenance.some((p) => p.relationship === 'derived_from')).toBe(true);
    // Should detect frequent_action pattern for 5 identical action types
    expect(result.patterns.some((p) => p.pattern_type === 'frequent_action')).toBe(true);
  });

  it('behavior analysis detects error spike pattern', () => {
    const bridge = new EcosystemIntelligenceBridge();
    const actions = [
      ...makeActions(2, { result: 'denied' }),
      ...makeActions(1, { action_id: 'action-ok', result: 'allowed' }),
    ];

    const result = bridge.analyzePluginBehavior('plugin-001', actions);

    expect(result.authoritative).toBe(false);
    expect(result.patterns.some((p) => p.pattern_type === 'error_spike')).toBe(true);
  });

  it('anomaly detection returns indicators with provenance', () => {
    const bridge = new EcosystemIntelligenceBridge();
    const deniedActions = makeActions(3, { result: 'denied' });
    bridge.ingestActions('plugin-001', deniedActions);

    const anomalies = bridge.detectAnomalousPluginActivity('plugin-001');

    expect(anomalies.length).toBeGreaterThan(0);
    const deniedCluster = anomalies.find((a) => a.anomaly_type === 'denied_action_cluster');
    expect(deniedCluster).toBeDefined();
    expect(deniedCluster!.authoritative).toBe(false);
    expect(deniedCluster!.provenance.length).toBeGreaterThan(0);
    expect(deniedCluster!.provenance.some((p) => p.entity_type === 'intelligence_bridge')).toBe(true);
  });

  it('anomaly detection returns empty for clean plugin', () => {
    const bridge = new EcosystemIntelligenceBridge();
    bridge.ingestActions('plugin-clean', makeActions(2, { plugin_id: 'plugin-clean', result: 'allowed' }));

    const anomalies = bridge.detectAnomalousPluginActivity('plugin-clean');
    expect(anomalies).toHaveLength(0);
  });

  it('usage insights carry authoritative: false', () => {
    const bridge = new EcosystemIntelligenceBridge();
    bridge.ingestActions('plugin-001', makeActions(4));

    const insights = bridge.generatePluginUsageInsights('plugin-001');

    expect(insights.length).toBeGreaterThan(0);
    for (const insight of insights) {
      expect(insight.authoritative).toBe(false);
      expect(insight.provenance.length).toBeGreaterThan(0);
    }

    const topCap = insights.find((i) => i.insight_type === 'most_used_capability');
    expect(topCap).toBeDefined();
    expect(topCap!.data).toHaveProperty('capability', 'read_timeline');
  });

  it('usage insights include error rate with provenance', () => {
    const bridge = new EcosystemIntelligenceBridge();
    const mixed = [...makeActions(3), ...makeActions(1, { action_id: 'denied-1', result: 'denied' })];
    bridge.ingestActions('plugin-002', mixed);

    const insights = bridge.generatePluginUsageInsights('plugin-002');
    const errorRate = insights.find((i) => i.insight_type === 'error_rate');

    expect(errorRate).toBeDefined();
    expect(errorRate!.authoritative).toBe(false);
    expect(errorRate!.provenance.length).toBeGreaterThan(0);
    expect((errorRate!.data as { error_rate: number }).error_rate).toBeCloseTo(0.25);
  });
});
