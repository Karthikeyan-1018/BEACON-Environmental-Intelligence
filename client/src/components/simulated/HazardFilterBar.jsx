import React from 'react';
import { Search, X } from 'lucide-react';
import { HAZARD_COLORS } from '../../hazardTheme';

export default function HazardFilterBar({
  selectedHazard,
  setSelectedHazard,
  selectedSeverity,
  setSelectedSeverity,
  selectedZone,
  setSelectedZone,
  searchTerm,
  setSearchTerm,
  zones = []
}) {
  const hazardOptions = [
    { key: 'all', label: 'All hazards' },
    { key: 'flood', label: 'Flood' },
    { key: 'forest_fire', label: 'Forest fire' },
    { key: 'air_pollution', label: 'Air pollution' },
    { key: 'extreme_heat', label: 'Extreme heat' },
    { key: 'landslide', label: 'Landslide' },
    { key: 'chemical_leak', label: 'Chemical leak' },
    { key: 'water_quality', label: 'Water quality' }
  ];

  const severityOptions = [
    { key: 'all', label: 'All severities' },
    { key: 'high', label: 'Critical only' },
    { key: 'medium', label: 'Elevated only' },
    { key: 'low', label: 'Nominal only' }
  ];

  return (
    <div className="console-panel p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
      
      {/* Left: Hazard Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 md:pb-0">
        <span className="text-[11px] text-[#6B7684] shrink-0 mr-1">
          Filter:
        </span>
        {hazardOptions.map((h) => {
          const isSelected = selectedHazard === h.key;
          const hColor = h.key !== 'all' ? HAZARD_COLORS[h.key] : null;

          return (
            <button
              key={h.key}
              onClick={() => setSelectedHazard(h.key)}
              style={
                isSelected && hColor
                  ? { borderColor: hColor, color: hColor, backgroundColor: `${hColor}14` }
                  : {}
              }
              className={`console-btn whitespace-nowrap flex items-center gap-1.5 ${
                isSelected
                  ? (hColor ? 'font-medium' : 'console-btn-active font-medium')
                  : 'text-[#6B7684] hover:text-[#1A2126]'
              }`}
            >
              {hColor && (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: hColor,
                    opacity: isSelected ? 1 : 0.7
                  }}
                />
              )}
              {h.label}
            </button>
          );
        })}
      </div>

      {/* Right: Severity & Zone Selectors + Search */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selectedSeverity}
          onChange={(e) => setSelectedSeverity(e.target.value)}
          className="bg-[#FFFFFF] border border-[#E3E7EC] text-[#1A2126] text-xs rounded-[4px] px-2.5 py-1.5 focus:outline-none focus:border-[#3457D5] cursor-pointer"
        >
          {severityOptions.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          value={selectedZone}
          onChange={(e) => setSelectedZone(e.target.value)}
          className="bg-[#FFFFFF] border border-[#E3E7EC] text-[#1A2126] text-xs rounded-[4px] px-2.5 py-1.5 focus:outline-none focus:border-[#3457D5] max-w-[150px] truncate cursor-pointer"
        >
          <option value="all">All zones</option>
          {zones.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>

        <div className="relative">
          <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B7684]" />
          <input
            type="text"
            placeholder="Search node or zone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-[#FFFFFF] border border-[#E3E7EC] text-[#1A2126] text-xs rounded-[4px] pl-7 pr-6 py-1.5 focus:outline-none focus:border-[#3457D5] w-[140px] sm:w-[160px]"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#6B7684] hover:text-[#1A2126]"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
