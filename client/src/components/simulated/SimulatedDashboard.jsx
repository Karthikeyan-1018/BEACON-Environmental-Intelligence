import React, { useState, useMemo } from 'react';
import SimulatedBanner from './SimulatedBanner';
import SimulationPlaybackBar from './SimulationPlaybackBar';
import RegionalStatsBar from './RegionalStatsBar';
import AIDispatchAdvisory from './AIDispatchAdvisory';
import ScenarioControl from './ScenarioControl';
import HazardFilterBar from './HazardFilterBar';
import RegionalMap from './RegionalMap';
import LiveAlertFeed from './LiveAlertFeed';
import NodeDetailModal from './NodeDetailModal';
import HistoricalAnalytics from './HistoricalAnalytics';
import NotificationSimulator from './NotificationSimulator';
import NodeHealthPanel from './NodeHealthPanel';
import WeatherContextBar from './WeatherContextBar';

export default function SimulatedDashboard({ simData, playback = {} }) {
  const [selectedHazard, setSelectedHazard] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedZone, setSelectedZone] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const nodes = simData?.nodes || [];
  const stats = simData?.stats || {};
  const alerts = simData?.alerts || [];
  const aiAdvisory = simData?.aiAdvisory || {};

  // Resolve the selected node live so the detail modal tracks the freshest
  // snapshot instead of freezing at the moment the marker was clicked.
  const selectedNode = nodes.find((n) => n.node_id === selectedNodeId) || null;

  // Extract unique zones
  const uniqueZones = useMemo(() => {
    const set = new Set();
    nodes.forEach((n) => {
      if (n.zone) set.add(n.zone);
    });
    return Array.from(set);
  }, [nodes]);

  // Filter nodes based on user selections
  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      if (selectedHazard !== 'all' && n.hazard_type !== selectedHazard) {
        return false;
      }
      if (selectedSeverity !== 'all' && n.risk_level !== selectedSeverity) {
        return false;
      }
      if (selectedZone !== 'all' && n.zone !== selectedZone) {
        return false;
      }
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchName = n.name && n.name.toLowerCase().includes(query);
        const matchId = n.node_id && n.node_id.toLowerCase().includes(query);
        const matchZone = n.zone && n.zone.toLowerCase().includes(query);
        if (!matchName && !matchId && !matchZone) return false;
      }
      return true;
    });
  }, [nodes, selectedHazard, selectedSeverity, selectedZone, searchTerm]);

  const handleSelectNodeById = (nodeId) => {
    setSelectedNodeId(nodeId);
  };

  return (
    <div className="space-y-3.5">
      
      {/* 1. Simulated Data Notice Banner */}
      <SimulatedBanner />

      {/* 2. Regional Weather Context: wind vane, speed, plume-advection explainer */}
      <WeatherContextBar weather={stats?.weather || {}} nodes={nodes} />

      {/* 3. Timeline Playback & Speed Controller */}
      <SimulationPlaybackBar stats={stats} playback={playback} />

      {/* 4. Top Metric Statistics Strip */}
      <RegionalStatsBar stats={stats} />

      {/* 5. AI Disaster Impact & Emergency Dispatch Advisory Hub */}
      <AIDispatchAdvisory aiAdvisory={aiAdvisory} stats={stats} nodes={nodes} />

      {/* 6. Scenario Injector Strip */}
      <ScenarioControl />

      {/* 7. Historical Analytics: daily/weekly risk trends & hazard-type counts */}
      <HistoricalAnalytics analytics={simData?.analytics || {}} />

      {/* 8. Node health monitoring: battery, LoRa link, last-seen, connection */}
      <NodeHealthPanel nodes={nodes} />

      {/* 9. Filter Toolbar */}
      <HazardFilterBar
        selectedHazard={selectedHazard}
        setSelectedHazard={setSelectedHazard}
        selectedSeverity={selectedSeverity}
        setSelectedSeverity={setSelectedSeverity}
        selectedZone={selectedZone}
        setSelectedZone={setSelectedZone}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        zones={uniqueZones}
      />

      {/* 10. Map-First Operations Layout: Map (~65% width) + Docked Alert Feed (~35% width) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        
        {/* Map-First Viewport (~65% width) */}
        <div className="lg:col-span-8 h-[580px]">
          <RegionalMap
            nodes={filteredNodes}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNodeId}
            weather={stats?.weather || {}}
          />
        </div>

        {/* Docked Side Panel Alert Feed (~35% width) */}
        <div className="lg:col-span-4 h-[580px]">
          <LiveAlertFeed
            alerts={alerts}
            onSelectNodeById={handleSelectNodeById}
          />
        </div>

      </div>

      {/* 11. Node Detail Inspector Modal */}
      {selectedNode && (
        <NodeDetailModal
          node={selectedNode}
          onClose={() => setSelectedNodeId(null)}
        />
      )}

      {/* 12. Notification simulation overlay (SMS / authority / citizen cards) */}
      <NotificationSimulator alerts={alerts} />

    </div>
  );
}
