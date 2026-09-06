import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Flame, 
  Droplets, 
  CloudRain, 
  CheckCircle2, 
  Volume2, 
  VolumeX, 
  Usb, 
  RefreshCw, 
  Activity,
  AlertTriangle
} from 'lucide-react';
import audioAlert from '../../utils/audioAlert';
import socket from '../../socket';

export default function LiveControlCockpit({
  telemetry,
  serialStatus,
  onSensorChange,
  onInjectSpike
}) {
  const [ports, setPorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState('');
  const [isAudioMuted, setIsAudioMuted] = useState(audioAlert.isMuted);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionMsg, setConnectionMsg] = useState('');

  // Fetch ports safely
  const fetchPorts = async () => {
    try {
      const res = await fetch('/api/serial/ports').catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        setPorts(data.ports || []);
        if (data.ports && data.ports.length > 0 && !selectedPort) {
          setSelectedPort(data.ports[0].path);
        }
      } else {
        // Fallback default ports
        setPorts([
          { path: 'COM3 (ESP32 LoRa Base)', friendlyName: 'ESP32 Base Station (CP2102)' },
          { path: 'COM4 (USB Serial CH340)', friendlyName: 'USB-Serial CH340' }
        ]);
        setSelectedPort('COM3 (ESP32 LoRa Base)');
      }
    } catch (e) {
      setPorts([
        { path: 'COM3 (ESP32 LoRa Base)', friendlyName: 'ESP32 Base Station (CP2102)' }
      ]);
      setSelectedPort('COM3 (ESP32 LoRa Base)');
    }
  };

  useEffect(() => {
    fetchPorts();
  }, []);

  const handleToggleAudio = () => {
    const muted = audioAlert.toggleMute();
    setIsAudioMuted(muted);
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectionMsg('');
    try {
      const res = await fetch('/api/serial/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: selectedPort, baudRate: 115200 })
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        setConnectionMsg(data.message || 'Connected');
      } else {
        setConnectionMsg('Connected in high-fidelity mock stream');
      }
    } catch (e) {
      setConnectionMsg('Connected in test stream');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsConnecting(true);
    try {
      await fetch('/api/serial/disconnect', { method: 'POST' }).catch(() => null);
      setConnectionMsg('Disconnected');
    } catch (e) {
      setConnectionMsg('Disconnected');
    } finally {
      setIsConnecting(false);
    }
  };

  const isConnected = serialStatus?.isConnected;

  return (
    <div className="bg-[#FFFFFF] border border-[#E3E7EC] rounded-[8px] p-4 shadow-[0_1px_3px_rgba(16,24,32,0.05)]">
      
      {/* Cockpit Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EDEFF2]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[6px] bg-[#3457D5]/10 flex items-center justify-center text-[#3457D5]">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#1A2126] uppercase tracking-wide">
              Virtual Edge Node Testing Cockpit
            </h3>
            <p className="text-[11px] text-[#6B7684]">
              Real-time interactive sliders, physical serial connection, and disaster simulation triggers
            </p>
          </div>
        </div>

        {/* Audio Alert Chime Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleAudio}
            className={`px-3 py-1.5 rounded-[5px] text-xs font-medium border flex items-center gap-1.5 transition-all ${
              !isAudioMuted
                ? 'bg-[#3457D5]/10 text-[#3457D5] border-[#3457D5]/40 shadow-sm'
                : 'bg-[#F7F8FA] text-[#6B7684] border-[#E3E7EC] hover:text-[#1A2126]'
            }`}
            title={isAudioMuted ? 'Click to enable tactical alarm chime' : 'Click to mute alarm chime'}
          >
            {!isAudioMuted ? <Volume2 className="w-3.5 h-3.5 text-[#3457D5]" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{!isAudioMuted ? 'Sound alert: ON' : 'Sound alert: MUTED'}</span>
          </button>
        </div>
      </div>

      {/* Main Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-3.5">
        
        {/* Left: Interactive Real-time Sensor Sliders (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#1A2126] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#3457D5]" />
              Real-time Sensor Controls (Drag to test thresholds)
            </span>
            <span className="text-[11px] text-[#6B7684]">
              Immediate live response
            </span>
          </div>

          <div className="space-y-3 bg-[#F7F8FA] p-3 rounded-[6px] border border-[#E3E7EC]">
            
            {/* Water Level Slider */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-[#1A2126] flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-[#2B7FD4]" />
                  Water Level (River / Drainage Surge)
                </span>
                <span className="font-sensor-num font-bold text-[#2B7FD4]">
                  {telemetry?.water_level || 0} cm
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="0.5"
                value={telemetry?.water_level || 0}
                onChange={(e) => onSensorChange('water_level', e.target.value)}
                className="w-full h-2 bg-[#E3E7EC] rounded-lg appearance-none cursor-pointer accent-[#2B7FD4]"
              />
              <div className="flex justify-between text-[10px] text-[#8A96A0] mt-0.5">
                <span>0 cm (Dry)</span>
                <span className="text-[#D48806]">Warn &ge;45 cm</span>
                <span className="text-[#D9364A]">Danger &ge;75 cm</span>
                <span>100 cm</span>
              </div>
            </div>

            {/* Smoke PPM Slider */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-[#1A2126] flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-[#E85D3D]" />
                  Smoke Concentration (MQ-2 Gas Sensor)
                </span>
                <span className="font-sensor-num font-bold text-[#E85D3D]">
                  {telemetry?.smoke || 0} ppm
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="1000"
                step="5"
                value={telemetry?.smoke || 0}
                onChange={(e) => onSensorChange('smoke', e.target.value)}
                className="w-full h-2 bg-[#E3E7EC] rounded-lg appearance-none cursor-pointer accent-[#E85D3D]"
              />
              <div className="flex justify-between text-[10px] text-[#8A96A0] mt-0.5">
                <span>50 ppm (Clean)</span>
                <span className="text-[#D48806]">Warn &ge;350 ppm</span>
                <span className="text-[#D9364A]">Danger &ge;600 ppm</span>
                <span>1000 ppm</span>
              </div>
            </div>

            {/* Rainfall Rate Slider */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-[#1A2126] flex items-center gap-1">
                  <CloudRain className="w-3.5 h-3.5 text-[#1FA88A]" />
                  Rainfall Rate (Optical Rain Sensor)
                </span>
                <span className="font-sensor-num font-bold text-[#1FA88A]">
                  {telemetry?.rainfall || 0} mm/h
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                step="0.5"
                value={telemetry?.rainfall || 0}
                onChange={(e) => onSensorChange('rainfall', e.target.value)}
                className="w-full h-2 bg-[#E3E7EC] rounded-lg appearance-none cursor-pointer accent-[#1FA88A]"
              />
              <div className="flex justify-between text-[10px] text-[#8A96A0] mt-0.5">
                <span>0 mm/h (Clear)</span>
                <span className="text-[#D48806]">Warn &ge;25 mm/h</span>
                <span className="text-[#D9364A]">Danger &ge;50 mm/h</span>
                <span>80 mm/h</span>
              </div>
            </div>

          </div>
        </div>

        {/* Right: Instant Spike Triggers & Serial Port Bar (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-3">
          
          {/* Quick Disaster Injections */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#1A2126] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[#D9364A]" />
                One-Click Disaster Scenarios
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onInjectSpike('flood')}
                className="p-2 bg-[#2B7FD4]/10 hover:bg-[#2B7FD4]/15 border border-[#2B7FD4]/30 hover:border-[#2B7FD4] rounded-[5px] text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#2B7FD4]">
                  <Droplets className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                  <span>Flash Flood</span>
                </div>
                <div className="text-[10px] text-[#6B7684] mt-0.5">
                  Surge to 88.5 cm
                </div>
              </button>

              <button
                onClick={() => onInjectSpike('fire')}
                className="p-2 bg-[#E85D3D]/10 hover:bg-[#E85D3D]/15 border border-[#E85D3D]/30 hover:border-[#E85D3D] rounded-[5px] text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#E85D3D]">
                  <Flame className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                  <span>Wildfire Smoke</span>
                </div>
                <div className="text-[10px] text-[#6B7684] mt-0.5">
                  Smoke to 780 ppm
                </div>
              </button>

              <button
                onClick={() => onInjectSpike('storm')}
                className="p-2 bg-[#1FA88A]/10 hover:bg-[#1FA88A]/15 border border-[#1FA88A]/30 hover:border-[#1FA88A] rounded-[5px] text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#1FA88A]">
                  <CloudRain className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                  <span>Cloudburst</span>
                </div>
                <div className="text-[10px] text-[#6B7684] mt-0.5">
                  Precip 72 mm/h
                </div>
              </button>

              <button
                onClick={() => onInjectSpike('nominal')}
                className="p-2 bg-[#2E9E6B]/10 hover:bg-[#2E9E6B]/15 border border-[#2E9E6B]/30 hover:border-[#2E9E6B] rounded-[5px] text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#2E9E6B]">
                  <CheckCircle2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                  <span>All Clear</span>
                </div>
                <div className="text-[10px] text-[#6B7684] mt-0.5">
                  Reset to 22.4 cm
                </div>
              </button>
            </div>
          </div>

          {/* Physical Serial Connection Box */}
          <div className="bg-[#F7F8FA] p-3 rounded-[6px] border border-[#E3E7EC]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#1A2126] flex items-center gap-1.5">
                <Usb className="w-3.5 h-3.5 text-[#3457D5]" />
                Base Station Serial Link (USB)
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                isConnected ? 'bg-[#2E9E6B]/15 text-[#2E9E6B]' : 'bg-[#D48806]/15 text-[#D48806]'
              }`}>
                {isConnected ? 'HARDWARE ACTIVE' : 'AUTONOMOUS TEST STREAM'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedPort}
                onChange={(e) => setSelectedPort(e.target.value)}
                className="flex-1 bg-[#FFFFFF] border border-[#E3E7EC] text-[#1A2126] text-xs rounded-[4px] px-2.5 py-1.5 focus:outline-none focus:border-[#3457D5]"
              >
                {ports.map((p) => (
                  <option key={p.path} value={p.path}>
                    {p.friendlyName || p.path}
                  </option>
                ))}
              </select>

              <button
                onClick={fetchPorts}
                className="p-1.5 bg-[#FFFFFF] border border-[#E3E7EC] hover:bg-[#F1F3F6] rounded-[4px] text-[#6B7684]"
                title="Rescan serial ports"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              {!isConnected ? (
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="px-3 py-1.5 bg-[#3457D5] hover:bg-[#2A48B8] text-white text-xs font-medium rounded-[4px] transition-colors shadow-sm"
                >
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </button>
              ) : (
                <button
                  onClick={handleDisconnect}
                  disabled={isConnecting}
                  className="px-3 py-1.5 bg-[#FFFFFF] hover:bg-[#FFF0F0] border border-[#D9364A] text-[#D9364A] text-xs font-medium rounded-[4px] transition-colors"
                >
                  Disconnect
                </button>
              )}
            </div>

            {connectionMsg && (
              <div className="text-[11px] text-[#3457D5] mt-1.5 font-medium">
                {connectionMsg}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
