import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import socket from '../../socket';
import { HAZARD_COLORS } from '../../hazardTheme';

export default function ScenarioControl() {
  const [activeScenario, setActiveScenario] = useState(null);
  const [feedback, setFeedback] = useState('');

  const scenarios = [
    { key: 'flood', label: 'Flash flood', desc: 'Flash flood surge', color: HAZARD_COLORS.flood },
    { key: 'forest_fire', label: 'Forest fire', desc: 'Nilgiris forest fire', color: HAZARD_COLORS.forest_fire },
    { key: 'chemical_leak', label: 'Chemical leak', desc: 'Industrial chemical leak', color: HAZARD_COLORS.chemical_leak },
    { key: 'landslide', label: 'Landslide', desc: 'Coonoor ghat landslide', color: HAZARD_COLORS.landslide },
    { key: 'extreme_heat', label: 'Heat wave', desc: 'Urban heat core', color: HAZARD_COLORS.extreme_heat }
  ];

  const trigger = (type, label) => {
    setActiveScenario(type);
    socket.emit('client-trigger-scenario', type);
    setFeedback(`Active scenario: ${label} — other hazards held nominal until reset`);
    setTimeout(() => setFeedback(''), 6000);
  };

  const resetAll = () => {
    setActiveScenario(null);
    socket.emit('client-reset-scenario');
    setFeedback('All 21 nodes restored to nominal baseline — auto-drift resumed');
    setTimeout(() => setFeedback(''), 6000);
  };

  return (
    <div className="console-panel p-2.5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        
        {/* Label */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#1A2126]">
            Scenario simulation:
          </span>
          <span className="text-[11px] text-[#6B7684]">
            Inject multi-hazard escalation cycles
          </span>
        </div>

        {/* Hazard-Coded Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {scenarios.map((s) => {
            const isActive = activeScenario === s.key;
            return (
              <button
                key={s.key}
                onClick={() => trigger(s.key, s.desc)}
                style={
                  isActive
                    ? { borderColor: s.color, color: s.color, backgroundColor: `${s.color}14` }
                    : {}
                }
                className={`console-btn flex items-center gap-1.5 ${
                  isActive ? 'font-medium' : 'text-[#6B7684] hover:text-[#1A2126]'
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: s.color,
                    opacity: isActive ? 1 : 0.7
                  }}
                />
                {s.label}
              </button>
            );
          })}

          <button
            onClick={resetAll}
            className="console-btn hover:text-[#1A2126]"
            title="Restore all simulated nodes to nominal status"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset nominal</span>
          </button>
        </div>

      </div>

      {feedback && (
        <div className="mt-2 text-xs text-[#3457D5] bg-[#3457D5]/10 px-2.5 py-1 rounded-[3px] border border-[#3457D5]/25">
          <span>{feedback}</span>
        </div>
      )}
    </div>
  );
}
