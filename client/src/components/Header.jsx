import React, { useState, useEffect } from 'react';
import { Activity, Globe, Cpu } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, isConnected }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const istString = currentTime.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <header className="bg-[#FFFFFF] border-b border-[#E3E7EC] shadow-[0_1px_3px_rgba(16,24,32,0.04)] sticky top-0 z-50">
      <div className="max-w-[1720px] mx-auto px-4 py-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
          
          {/* Logo & Operational Label */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-[4px] bg-[#3457D5]/10 border border-[#3457D5]/20 text-[#3457D5]">
              <Activity className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold tracking-tight text-[#1A2126]">
                Beacon
              </span>
              <span className="text-xs text-[#6B7684]">
                Environmental intelligence console
              </span>
              <span className="text-[11px] text-[#6B7684] border-l border-[#E3E7EC] pl-2 hidden sm:inline">
                SIH26178 / Qualcomm
              </span>
            </div>
          </div>

          {/* Navigation / Dashboard Switcher: Primary Action (Solid #3457D5, white text) */}
          <div className="flex items-center bg-[#F1F3F6] p-1 rounded-[4px] border border-[#E3E7EC] gap-1">
            <button
              onClick={() => setActiveTab('live')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] text-xs transition-all ${
                activeTab === 'live'
                  ? 'bg-[#3457D5] text-[#FFFFFF] shadow-sm font-medium'
                  : 'bg-transparent text-[#6B7684] hover:text-[#1A2126] font-normal'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Virtual Edge Node</span>
              <span className="text-[11px] opacity-80">
                (single node)
              </span>
            </button>

            <button
              onClick={() => setActiveTab('simulated')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] text-xs transition-all ${
                activeTab === 'simulated'
                  ? 'bg-[#3457D5] text-[#FFFFFF] shadow-sm font-medium'
                  : 'bg-transparent text-[#6B7684] hover:text-[#1A2126] font-normal'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Regional simulation</span>
              <span className="text-[11px] opacity-80">
                (21 nodes)
              </span>
            </button>
          </div>

          {/* Clock & Status */}
          <div className="flex items-center gap-3">
            <div className="text-xs text-[#6B7684]">
              <span>IST {istString}</span>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-1 rounded-[3px] bg-[#F7F8FA] border border-[#E3E7EC] text-xs">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isConnected ? 'bg-[#2E9E6B]' : 'bg-[#D48806] animate-pulse'
                }`}
              />
              <span className={`text-xs font-medium ${
                isConnected ? 'text-[#2E9E6B]' : 'text-[#D48806]'
              }`}>
                {isConnected ? 'Connected' : 'Reconnecting'}
              </span>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
