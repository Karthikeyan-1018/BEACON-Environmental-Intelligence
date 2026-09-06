import React from 'react';
import { HAZARD_COLORS } from '../../hazardTheme';

export default function RegionalStatsBar({ stats = {} }) {
  const {
    totalNodes = 21,
    criticalNodes = 0,
    warningNodes = 0,
    regionalRiskIndex = 18,
    hazardBreakdown = {}
  } = stats;

  const totalInAlert = criticalNodes + warningNodes;

  let riskLabel = 'Low risk';
  let riskBadgeClass = 'badge-risk-low';

  if (regionalRiskIndex >= 70) {
    riskLabel = 'Critical risk';
    riskBadgeClass = 'badge-risk-high';
  } else if (regionalRiskIndex >= 40) {
    riskLabel = 'Elevated threat';
    riskBadgeClass = 'badge-risk-medium';
  } else if (regionalRiskIndex >= 25) {
    riskLabel = 'Moderate';
    riskBadgeClass = 'bg-[#3457D5]/10 text-[#3457D5] border border-[#3457D5]/30 px-1.5 py-0.5 rounded-[3px] text-[11px] font-medium';
  }

  const hazardList = [
    { key: 'flood', label: 'Flood' },
    { key: 'forest_fire', label: 'Fire' },
    { key: 'air_pollution', label: 'Pollution' },
    { key: 'extreme_heat', label: 'Heat' },
    { key: 'landslide', label: 'Landslide' },
    { key: 'chemical_leak', label: 'Chemical' },
    { key: 'water_quality', label: 'Water' }
  ];

  return (
    <div className="console-panel p-3 space-y-2.5">
      
      {/* Top Row: 4 Metric Blocks */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        
        {/* Network Coverage */}
        <div className="bg-[#F7F8FA] p-2.5 rounded-[4px] border border-[#E3E7EC]">
          <span className="text-[11px] text-[#6B7684] block">
            Network coverage
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-semibold text-[#1A2126]">
              {totalNodes}
            </span>
            <span className="text-xs text-[#6B7684]">/ 21 nodes online</span>
          </div>
        </div>

        {/* Active Hazard Nodes */}
        <div className="bg-[#F7F8FA] p-2.5 rounded-[4px] border border-[#E3E7EC]">
          <span className="text-[11px] text-[#6B7684] block">
            Active alert nodes
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className={`text-xl font-semibold ${
              criticalNodes > 0 ? 'text-[#D9364A]' : (warningNodes > 0 ? 'text-[#D48806]' : 'text-[#2E9E6B]')
            }`}>
              {totalInAlert}
            </span>
            <span className="text-xs text-[#6B7684]">
              ({criticalNodes} critical, {warningNodes} warning)
            </span>
          </div>
        </div>

        {/* Composite Regional Risk */}
        <div className="bg-[#F7F8FA] p-2.5 rounded-[4px] border border-[#E3E7EC]">
          <span className="text-[11px] text-[#6B7684] block">
            Composite risk index
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl font-semibold text-[#1A2126]">
              {regionalRiskIndex}
            </span>
            <span className="text-xs text-[#6B7684]">/ 100</span>
            <span className={riskBadgeClass}>
              {riskLabel}
            </span>
          </div>
        </div>

        {/* AI Confidence */}
        <div className="bg-[#F7F8FA] p-2.5 rounded-[4px] border border-[#E3E7EC]">
          <span className="text-[11px] text-[#6B7684] block">
            Model verification
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-semibold text-[#1A2126]">
              94.8%
            </span>
            <span className="text-xs text-[#2E9E6B] font-medium">confidence</span>
          </div>
        </div>

      </div>

      {/* Bottom Row: Hazard Type Breakdown */}
      <div className="pt-2 border-t border-[#EDEFF2] flex items-center gap-2 overflow-x-auto pb-0.5">
        <span className="text-[11px] text-[#6B7684] shrink-0 mr-1">
          Hazard breakdown:
        </span>
        {hazardList.map((h) => {
          const data = hazardBreakdown[h.key] || { total: 3, inAlert: 0 };
          const hasAlert = data.inAlert > 0;
          const hColor = HAZARD_COLORS[h.key] || '#6B7684';

          return (
            <div
              key={h.key}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] border text-xs shrink-0 ${
                hasAlert
                  ? 'badge-risk-high'
                  : 'bg-[#F7F8FA] border-[#E3E7EC] text-[#6B7684]'
              }`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: hColor }}
              />
              <span>{h.label}:</span>
              <span className={hasAlert ? 'font-semibold text-[#D9364A]' : 'text-[#1A2126] font-medium'}>
                {data.inAlert}/{data.total}
              </span>
            </div>
          );
        })}
      </div>

    </div>
  );
}
