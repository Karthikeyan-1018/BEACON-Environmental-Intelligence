import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Thermometer,
  Droplets,
  Flame,
  CloudRain,
  Waves,
  Cpu,
  Usb,
  RefreshCw,
  Terminal,
  Zap,
  ShieldAlert,
  Activity,
  Check,
  Wifi,
  WifiOff,
  Play,
  Volume2,
  X
} from 'lucide-react';
import socket from '../../socket';
import audioAlert from '../../utils/audioAlert';

const LEVEL_COLORS = { NORMAL: '#2E9E6B', WARNING: '#D48806', HIGH: '#E85D3D', CRITICAL: '#D9364A' };
const TYPE_COLORS = { NORMAL: '#2E9E6B', FLOOD: '#2B7FD4', FIRE: '#E85D3D', COMBINED: '#E23B72' };

function SensorCard({ title, icon: Icon, value, unit, color, pct, note, bandLabel }) {
  const pctClamped = Math.max(0, Math.min(100, pct || 0));
  const bandColor = color === '#D9364A' ? '#D9364A' : color === '#D48806' ? '#D48806' : '#2E9E6B';

  return (
    <div className="bg-[#FFFFFF] border border-[#E3E7EC] rounded-[8px] p-3.5 shadow-[0_1px_3px_rgba(16,24,32,0.04)]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-[4px] bg-[#F1F3F6] flex items-center justify-center" style={{ color }}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] font-semibold text-[#1A2126]">{title}</span>
        </div>
        {bandLabel && (
          <span
            className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-[3px]"
            style={{ backgroundColor: `${bandColor}18`, color: bandColor }}
          >
            {bandLabel}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span
          className="font-sensor-num font-bold text-2xl leading-none"
          style={{ color: bandColor }}
        >
          {value === null || value === undefined ? '--' : value}
        </span>
        {unit && <span className="text-xs text-[#6B7684]">{unit}</span>}
      </div>

      <div className="mt-2.5 h-1.5 bg-[#EDEFF2] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pctClamped}%`, backgroundColor: bandColor }}
        />
      </div>
      {note && <div className="mt-1.5 text-[10px] text-[#8A96A0]">{note}</div>}
    </div>
  );
}

export default function Esp32NodeDashboard() {
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState({ connected: false, activePort: null, serialSupported: true });
  const [log, setLog] = useState([]);
  const [ports, setPorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionMsg, setConnectionMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [toasts, setToasts] = useState([]);
  const logRef = useRef(null);
  const seenAlertsRef = useRef(new Set());

  const appendLog = (text) => {
    const lines = String(text).split('\n');
    setLog((prev) => [...prev, ...lines].slice(-80));
  };

  // Ticker for heartbeat age + ALIVE blink.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Initial snapshot + live stream (fully independent socket channel).
  useEffect(() => {
    fetch('/api/esp32/snapshot')
      .then((r) => (r.ok ? r.json() : null))
      .then((snap) => {
        if (!snap) return;
        setData(snap.data);
        setStats(snap.stats);
        if (snap.status) setStatus({ connected: snap.status.isConnected, activePort: snap.status.activePort, serialSupported: snap.status.serialSupported });
        if (snap.serialized) appendLog(snap.serialized);
      })
      .catch(() => {});

    const onTelemetry = (payload) => {
      if (!payload) return;
      setData(payload.data);
      setStats(payload.stats);
      appendLog(payload.serialized);
      if (payload.heartbeat) appendLog('STATUS : ALIVE → every 30 seconds');
    };
    const onStatus = (s) => {
      if (!s) return;
      setStatus({ connected: s.connected, activePort: s.activePort, serialSupported: s.serialSupported });
    };
    const onAlert = (a) => {
      if (!a || seenAlertsRef.current.has(a.timestamp)) return;
      seenAlertsRef.current.add(a.timestamp);
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev.slice(-5), { ...a, id }]);
      try { audioAlert.playBuzzerBeep(); } catch (_) {}
    };

    socket.on('esp32-telemetry', onTelemetry);
    socket.on('esp32-status', onStatus);
    socket.on('esp32-alert', onAlert);
    return () => {
      socket.off('esp32-telemetry', onTelemetry);
      socket.off('esp32-status', onStatus);
      socket.off('esp32-alert', onAlert);
    };
  }, []);

  // Keep terminal scrolled to latest reading.
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  // Auto-dismiss toasts after 8 seconds.
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 8000);
    return () => clearTimeout(timer);
  }, [toasts]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchPorts = async () => {
    try {
      const res = await fetch('/api/serial/ports').catch(() => null);
      if (res && res.ok) {
        const json = await res.json();
        setPorts(json.ports || []);
        if (json.ports && json.ports.length > 0 && !selectedPort) setSelectedPort(json.ports[0].path);
        return;
      }
    } catch (e) {}
    setPorts([
      { path: 'COM3 (ESP32 LoRa Base)', friendlyName: 'ESP32 Base Station (CP2102)' }
    ]);
    setSelectedPort('COM3 (ESP32 LoRa Base)');
  };

  useEffect(() => {
    fetchPorts();
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectionMsg('');
    try {
      const res = await fetch('/api/serial/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: selectedPort, baudRate: 115200 })
      }).catch(() => null);
      setConnectionMsg(res && res.ok ? 'Serial link active — awaiting firmware blocks' : 'Opened in mock demo stream');
    } catch (e) {
      setConnectionMsg('Opened in mock demo stream');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsConnecting(true);
    try {
      await fetch('/api/serial/disconnect', { method: 'POST' }).catch(() => null);
      setConnectionMsg('Disconnected — mock stream resumed');
    } catch (e) {
      setConnectionMsg('Disconnected');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCopy = () => {
    if (!data) return;
    fetch('/api/esp32/snapshot')
      .then((r) => (r.ok ? r.json() : null))
      .then((snap) => {
        if (snap && snap.serialized) {
          navigator.clipboard.writeText(snap.serialized);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      })
      .catch(() => {});
  };

  const d = data || {};
  const isRisk = (d.riskLevel || 'NORMAL') !== 'NORMAL';
  const riskColor = LEVEL_COLORS[d.riskLevel] || '#2E9E6B';
  const typeColor = TYPE_COLORS[d.riskType] || '#2E9E6B';

  const tempBand = d.temp >= 47 ? 'critical' : d.temp >= 44 ? 'high' : d.temp >= 42 ? 'warning' : 'normal';
  const humBand = d.humidity >= 80 ? 'warning' : 'normal';
  const smokeBand = d.smoke >= 700 ? 'critical' : d.smoke >= 420 ? 'high' : d.smoke >= 260 ? 'warning' : 'normal';
  const wetPct = d.rain === undefined ? 0 : Math.max(0, Math.min(100, Math.round((1 - d.rain / 4095) * 100)));
  const rainBand = wetPct >= 70 ? 'critical' : wetPct >= 30 ? 'warning' : 'normal';
  const depthPct = d.water === undefined ? 0 : Math.max(0, Math.min(100, Math.round((d.water / 4095) * 100)));
  const waterBand = depthPct >= 65 ? 'critical' : depthPct >= 40 ? 'warning' : 'normal';

  const bandColorOf = (band) => (band === 'critical' ? '#D9364A' : band === 'warning' || band === 'high' ? '#D48806' : '#2E9E6B');
  const bandLabelOf = (band) => (band === 'normal' ? 'NOMINAL' : band.toUpperCase());
  const bandPct = (base, band) => (band === 'critical' ? 100 : band === 'warning' || band === 'high' ? 55 : base);

  const aliveAt = d.aliveAt ? new Date(d.aliveAt).getTime() : null;
  const ageSec = aliveAt ? Math.max(0, Math.round((now - aliveAt) / 1000)) : null;
  const source = stats?.source || 'mock';

  return (
    <div className="space-y-3.5">

      {/* 1. Header: identity + STREAM SOURCE + STATUS : ALIVE */}
      <div className="bg-[#FFFFFF] border border-[#E3E7EC] rounded-[8px] p-4 shadow-[0_1px_3px_rgba(16,24,32,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[6px] bg-[#3457D5]/10 flex items-center justify-center text-[#3457D5]">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#1A2126] tracking-tight">
                ESP32 Physical Node — Real-time Readings
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#2E9E6B]/15 text-[#2E9E6B] border border-[#2E9E6B]/30">
                DHT22 + MQ-2 + Rain + Water
              </span>
            </div>
            <p className="text-[11px] text-[#6B7684] mt-0.5">
              Dedicated stream, independent of the other dashboards. Firmware prints this block every 2 s.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
            source === 'serial'
              ? 'bg-[#3457D5]/10 text-[#3457D5] border-[#3457D5]/40'
              : 'bg-[#F1F3F6] text-[#6B7684] border-[#E3E7EC]'
          }`}>
            {source === 'serial' ? 'SERIAL LINK ACTIVE' : 'MOCK DEMO STREAM'}
          </span>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] border border-[#E3E7EC] bg-[#F7F8FA]">
            <span className={`w-2 h-2 rounded-full ${ageSec !== null && ageSec <= 35 ? 'bg-[#2E9E6B] animate-pulse' : 'bg-[#D48806]'}`} />
            <span className="text-[11px] font-semibold text-[#1A2126]">
              STATUS : ALIVE
            </span>
            <span className="text-[10px] text-[#6B7684]">
              {ageSec !== null ? `last ${ageSec}s ago` : 'waiting…'}
            </span>
          </div>

          {(d.temp !== undefined && d.temp !== null) && (
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-[5px] border bg-[#F7F8FA] text-[#1A2126] border-[#E3E7EC] font-mono">
              cycle #{d.sequence ?? 0} &middot; {stats?.cycles || 0} read &middot; {stats?.alerts || 0} alert
            </span>
          )}
        </div>
      </div>

      {/* 2. Serial link UI (port select + connect) */}
      <div className="bg-[#FFFFFF] border border-[#E3E7EC] rounded-[8px] p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-[#1A2126] font-medium">
          <Usb className="w-3.5 h-3.5 text-[#3457D5]" />
          <span>Attach the ESP32 board:</span>
          <span className="text-[11px] text-[#6B7684] font-normal">
            backend parses the printed <code className="font-mono">key : value</code> serial block automatically.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedPort}
            onChange={(e) => setSelectedPort(e.target.value)}
            className="flex-1 lg:w-72 bg-[#FFFFFF] border border-[#E3E7EC] text-[#1A2126] text-xs rounded-[4px] px-2.5 py-1.5 focus:outline-none focus:border-[#3457D5]"
          >
            {ports.map((p) => (
              <option key={p.path} value={p.path}>{p.friendlyName || p.path}</option>
            ))}
          </select>

          <button
            onClick={fetchPorts}
            className="p-1.5 bg-[#FFFFFF] border border-[#E3E7EC] hover:bg-[#F1F3F6] rounded-[4px] text-[#6B7684]"
            title="Rescan serial ports"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {!status.connected ? (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="px-3 py-1.5 bg-[#3457D5] hover:bg-[#2A48B8] text-white text-xs font-medium rounded-[4px] transition-colors shadow-sm"
            >
              {isConnecting ? 'Connecting…' : 'Connect ESP32'}
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
      </div>

      {/* 3. Live risk banner (when the node itself classifies a risk) */}
      {isRisk && (
        <div
          className="rounded-[8px] border px-4 py-3 flex items-center gap-3"
          style={{ backgroundColor: `${riskColor}0D`, borderColor: `${riskColor}55` }}
        >
          <Zap className="w-5 h-5 shrink-0" style={{ color: riskColor }} />
          <div className="text-xs">
<span className="font-bold" style={{ color: riskColor }}>
            LIVE ALERT — {d.riskType}
          </span>
            <span style={{ color: riskColor }}> · {d.riskLevel}</span>
            <span className="text-[#6B7684] ml-2">node-classified on-device (any real risk printed immediately)</span>
          </div>
          {stats?.lastAlert && (
            <span className="ml-auto text-[10px] text-[#6B7684] font-mono hidden sm:block">
              {new Date(stats.lastAlert).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </div>
      )}

      {/* 4. Sensor gauge cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SensorCard
          title="Temperature"
          icon={Thermometer}
          value={d.temp === undefined ? null : d.temp.toFixed(2)}
          unit="°C"
          color={bandColorOf(tempBand)}
          bandLabel={bandLabelOf(tempBand)}
          pct={bandPct(35, tempBand)}
          note="DHT22 ambient"
        />
        <SensorCard
          title="Humidity"
          icon={Droplets}
          value={d.humidity === undefined ? null : d.humidity.toFixed(2)}
          unit="%"
          color={bandColorOf(humBand)}
          bandLabel={bandLabelOf(humBand)}
          pct={bandPct(55, humBand)}
          note="DHT22 relative"
        />
        <SensorCard
          title="Smoke"
          icon={Flame}
          value={d.smoke === undefined ? null : d.smoke}
          unit="ADC"
          color={bandColorOf(smokeBand)}
          bandLabel={bandLabelOf(smokeBand)}
          pct={bandPct(15, smokeBand)}
          note="MQ-2 raw (0–4095)"
        />
        <SensorCard
          title="Rainfall"
          icon={CloudRain}
          value={d.rain === undefined ? null : d.rain}
          unit="ADC"
          color={bandColorOf(rainBand)}
          bandLabel={wetPct >= 70 ? 'HEAVY' : wetPct >= 30 ? 'RAINING' : 'DRY'}
          pct={wetPct}
          note={`intensity ${wetPct}% · raw inverted`}
        />
        <SensorCard
          title="Water Level"
          icon={Waves}
          value={d.water === undefined ? null : d.water}
          unit="ADC"
          color={bandColorOf(waterBand)}
          bandLabel={bandLabelOf(waterBand)}
          pct={depthPct}
          note={`depth ${depthPct}% of 4095`}
        />
      </div>

      {/* 5. On-node risk classification panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <div className="bg-[#FFFFFF] border border-[#E3E7EC] rounded-[8px] p-4 shadow-[0_1px_3px_rgba(16,24,32,0.04)]">
          <div className="flex items-center gap-1.5 mb-2.5">
            <ShieldAlert className="w-3.5 h-3.5 text-[#3457D5]" />
            <span className="text-xs font-bold text-[#1A2126]">Risk Type</span>
            <span className="text-[10px] text-[#6B7684] ml-auto">classified on the node</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['NORMAL', 'FLOOD', 'FIRE', 'COMBINED'].map((t) => {
              const active = (d.riskType || 'NORMAL') === t;
              const c = TYPE_COLORS[t];
              return (
                <span
                  key={t}
                  className="px-2.5 py-1 rounded-[5px] text-[11px] font-semibold border"
                  style={
                    active
                      ? { backgroundColor: `${c}1A`, borderColor: c, color: c }
                      : { backgroundColor: '#F7F8FA', borderColor: '#E3E7EC', color: '#8A96A0' }
                  }
                >
                  {t}
                </span>
              );
            })}
          </div>
          <div className="mt-2.5 text-[10px] text-[#8A96A0]">
            Fire ← smoke ≥ 260 ADC or temp ≥ 42 °C · Flood ← water ≥ 1600 or rain ≤ 1400 · Combined = both
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E3E7EC] rounded-[8px] p-4 shadow-[0_1px_3px_rgba(16,24,32,0.04)]">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Activity className="w-3.5 h-3.5 text-[#3457D5]" />
            <span className="text-xs font-bold text-[#1A2126]">Risk Level</span>
            <span className="text-[10px] text-[#6B7684] ml-auto">NORMAL + NORMAL → no print</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['NORMAL', 'WARNING', 'HIGH', 'CRITICAL'].map((l) => {
              const active = (d.riskLevel || 'NORMAL') === l;
              const c = LEVEL_COLORS[l];
              return (
                <span
                  key={l}
                  className="px-2.5 py-1 rounded-[5px] text-[11px] font-semibold border"
                  style={
                    active
                      ? { backgroundColor: `${c}1A`, borderColor: c, color: c }
                      : { backgroundColor: '#F7F8FA', borderColor: '#E3E7EC', color: '#8A96A0' }
                  }
                >
                  {l}
                </span>
              );
            })}
          </div>
          <div className="mt-2.5 text-[10px] text-[#8A96A0]">
            warning → high → critical as smoke / temp / water cross 260–700, 42–47 °C, 1600–2600 raw.
          </div>
        </div>
      </div>

      {/* 6. Serial monitor terminal (mirrors the firmware printout) */}
      <div className="bg-[#0B0F14] border border-[#1E252E] rounded-[8px] overflow-hidden shadow-[0_1px_3px_rgba(16,24,32,0.08)]">
        <div className="px-3.5 py-2 flex items-center justify-between border-b border-[#1E252E] bg-[#11161D]">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-[#34D399]" />
            <span className="text-[11px] font-semibold text-[#E8ECEE]">Serial Monitor — ESP32 firmware output</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#8B949E]">Sensors checked every 2 s</span>
            <button
              onClick={handleCopy}
              className="px-2 py-1 rounded-[4px] bg-[#1E252E] hover:bg-[#2A3541] text-[#E8ECEE] text-[10px] font-medium flex items-center gap-1 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-[#34D399]" /> : <Terminal className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Copy block'}
            </button>
          </div>
        </div>

        <div ref={logRef} className="h-[320px] overflow-y-auto p-3 space-y-0 font-mono text-[12px] leading-[1.55]">
          {log.length === 0 ? (
            <span className="text-[#8B949E]">awaiting first reading block…</span>
          ) : (
            log.map((ln, i) => {
              const isSep = /^-+$/.test(ln);
              const isAlive = /^STATUS\s*:/.test(ln);
              const isRiskLine = /^Risk (Type|Level)\s*:/i.test(ln);
              return (
                <div
                  key={i}
                  className={
                    isSep
                      ? 'text-[#3B4654]'
                      : isAlive
                        ? 'text-[#34D399] font-semibold'
                        : isRiskLine
                          ? 'text-[#C7D2FE]'
                          : 'text-[#E8ECEE]'
                  }
                >
                  {ln || '\u00A0'}
                </div>
              );
            })
          )}
        </div>

        <div className="px-3.5 py-1.5 border-t border-[#1E252E] bg-[#11161D] flex items-center justify-between">
          <span className="text-[10px] text-[#8B949E]">
            <span className={source === 'serial' ? 'text-[#34D399]' : 'text-[#8B949E]'}>
              {source === 'serial' ? '●' : '○'}
            </span>{' '}
            {source === 'serial' ? (status.activePort || 'ESP32 connected') : 'mock demo feed'} · 115200 8-N-1
          </span>
          <span className="text-[10px] text-[#8B949E]">STATUS : ALIVE → every 30 seconds</span>
        </div>
      </div>

      {/* 7. Firmware contract note */}
      <div className="bg-[#FFFFFF] border border-[#E3E7EC] rounded-[8px] p-3.5 text-[11px] text-[#6B7684] flex items-start gap-2.5">
        <Wifi className="w-4 h-4 text-[#3457D5] shrink-0 mt-0.5" />
        <div>
          To drive this dashboard with your board, flash firmware that prints the block below every 2 s and
          <span className="font-mono text-[#E85D3D]"> STATUS : ALIVE </span>
          every 30 s. The backend parses each <span className="font-mono">key : value</span> line and republishes it on the
          dedicated <span className="font-mono">esp32-telemetry</span> stream.
          {!status.connected && (
            <span className="text-[#D48806] mt-1 block">
              Current display is the built-in demo feed — connect your ESP32 above to switch to physical data.
            </span>
          )}
        </div>
      </div>

      {/* 8. Alert toast stack */}
      {toasts.length > 0 && (
        <div className="fixed top-3 right-3 z-[9999] flex flex-col gap-2 pointer-events-none">
          {toasts.map((t) => {
            const lc = LEVEL_COLORS[t.riskLevel] || '#D9364A';
            return (
              <div
                key={t.id}
                className="pointer-events-auto bg-white border rounded-lg shadow-xl flex items-stretch overflow-hidden esp32-toast"
                style={{ borderColor: `${lc}66` }}
              >
                <div className="w-1.5 shrink-0" style={{ backgroundColor: lc }} />
                <div className="flex items-center gap-3 px-3.5 py-3">
                  <Volume2 className="w-5 h-5 shrink-0" style={{ color: lc }} />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#1A2126]">{t.message}</div>
                    <div className="text-[10px] text-[#6B7684] mt-0.5">
                      temp {t.temp} °C · smoke {t.smoke} · water {t.water}
                    </div>
                  </div>
                  <button
                    onClick={() => { try { audioAlert.playBuzzerBeep(); } catch (_) {} }}
                    className="shrink-0 px-2 py-1 rounded text-[10px] font-medium border transition-colors"
                    style={{ borderColor: `${lc}44`, color: lc, backgroundColor: `${lc}0D` }}
                    title="Replay alert beep"
                  >
                    <Play className="w-3 h-3" />
                  </button>
                </div>
                <button
                  onClick={() => dismissToast(t.id)}
                  className="px-2 text-[#8A96A0] hover:text-[#1A2126] self-start pt-2"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}