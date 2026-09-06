import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  FastForward, 
  RotateCcw, 
  SkipForward, 
  GitMerge, 
  Sparkles,
  Gauge
} from 'lucide-react';
import socket from '../../socket';

export default function SimulationPlaybackBar({ stats, playback, onReset }) {
  const [speed, setSpeed] = useState(stats?.speed || 1);
  const [isPaused, setIsPaused] = useState(!!stats?.isPaused);
  const [activeCascade, setActiveCascade] = useState(stats?.activeCascade || null);
  const [feedback, setFeedback] = useState('');

  // Reflect server-pushed playback status (backend or cross-client control changes).
  useEffect(() => {
    if (!playback) return;
    if (typeof playback.speed === 'number') setSpeed(playback.speed);
    if (typeof playback.isPaused === 'boolean') setIsPaused(playback.isPaused);
    setActiveCascade(playback.activeCascade || null);
  }, [playback]);

  const handleTogglePause = () => {
    setIsPaused(!isPaused);
    socket.emit('client-sim-pause');
  };

  const handleSetSpeed = (multiplier) => {
    setSpeed(multiplier);
    socket.emit('client-sim-speed', multiplier);
  };

  const handleStep = () => {
    socket.emit('client-sim-step');
  };

  const handleTriggerCascade = (scenarioName) => {
    setActiveCascade(scenarioName);
    socket.emit('client-sim-cascade', scenarioName);
    const labels = {
      monsoon_deluge: 'Monsoon Deluge',
      wildfire_spread: 'Wildfire Smoke Drift',
      chemical_plume: 'Chemical Plume'
    };
    setFeedback(`Cascade active: ${labels[scenarioName] || scenarioName} — other hazards held nominal until reset`);
    window.setTimeout(() => setFeedback(''), 6000);
  };

  const handleReset = () => {
    setActiveCascade(null);
    socket.emit('client-reset-scenario');
    setFeedback('All nodes restored to nominal baseline — auto-drift resumed');
    window.setTimeout(() => setFeedback(''), 6000);
    if (onReset) onReset();
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#E3E7EC] rounded-[8px] p-3.5 shadow-[0_1px_3px_rgba(16,24,32,0.04)] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      
      {/* Left: Playback & Speed Controls */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1.5">
          {/* Play / Pause */}
          <button
            onClick={handleTogglePause}
            className={`px-3 py-1.5 rounded-[5px] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
              isPaused
                ? 'bg-[#3457D5] text-[#FFFFFF] hover:bg-[#2A48B8]'
                : 'bg-[#F1F3F6] text-[#1A2126] hover:bg-[#E3E7EC]'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
            <span>{isPaused ? 'Resume Sim' : 'Pause'}</span>
          </button>

          {/* Step Forward */}
          <button
            onClick={handleStep}
            className="p-1.5 bg-[#FFFFFF] border border-[#E3E7EC] hover:bg-[#F1F3F6] rounded-[5px] text-[#6B7684] hover:text-[#1A2126] transition-colors"
            title="Step forward 1 simulation cycle"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Speed Multipliers */}
        <div className="flex items-center bg-[#F1F3F6] p-0.5 rounded-[5px] border border-[#E3E7EC]">
          <span className="text-[10px] text-[#6B7684] px-1.5 font-bold uppercase">Cadence:</span>
          {[
            { val: 0.5, label: '0.5x (Calm)' },
            { val: 1, label: '1x (Normal)' },
            { val: 2, label: '2x (Fast)' }
          ].map((s) => (
            <button
              key={s.val}
              onClick={() => handleSetSpeed(s.val)}
              className={`px-2 py-0.5 rounded-[3px] text-xs font-semibold transition-all ${
                speed === s.val
                  ? 'bg-[#FFFFFF] text-[#3457D5] shadow-xs'
                  : 'text-[#6B7684] hover:text-[#1A2126]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Live Cadence Status */}
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#6B7684] ml-1">
          <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-[#D48806]' : 'bg-[#2E9E6B] animate-pulse'}`} />
          <span>{isPaused ? 'Simulation Paused' : `Cycle: ${(4.5 / speed).toFixed(1)}s`}</span>
        </div>
      </div>

      {/* Right: Disaster Cascade Injections & Reset */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-[#6B7684] font-medium mr-1">
          <GitMerge className="w-3.5 h-3.5 text-[#3457D5]" />
          <span>Disaster Cascade:</span>
        </div>

        <button
          onClick={() => handleTriggerCascade('monsoon_deluge')}
          className={`px-2.5 py-1 rounded-[5px] text-xs font-semibold border transition-all ${
            activeCascade === 'monsoon_deluge'
              ? 'bg-[#2B7FD4]/15 border-[#2B7FD4] text-[#2B7FD4] shadow-xs'
              : 'bg-[#FFFFFF] border-[#E3E7EC] text-[#1A2126] hover:border-[#2B7FD4]/60'
          }`}
        >
          🌊 Monsoon Deluge
        </button>

        <button
          onClick={() => handleTriggerCascade('wildfire_spread')}
          className={`px-2.5 py-1 rounded-[5px] text-xs font-semibold border transition-all ${
            activeCascade === 'wildfire_spread'
              ? 'bg-[#E85D3D]/15 border-[#E85D3D] text-[#E85D3D] shadow-xs'
              : 'bg-[#FFFFFF] border-[#E3E7EC] text-[#1A2126] hover:border-[#E85D3D]/60'
          }`}
        >
          🔥 Wildfire Smoke Drift
        </button>

        <button
          onClick={() => handleTriggerCascade('chemical_plume')}
          className={`px-2.5 py-1 rounded-[5px] text-xs font-semibold border transition-all ${
            activeCascade === 'chemical_plume'
              ? 'bg-[#E23B72]/15 border-[#E23B72] text-[#E23B72] shadow-xs'
              : 'bg-[#FFFFFF] border-[#E3E7EC] text-[#1A2126] hover:border-[#E23B72]/60'
          }`}
        >
          ☣️ Chemical Plume
        </button>

        <button
          onClick={handleReset}
          className="px-2.5 py-1 bg-[#FFFFFF] border border-[#E3E7EC] hover:bg-[#F1F3F6] rounded-[5px] text-xs font-medium text-[#6B7684] hover:text-[#1A2126] flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Cascade lock status / feedback */}
      {feedback && (
        <div className="w-full flex items-center gap-1.5 text-[11px] text-[#3457D5] bg-[#3457D5]/10 border border-[#3457D5]/25 px-2.5 py-1 rounded-[3px]">
          <Sparkles className="w-3 h-3 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

    </div>
  );
}
