import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Cpu } from 'lucide-react';
import audioAlert from '../../utils/audioAlert';

export default function HardwareMirror({ hardwareState, telemetry }) {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const isBuzzerActive = !!hardwareState?.buzzer;
  const ledColor = hardwareState?.led || 'GREEN';

  const handleToggleAudio = () => {
    setAudioEnabled((prev) => {
      const next = !prev;
      // Start/resume the shared AudioContext inside the click gesture (autoplay policy).
      if (next) {
        audioAlert.init();
      }
      return next;
    });
  };

  // Beep when buzzer is active and audio is enabled (throttled, shared context).
  useEffect(() => {
    if (!isBuzzerActive || !audioEnabled) return;
    audioAlert.playBuzzerBeep();
  }, [isBuzzerActive, audioEnabled, telemetry?.timestamp]);

  return (
    <div className="console-panel p-3.5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-[#EDEFF2] pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-[#6B7684]" />
            <span className="text-xs font-medium text-[#1A2126]">
              Base station hardware state
            </span>
          </div>
          {/* Distinct Demo/Test Button: Amber outline on white */}
          <button
            onClick={handleToggleAudio}
            className="console-btn-test"
            title="Toggle audio alert chime for hardware buzzer"
          >
            {audioEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>Chime on</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span>Chime off</span>
              </>
            )}
          </button>
        </div>

        {/* Hardware Status Indicators */}
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          
          {/* Piezo Buzzer */}
          <div className={`p-3 rounded-[4px] border transition-colors ${
            isBuzzerActive
              ? 'bg-[#D9364A]/10 border-[#D9364A]'
              : 'bg-[#F7F8FA] border-[#E3E7EC]'
          }`}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`w-5 h-5 rounded-[2px] flex items-center justify-center ${
                isBuzzerActive ? 'text-[#D9364A]' : 'text-[#6B7684]'
              }`}>
                <Volume2 className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-medium text-[#1A2126]">
                Piezo buzzer
              </span>
            </div>
            <div className="text-[11px]">
              <span className={isBuzzerActive ? 'text-[#D9364A] font-medium' : 'text-[#6B7684]'}>
                {isBuzzerActive ? 'Alarm active' : 'Silent standby'}
              </span>
            </div>
          </div>

          {/* Status LED */}
          <div className={`p-3 rounded-[4px] border transition-colors ${
            ledColor === 'RED'
              ? 'bg-[#D9364A]/10 border-[#D9364A]'
              : ledColor === 'YELLOW'
                ? 'bg-[#D48806]/10 border-[#D48806]'
                : 'bg-[#F7F8FA] border-[#E3E7EC]'
          }`}>
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className={`w-3 h-3 rounded-full ${
                  ledColor === 'RED'
                    ? 'bg-[#D9364A] alert-pulse-node'
                    : ledColor === 'YELLOW'
                      ? 'bg-[#D48806]'
                      : 'bg-[#2E9E6B]'
                }`}
              />
              <span className="text-xs font-medium text-[#1A2126]">
                Status indicator
              </span>
            </div>
            <div className="text-[11px]">
              <span
                style={{
                  color: ledColor === 'RED' ? '#D9364A' : (ledColor === 'YELLOW' ? '#D48806' : '#2E9E6B')
                }}
                className="font-medium"
              >
                {ledColor === 'RED' ? 'Red (hazard)' : (ledColor === 'YELLOW' ? 'Amber (caution)' : 'Green (nominal)')}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Specifications */}
      <div className="bg-[#F7F8FA] rounded-[3px] p-2.5 border border-[#E3E7EC] text-[11px] text-[#6B7684] space-y-1">
        <div className="flex justify-between">
          <span>LoRa link:</span>
          <span className="text-[#1A2126] font-medium">SX1278 (433MHz)</span>
        </div>
        <div className="flex justify-between">
          <span>Serial baud:</span>
          <span className="text-[#1A2126] font-medium">115200 8-N-1 (USB)</span>
        </div>
        <div className="flex justify-between">
          <span>Edge assessment:</span>
          <span className="text-[#2E9E6B] font-medium">Threshold filter active</span>
        </div>
      </div>
    </div>
  );
}
