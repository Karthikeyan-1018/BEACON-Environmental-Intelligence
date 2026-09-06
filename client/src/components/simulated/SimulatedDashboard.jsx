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

export default function SimulatedDashboard({ simData }) {
  const [selectedHazard, setSelectedHazard] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedZone, setSelectedZone] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);

  const nodes = simData?.nodes || [];
  const stats = simData?.stats || {};
  const alerts = simData?.alerts || [];
  const aiAdvisory = simData?.aiAdvisory || {};

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
    const found = nodes.find((n) => n.node_id === nodeId);
    if (found) {
      setSelectedNode(found);
    }
  };

  return (
    <div className="space-y-3.5">
      
      {/* 1. Simulated Data Notice Banner */}
      <SimulatedBanner />

      {/* 2. Timeline Playback & Speed Controller */}
      <SimulationPlaybackBar stats={stats} />

      {/* 3. Top Metric Statistics Strip */}
      <RegionalStatsBar stats={stats} />

      {/* 4. AI Disaster Impact & Emergency Dispatch Advisory Hub */}
      <AIDispatchAdvisory aiAdvisory={aiAdvisory} stats={stats} />

      {/* 5. Scenario Injector Strip */}
      <ScenarioControl />

      {/* 6. Filter Toolbar */}
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

      {/* 7. Map-First Operations Layout: Map (~65% width) + Docked Alert Feed (~35% width) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        
        {/* Map-First Viewport (~65% width) */}
        <div className="lg:col-span-8 h-[580px]">
          <RegionalMap
            nodes={filteredNodes}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
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

      {/* 8. Node Detail Inspector Modal */}
      {selectedNode && (
        <NodeDetailModal
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}

    </div>
  );
}
