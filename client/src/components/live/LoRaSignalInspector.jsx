import React, { useState } from 'react';
import { Radio, Signal, Code2, Copy, Check, X, ShieldAlert, Cpu } from 'lucide-react';

export default function LoRaSignalInspector({ telemetry }) {
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const rssi = telemetry?.rssi || -74;
  const snr = telemetry?.snr || 9.4;
  const packetId = telemetry?.packet_id || 1042;
  const freq = telemetry?.freq || 433.175;

  // Signal strength quality
  const getSignalQuality = (val) => {
    if (val >= -75) return { label: 'Excellent', color: '#2E9E6B', bars: 4 };
    if (val >= -85) return { label: 'Good', color: '#2B7FD4', bars: 3 };
    if (val >= -95) return { label: 'Fair', color: '#D48806', bars: 2 };
    return { label: 'Weak', color: '#D9364A', bars: 1 };
  };

  const signal = getSignalQuality(rssi);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(telemetry, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#E3E7EC] rounded-[8px] p-3 shadow-[0_1px_3px_rgba(16,24,32,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-3">
      
      {/* Left: LoRa Physical Link Info */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-[6px] bg-[#3457D5]/10 flex items-center justify-center text-[#3457D5] shrink-0">
          <Radio className="w-4 h-4 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#1A2126]">
              LoRa Physical RF Link: SX1278 / RA-02
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#2E9E6B]/15 text-[#2E9E6B] border border-[#2E9E6B]/30">
              LINK ACTIVE
            </span>
          </div>
          <div className="text-[11px] text-[#6B7684] flex items-center gap-2 mt-0.5">
            <span>Freq: <strong className="text-[#1A2126] font-sensor-num">{freq} MHz</strong></span>
            <span>&bull;</span>
            <span>Modulation: <strong className="text-[#1A2126]">LoRa Chirp (SF7/BW125)</strong></span>
            <span>&bull;</span>
            <span>Packets: <strong className="text-[#1A2126] font-sensor-num">#{packetId}</strong></span>
          </div>
        </div>
      </div>

      {/* Right: RF Signal Bars & Raw JSON Inspector Trigger */}
      <div className="flex items-center gap-3 self-end md:self-center">
        
        {/* Signal Bars */}
        <div className="flex items-center gap-2 bg-[#F7F8FA] px-3 py-1.5 rounded-[5px] border border-[#E3E7EC]">
          <div className="flex items-end gap-0.5 h-3.5">
            {[1, 2, 3, 4].map((bar) => (
              <div
                key={bar}
                className="w-1 rounded-sm transition-all duration-300"
                style={{
                  height: `${bar * 25}%`,
                  backgroundColor: bar <= signal.bars ? signal.color : '#CFD6DE'
                }}
              />
            ))}
          </div>
          <div className="text-xs">
            <span className="font-sensor-num font-bold text-[#1A2126]">{rssi} dBm</span>
            <span className="text-[10px] text-[#6B7684] ml-1">({signal.label})</span>
          </div>
          <div className="text-[10px] text-[#6B7684] pl-1 border-l border-[#E3E7EC]">
            SNR: <strong className="text-[#1A2126] font-sensor-num">+{snr} dB</strong>
          </div>
        </div>

        {/* View Raw JSON Button */}
        <button
          onClick={() => setShowJsonModal(true)}
          className="px-2.5 py-1.5 bg-[#FFFFFF] hover:bg-[#F1F3F6] border border-[#E3E7EC] text-[#1A2126] text-xs font-medium rounded-[5px] flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Code2 className="w-3.5 h-3.5 text-[#3457D5]" />
          <span>Raw Packet</span>
        </button>

      </div>

      {/* Raw JSON Modal */}
      {showJsonModal && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-[#FFFFFF] border border-[#E3E7EC] rounded-[8px] shadow-[0_8px_32px_rgba(16,24,32,0.16)] w-full max-w-xl overflow-hidden flex flex-col">
            
            <div className="px-4 py-3 border-b border-[#EDEFF2] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-[#3457D5]" />
                <span className="text-xs font-bold text-[#1A2126]">
                  Live LoRa Telemetry Packet Payload (JSON Stream)
                </span>
              </div>
              <button
                onClick={() => setShowJsonModal(false)}
                className="p-1 rounded-[3px] text-[#6B7684] hover:text-[#1A2126] hover:bg-[#F1F3F6]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-[#0B0F14] text-[#E8ECEE] font-mono text-xs overflow-x-auto max-h-[400px]">
              <pre>{JSON.stringify(telemetry, null, 2)}</pre>
            </div>

            <div className="px-4 py-2.5 border-t border-[#EDEFF2] bg-[#F7F8FA] flex items-center justify-between">
              <span className="text-[11px] text-[#6B7684]">
                Injected via ESP32 Serial at 115200 baud
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyJson}
                  className="px-3 py-1 bg-[#FFFFFF] border border-[#E3E7EC] hover:bg-[#F1F3F6] text-[#1A2126] text-xs font-medium rounded-[4px] flex items-center gap-1.5 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#2E9E6B]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
                </button>
                <button
                  onClick={() => setShowJsonModal(false)}
                  className="px-3 py-1 bg-[#3457D5] hover:bg-[#2A48B8] text-white text-xs font-medium rounded-[4px] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
