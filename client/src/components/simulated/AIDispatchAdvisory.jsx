import React from 'react';
import { ShieldAlert, Users, Compass, Truck, CheckCircle2, AlertTriangle, Radio } from 'lucide-react';

export default function AIDispatchAdvisory({ aiAdvisory, stats }) {
  const riskIndex = aiAdvisory?.regionalRiskIndex || stats?.regionalRiskIndex || 12;
  const citizensAtRisk = aiAdvisory?.citizensAtRisk || 0;
  const dispatch = aiAdvisory?.recommendedDispatch || [];
  const corridors = aiAdvisory?.evacuationCorridors || [];

  const getRiskColor = (idx) => {
    if (idx >= 65) return '#D9364A';
    if (idx >= 35) return '#D48806';
    return '#2E9E6B';
  };

  const riskColor = getRiskColor(riskIndex);

  return (
    <div className="bg-[#FFFFFF] border border-[#E3E7EC] rounded-[8px] p-4 shadow-[0_1px_3px_rgba(16,24,32,0.04)]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#EDEFF2]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[6px] bg-[#3457D5]/10 flex items-center justify-center text-[#3457D5]">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#1A2126] uppercase tracking-wide">
              AI Disaster Impact & Emergency Dispatch Hub
            </h3>
            <p className="text-[11px] text-[#6B7684]">
              Autonomous decision intelligence for NDRF, SDMA, and District Disaster Management
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-center">
          <span className="w-2 h-2 rounded-full bg-[#2E9E6B] animate-pulse" />
          <span className="text-[11px] font-semibold text-[#1A2126]">Tactical AI Active</span>
        </div>
      </div>

      {/* Main Stats Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3">
        
        {/* Metric 1: Regional Risk Index */}
        <div className="bg-[#F7F8FA] p-3 rounded-[6px] border border-[#E3E7EC] flex items-center justify-between">
          <div>
            <div className="text-[11px] text-[#6B7684] font-medium">Regional Risk Index</div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-bold font-sensor-num" style={{ color: riskColor }}>
                {riskIndex}
              </span>
              <span className="text-xs text-[#6B7684]">/ 100</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: `${riskColor}18`, color: riskColor }}>
            {riskIndex >= 65 ? 'CRIT' : riskIndex >= 35 ? 'WARN' : 'CALM'}
          </div>
        </div>

        {/* Metric 2: Citizens in Danger Zones */}
        <div className="bg-[#F7F8FA] p-3 rounded-[6px] border border-[#E3E7EC] flex items-center justify-between">
          <div>
            <div className="text-[11px] text-[#6B7684] font-medium">Population in Impact Zone</div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={`text-2xl font-bold font-sensor-num ${citizensAtRisk > 0 ? 'text-[#D9364A]' : 'text-[#1A2126]'}`}>
                {citizensAtRisk.toLocaleString()}
              </span>
              <span className="text-xs text-[#6B7684]">citizens</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-[6px] bg-[#3457D5]/10 flex items-center justify-center text-[#3457D5]">
            <Users className="w-4 h-4" />
          </div>
        </div>

        {/* Metric 3: Active Incident Nodes */}
        <div className="bg-[#F7F8FA] p-3 rounded-[6px] border border-[#E3E7EC] flex items-center justify-between">
          <div>
            <div className="text-[11px] text-[#6B7684] font-medium">Active Hazard Clusters</div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-bold font-sensor-num text-[#D48806]">
                {(stats?.criticalNodes || 0) + (stats?.warningNodes || 0)}
              </span>
              <span className="text-xs text-[#6B7684]">of {stats?.totalNodes || 21} nodes</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-[6px] bg-[#D48806]/10 flex items-center justify-center text-[#D48806]">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

      </div>

      {/* Two Column Layout: Recommended Responder Deployment + Evacuation Routes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mt-2">
        
        {/* Responder Battalion Deployment (7 cols) */}
        <div className="lg:col-span-7 bg-[#F7F8FA] p-3 rounded-[6px] border border-[#E3E7EC]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#1A2126] flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-[#3457D5]" />
              Prioritized Emergency Responder Routing
            </span>
            <span className="text-[10px] text-[#6B7684] font-mono">Live Dispatch Feed</span>
          </div>

          {dispatch.length > 0 ? (
            <div className="space-y-2">
              {dispatch.map((d, i) => (
                <div key={i} className="bg-[#FFFFFF] p-2.5 rounded-[4px] border border-[#E3E7EC] flex items-center justify-between gap-2 shadow-xs">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#1A2126]">{d.unit}</span>
                    <span className="text-[11px] text-[#6B7684] mt-0.5">{d.action}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    d.priority === 'IMMEDIATE'
                      ? 'bg-[#D9364A]/15 text-[#D9364A] border border-[#D9364A]/30'
                      : 'bg-[#D48806]/15 text-[#D48806] border border-[#D48806]/30'
                  }`}>
                    {d.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#FFFFFF] p-3 rounded-[4px] border border-[#E3E7EC] text-xs text-[#2E9E6B] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>All 21 regional nodes nominal. Emergency responder units on standby at district headquarters.</span>
            </div>
          )}
        </div>

        {/* Evacuation Corridors (5 cols) */}
        <div className="lg:col-span-5 bg-[#F7F8FA] p-3 rounded-[6px] border border-[#E3E7EC]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#1A2126] flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#3457D5]" />
              Evacuation Corridors
            </span>
          </div>

          <div className="space-y-1.5">
            {corridors.map((c, i) => (
              <div key={i} className="bg-[#FFFFFF] p-2 rounded-[4px] border border-[#E3E7EC] flex items-center justify-between text-xs">
                <span className="font-semibold text-[#1A2126]">{c.route}</span>
                <span className="text-[10px] text-[#6B7684] font-medium">{c.status}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
