import React from 'react';
import { Info } from 'lucide-react';

export default function SimulatedBanner() {
  return (
    <div className="console-panel px-3.5 py-2.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="text-[#3457D5]">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#1A2126]">
                Simulated regional network
              </span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-[2px] bg-[#3457D5]/10 text-[#3457D5] border border-[#3457D5]/25">
                Simulated data
              </span>
            </div>
            <p className="text-[11px] text-[#6B7684] mt-0.5">
              Demonstrating regional multi-hazard architecture across 21 nodes and 7 disaster classes in the Western Ghats corridor
            </p>
          </div>
        </div>

        <div className="text-[11px] text-[#6B7684]">
          <span>Scenario cycle: 3.5s update</span>
        </div>
      </div>
    </div>
  );
}
