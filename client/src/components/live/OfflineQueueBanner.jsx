import React from 'react';
import { Cloud, CloudOff, RefreshCw, Database, HardDrive, Wifi, WifiOff, ArrowRight } from 'lucide-react';
import socket from '../../socket';
import telemetryEngine from '../../telemetryEngine';

export default function OfflineQueueBanner({ queueStatus, onToggleOffline }) {
  const isOnline = queueStatus?.isOnline !== false;
  const queuedCount = queueStatus?.queuedCount || 0;
  const isFlushing = !!queueStatus?.isFlushing;
  const maxCapacity = queueStatus?.maxCapacity || 500;
  const flashKb = queueStatus?.flashMemoryKb || +(queuedCount * 0.128).toFixed(2);
  const packets = queueStatus?.packets || [];

  const bufferPercentage = Math.min(100, (queuedCount / maxCapacity) * 100);

  const handleToggle = () => {
    // 1. Toggle local engine buffer
    telemetryEngine.toggleOfflineQueue();
    // 2. Also emit to backend socket
    socket.emit('client-toggle-offline');
    if (onToggleOffline) onToggleOffline();
  };

  return (
    <div className={`rounded-[8px] border shadow-[0_1px_3px_rgba(16,24,32,0.05)] transition-all duration-300 overflow-hidden ${
      !isOnline
        ? 'bg-[#FFFFFF] border-[#D48806]/60 shadow-[0_2px_12px_rgba(212,136,6,0.12)]'
        : isFlushing
          ? 'bg-[#FFFFFF] border-[#3457D5]/60 shadow-[0_2px_12px_rgba(52,87,213,0.12)]'
          : 'bg-[#FFFFFF] border-[#E3E7EC]'
    }`}>
      
      {/* Top Status Strip */}
      <div className={`px-4 py-3 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 ${
        !isOnline 
          ? 'bg-[#D48806]/10 border-[#D48806]/30'
          : isFlushing
            ? 'bg-[#3457D5]/10 border-[#3457D5]/30'
            : 'bg-[#F7F8FA] border-[#EDEFF2]'
      }`}>
        
        {/* Left: Base Station Uplink Status */}
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-[6px] flex items-center justify-center shrink-0 ${
            !isOnline
              ? 'bg-[#D48806]/20 text-[#D48806]'
              : isFlushing
                ? 'bg-[#3457D5]/20 text-[#3457D5]'
                : 'bg-[#2E9E6B]/15 text-[#2E9E6B]'
          }`}>
            {!isOnline ? (
              <WifiOff className="w-5 h-5 animate-pulse" />
            ) : isFlushing ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Wifi className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#1A2126] tracking-tight">
                Base Station Store-and-Forward Telemetry Buffer
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                !isOnline
                  ? 'bg-[#D48806]/20 text-[#D48806] border border-[#D48806]/40'
                  : isFlushing
                    ? 'bg-[#3457D5]/20 text-[#3457D5] border border-[#3457D5]/40'
                    : 'bg-[#2E9E6B]/15 text-[#2E9E6B] border border-[#2E9E6B]/30'
              }`}>
                {!isOnline ? 'UPLINK SEVERED &bull; BUFFERING' : isFlushing ? 'BULK FLUSHING' : 'UPLINK SYNCHRONIZED'}
              </span>
            </div>
            <p className="text-[11px] text-[#6B7684] mt-0.5">
              {!isOnline 
                ? 'Network connection severed. LoRa packets caching to ESP32 Flash (SPIFFS). Zero packet loss.'
                : isFlushing
                  ? 'Uplink restored! High-speed bulk flushing queued packets in chronological sequence...'
                  : 'Active cloud pipeline &bull; Base Station gateway ping: 24ms &bull; Continuous synchronization'}
            </p>
          </div>
        </div>

        {/* Right: Simulation Action Button */}
        <div className="flex items-center gap-2 self-end md:self-center">
          <button
            onClick={handleToggle}
            className={`px-3.5 py-1.5 rounded-[5px] text-xs font-semibold flex items-center gap-2 transition-all shadow-sm ${
              isOnline
                ? 'bg-[#FFFFFF] hover:bg-[#FFF8E6] border border-[#D48806] text-[#D48806]'
                : 'bg-[#3457D5] hover:bg-[#2A48B8] border border-[#3457D5] text-[#FFFFFF]'
            }`}
          >
            {isOnline ? (
              <>
                <CloudOff className="w-3.5 h-3.5" />
                <span>Cut Internet Link (Test Store-and-Forward)</span>
              </>
            ) : (
              <>
                <RefreshCw className={`w-3.5 h-3.5 ${isFlushing ? 'animate-spin' : ''}`} />
                <span>Restore Uplink & Bulk Flush</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Buffer Progress & Metrics Grid */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-[#FFFFFF]">
        
        {/* Metric 1: Packets in Queue */}
        <div className="md:col-span-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-[4px] bg-[#F1F3F6] flex items-center justify-center text-[#3457D5]">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-[#6B7684]">Queued LoRa Packets</div>
            <div className="flex items-baseline gap-1">
              <span className={`text-lg font-bold font-sensor-num ${queuedCount > 0 ? 'text-[#D48806]' : 'text-[#1A2126]'}`}>
                {queuedCount}
              </span>
              <span className="text-xs text-[#8A96A0]">/ {maxCapacity} max</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Flash Memory Usage */}
        <div className="md:col-span-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-[4px] bg-[#F1F3F6] flex items-center justify-center text-[#E0972A]">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-[#6B7684]">ESP32 SPIFFS Memory</div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold font-sensor-num text-[#1A2126]">
                {flashKb} KB
              </span>
              <span className="text-xs text-[#8A96A0]">/ 64 KB Flash</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Visual Progress Bar */}
        <div className="md:col-span-6 flex flex-col justify-center">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[#6B7684] font-medium">Buffer Capacity Utilization</span>
            <span className="font-sensor-num font-bold text-[#1A2126]">
              {bufferPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="w-full h-2.5 bg-[#EDEFF2] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                bufferPercentage > 80 
                  ? 'bg-[#D9364A]' 
                  : bufferPercentage > 40 
                    ? 'bg-[#D48806]' 
                    : 'bg-[#3457D5]'
              }`}
              style={{ width: `${Math.max(bufferPercentage, queuedCount > 0 ? 3 : 0)}%` }}
            />
          </div>
        </div>

      </div>

      {/* Active Packets In Buffer Tag Stream (Visible when packets are queued) */}
      {queuedCount > 0 && (
        <div className="px-4 py-2.5 bg-[#F7F8FA] border-t border-[#EDEFF2] flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-bold text-[#6B7684] shrink-0 uppercase tracking-wide">
            Queue Buffer:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {packets.slice(0, 10).map((pkt, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-[4px] bg-[#FFFFFF] border border-[#E3E7EC] text-[11px] font-mono text-[#1A2126] shadow-sm shrink-0 flex items-center gap-1"
              >
                <span className="text-[#3457D5] font-bold">#{pkt.seq || 'PKT'}</span>
                <span className="text-[#6B7684]">{pkt.time || 'now'}</span>
                <span className="text-[#2B7FD4] font-semibold">{pkt.water_level || 0}cm</span>
              </span>
            ))}
            {packets.length > 10 && (
              <span className="text-[11px] text-[#6B7684] font-medium shrink-0">
                +{packets.length - 10} more in Flash
              </span>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
