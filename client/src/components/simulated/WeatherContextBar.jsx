import React from 'react';
import { Wind, Cloud, Activity } from 'lucide-react';

export default function WeatherContextBar({ weather = {}, nodes = [] }) {
  const windDeg = weather.windDeg || 0;
  const windDir = weather.windDir || 'N';
  const windSpeed = weather.windSpeed || 0;
  const condition = weather.condition || '—';
  const plumeActive = !!weather.plumeActive;

  const fireActive = nodes.some(
    (n) => n.hazard_type === 'forest_fire' && n.risk_level !== 'low'
  );
  const airActive = nodes.some(
    (n) => n.hazard_type === 'air_pollution' && n.risk_level !== 'low'
  );

  let plumeLine;
  if (plumeActive && fireActive) {
    plumeLine = `Wildfire smoke + PM plume advection active — airborne contaminants drifting ${windDir} @ ${windSpeed} km/h toward downwind air-quality nodes`;
  } else if (plumeActive && airActive) {
    plumeLine = `PM plume advection active — particulate band drifting ${windDir} @ ${windSpeed} km/h across the corridor`;
  } else if (plumeActive) {
    plumeLine = `Airborne plume advection qualifies — contaminants transported ${windDir} @ ${windSpeed} km/h`;
  } else {
    plumeLine = 'Dispersion conditions stable — no active smoke or PM plume source detected';
  }

  const speedBandClass = windSpeed >= 32
    ? 'bg-[#D9364A]/10 text-[#D9364A] border border-[#D9364A]/40'
    : windSpeed >= 20
      ? 'bg-[#D48806]/10 text-[#D48806] border border-[#D48806]/40'
      : 'bg-[#2E9E6B]/10 text-[#2E9E6B] border border-[#2E9E6B]/40';

  return (
    <div className="console-panel px-3.5 py-2.5">
      <div className="flex flex-col md:flex-row md:items-center gap-3">

        {/* Living compass rose */}
        <div className="flex items-center gap-3">
          <div className="relative w-11 h-11 rounded-full bg-white border border-[#CFD6DE] shadow-sm flex items-center justify-center shrink-0">
            <span className="absolute top-0.5 text-[8px] font-bold text-[#1A2126]">N</span>
            <span className="absolute bottom-0.5 text-[8px] font-bold text-[#8A96A0]">S</span>
            <span className="absolute left-0.5 top-1/2 -translate-y-1/2 text-[8px] font-bold text-[#8A96A0]">W</span>
            <span className="absolute right-0.5 top-1/2 -translate-y-1/2 text-[8px] font-bold text-[#8A96A0]">E</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              style={{ transform: `rotate(${windDeg}deg)` }}
              className="transition-transform duration-700 ease-out"
            >
              <path d="M12 2 L15.5 22 L12 17.5 L8.5 22 Z" fill="#3457D5" />
              <circle cx="12" cy="12" r="1.2" fill="#FFFFFF" />
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#1A2126]">
                Regional wind
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${speedBandClass}`}>
                {windSpeed >= 32 ? 'GUSTY' : windSpeed >= 20 ? 'BRISK' : 'MODERATE'}
              </span>
            </div>
            <div className="text-[11px] text-[#6B7684] mt-0.5">
              From <strong className="text-[#3457D5]">{windDir}</strong> ({windDeg}°) &middot;{' '}
              <strong className="text-[#1A2126]">{windSpeed} km/h</strong> &middot; {condition}
            </div>
          </div>
        </div>

        {/* Plume advection status */}
        <div className={`flex items-center gap-2 md:ml-6 px-3 py-2 rounded-[5px] border text-[11px] ${
          plumeActive
            ? 'bg-[#E85D3D]/[0.06] border-[#E85D3D]/30'
            : 'bg-[#F7F8FA] border-[#E3E7EC]'
        }`}>
          {plumeActive ? (
            <Wind className="w-3.5 h-3.5 text-[#E85D3D] shrink-0" />
          ) : (
            <Cloud className="w-3.5 h-3.5 text-[#8A96A0] shrink-0" />
          )}
          <span className={plumeActive ? 'text-[#1A2126]' : 'text-[#6B7684]'}>
            {plumeLine}
          </span>
        </div>

        {/* Live context chip */}
        <div className="md:ml-auto flex items-center gap-1.5 text-[10px] text-[#6B7684] shrink-0">
          <Activity className="w-3 h-3 text-[#3457D5]" />
          <span>Weather syncs with telemetry cycle</span>
        </div>

      </div>
    </div>
  );
}