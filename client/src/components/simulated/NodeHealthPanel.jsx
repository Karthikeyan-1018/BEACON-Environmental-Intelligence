import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Battery,
  BatteryLow,
  BatteryWarning,
  Radio,
  Timer,
  Wifi,
  WifiOff
} from 'lucide-react';
import { getHazardColor } from '../../hazardTheme';

const EMPTY_HEALTH = { battery: 100, rssi: -70, snr: 9, signal_level: 'good', signal_bars: 3, status: 'online' };

function relativeTime(ts, now) {
  if (!ts) return '—';
  const ageSec = Math.max(0, Math.round((now - new Date(ts).getTime()) / 1000));
  if (ageSec < 60) return `${ageSec}s ago`;
  if (ageSec < 3600) return `${Math.floor(ageSec / 60)}m ${ageSec % 60}s ago`;
  return `${Math.floor(ageSec / 3600)}h ago`;
}

function batteryColor(pct) {
  if (pct >= 60) return '#2E9E6B';
  if (pct >= 30) return '#E0972A';
  return '#D9364A';
}

function batteryIcon(pct) {
  if (pct >= 60) return Battery;
  if (pct >= 30) return BatteryWarning;
  return BatteryLow;
}

const STATUS_META = {
  online: { label: 'Online', dot: 'bg-[#2E9E6B]', text: 'text-[#2E9E6B]', bg: 'bg-[#2E9E6B]/10 border border-[#2E9E6B]/40' },
  degraded: { label: 'Degraded', dot: 'bg-[#D48806]', text: 'text-[#D48806]', bg: 'bg-[#D48806]/10 border border-[#D48806]/40' },
  offline: { label: 'Offline', dot: 'bg-[#8A96A0]', text: 'text-[#6B7684]', bg: 'bg-[#F1F3F6] border border-[#E3E7EC]' }
};

export default function NodeHealthPanel({ nodes = [] }) {
  const [now, setNow] = useState(Date.now());
  const [sortKey, setSortKey] = useState('battery');

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const enriched = useMemo(
    () => nodes.map((n) => ({ ...n, health: n.health || EMPTY_HEALTH })),
    [nodes]
  );

  const sorted = useMemo(() => {
    const list = [...enriched];
    if (sortKey === 'battery') list.sort((a, b) => (a.health.battery || 0) - (b.health.battery || 0));
    else if (sortKey === 'signal') list.sort((a, b) => (a.health.rssi || 0) - (b.health.rssi || 0));
    else list.sort((a, b) => (a.zone || '').localeCompare(b.zone || ''));
    return list;
  }, [enriched, sortKey]);

  const stats = useMemo(() => {
    const total = enriched.length;
    const online = enriched.filter((n) => n.health.status === 'online').length;
    const degraded = enriched.filter((n) => n.health.status === 'degraded').length;
    const offline = Math.max(0, total - online - degraded);
    const avgBattery = total
      ? Math.round(enriched.reduce((s, n) => s + (n.health.battery || 0), 0) / total)
      : 0;
    const avgRssi = total
      ? Math.round(enriched.reduce((s, n) => s + (n.health.rssi || 0), 0) / total)
      : 0;
    return { total, online, degraded, offline, avgBattery, avgRssi };
  }, [enriched]);

  const sortPills = [
    { key: 'battery', label: 'Lowest battery' },
    { key: 'signal', label: 'Weakest signal' },
    { key: 'zone', label: 'Zone A–Z' }
  ];

  return (
    <div className="console-panel p-3.5 space-y-3">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[#EDEFF2]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[6px] bg-[#3457D5]/10 flex items-center justify-center text-[#3457D5]">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#1A2126] uppercase tracking-wide">
              Node health monitoring
            </h3>
            <p className="text-[11px] text-[#6B7684]">
              Battery, LoRa link quality, last-seen heartbeat &amp; connection health per regional node
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-[#F1F3F6] p-0.5 rounded-[3px] border border-[#E3E7EC]">
          {sortPills.map((p) => (
            <button
              key={p.key}
              onClick={() => setSortKey(p.key)}
              className={`px-2.5 py-1 rounded-[2px] text-xs font-medium transition-colors ${
                sortKey === p.key
                  ? 'bg-[#FFFFFF] text-[#3457D5] border border-[#E3E7EC] shadow-sm'
                  : 'text-[#6B7684] hover:text-[#1A2126]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="bg-[#F7F8FA] p-2.5 rounded-[4px] border border-[#E3E7EC]">
          <span className="text-[11px] text-[#6B7684] block">Nodes reporting</span>
          <span className="text-xl font-semibold text-[#1A2126]">{stats.total}/21</span>
        </div>
        <div className="bg-[#F7F8FA] p-2.5 rounded-[4px] border border-[#E3E7EC]">
          <span className="text-[11px] text-[#6B7684] block">Healthy link</span>
          <span className="text-xl font-semibold text-[#2E9E6B]">{stats.online}</span>
        </div>
        <div className="bg-[#F7F8FA] p-2.5 rounded-[4px] border border-[#E3E7EC]">
          <span className="text-[11px] text-[#6B7684] block">Degraded</span>
          <span className={`text-xl font-semibold ${stats.degraded ? 'text-[#D48806]' : 'text-[#1A2126]'}`}>{stats.degraded}</span>
        </div>
        <div className="bg-[#F7F8FA] p-2.5 rounded-[4px] border border-[#E3E7EC]">
          <span className="text-[11px] text-[#6B7684] block">Avg battery</span>
          <span className="text-xl font-semibold text-[#1A2126]">{stats.avgBattery}%</span>
        </div>
        <div className="bg-[#F7F8FA] p-2.5 rounded-[4px] border border-[#E3E7EC]">
          <span className="text-[11px] text-[#6B7684] block">Avg LoRa RSSI</span>
          <span className="text-xl font-semibold text-[#1A2126]">{stats.avgRssi} dBm</span>
        </div>
      </div>

      {/* Health table */}
      <div className="bg-[#F7F8FA] rounded-[6px] border border-[#E3E7EC] overflow-hidden">
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[#F1F3F6] z-10">
              <tr className="text-left text-[10px] uppercase tracking-wide text-[#6B7684]">
                <th className="px-3 py-2 font-semibold">Node</th>
                <th className="px-3 py-2 font-semibold">Battery</th>
                <th className="px-3 py-2 font-semibold">LoRa signal</th>
                <th className="px-3 py-2 font-semibold">SNR</th>
                <th className="px-3 py-2 font-semibold">Last seen</th>
                <th className="px-3 py-2 font-semibold">Connection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDEFF2]">
              {sorted.map((node) => {
                const h = node.health;
                const hazColor = getHazardColor(node.hazard_type);
                const bColor = batteryColor(h.battery);
                const BIcon = batteryIcon(h.battery);
                const status = STATUS_META[h.status] || STATUS_META.offline;
                const batteryWidth = Math.max(4, Math.min(100, h.battery || 0));

                return (
                  <tr key={node.node_id} className="hover:bg-[#FFFFFF] transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: hazColor }} />
                        <div>
                          <span className="font-sensor-num font-semibold text-[#1A2126]">{node.node_id}</span>
                          <div className="text-[10px] text-[#6B7684]">{node.zone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2 min-w-[110px]">
                        <BIcon className="w-3.5 h-3.5 shrink-0" style={{ color: bColor }} />
                        <div className="flex-1 h-1.5 bg-[#E3E7EC] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${batteryWidth}%`, backgroundColor: bColor }} />
                        </div>
                        <span className="font-sensor-num text-[#1A2126] w-8 text-right">{h.battery}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-end gap-0.5 h-3">
                          {[1, 2, 3, 4].map((bar) => (
                            <span
                              key={bar}
                              className="w-1 rounded-sm"
                              style={{
                                height: `${bar * 25}%`,
                                backgroundColor: bar <= (h.signal_bars || 0) ? hazColor : '#CFD6DE'
                              }}
                            />
                          ))}
                        </div>
                        <span className="font-sensor-num text-[#1A2126]">{h.rssi} dBm</span>
                        <span className="text-[10px] text-[#6B7684] capitalize">{h.signal_level}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-sensor-num text-[#1A2126]">+{Number(h.snr).toFixed(1)} dB</span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5 text-[#6B7684]">
                        <Timer className="w-3 h-3" />
                        <span>{relativeTime(h.last_seen, now)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${status.bg}`}>
                        {h.status === 'online' ? (
                          <Wifi className="w-3 h-3" />
                        ) : h.status === 'degraded' ? (
                          <Radio className="w-3 h-3" />
                        ) : (
                          <WifiOff className="w-3 h-3" />
                        )}
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}