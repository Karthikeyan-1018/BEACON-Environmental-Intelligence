import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell
} from 'recharts';
import { BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';
import { HAZARD_LABELS } from '../../hazardTheme';

const EMPTY = [];

export default function HistoricalAnalytics({ analytics = {} }) {
  const [view, setView] = useState('daily');

  const daily = analytics.dailyTrend || EMPTY;
  const weekly = analytics.weeklyTrend || EMPTY;
  const hazardCounts = analytics.hazardCounts || EMPTY;

  const data = view === 'daily' ? daily : weekly;
  const xKey = view === 'daily' ? 'date' : 'weekOf';

  // Trailing 7-day KPIs (from daily aggregate)
  const last7 = daily.slice(-7);
  const avgRisk7 = last7.length
    ? Math.round(last7.reduce((s, d) => s + (d.riskIndex || 0), 0) / last7.length)
    : 0;
  const alerts7 = last7.reduce((s, d) => s + (d.alertCount || 0), 0);
  const activeHazards = hazardCounts.filter((h) => (h.alerts || 0) > 0).length;

  const customTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className="bg-[#FFFFFF] border border-[#E3E7EC] p-2.5 rounded-[4px] text-xs shadow-md">
        <p className="text-[#6B7684] text-[11px] mb-1.5 border-b border-[#EDEFF2] pb-1">
          {label}
        </p>
        {payload.map((item, index) => (
          <div key={index} className="flex items-center justify-between gap-3 py-0.5">
            <span className="flex items-center gap-1.5 text-[#6B7684]">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: item.color || '#3457D5' }}
              />
              <span>{item.name}:</span>
            </span>
            <span className="font-sensor-num font-semibold text-[#1A2126]">{item.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="console-panel p-3.5 space-y-3.5">

      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[#EDEFF2]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[6px] bg-[#3457D5]/10 flex items-center justify-center text-[#3457D5]">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#1A2126] uppercase tracking-wide">
              Historical analytics
            </h3>
            <p className="text-[11px] text-[#6B7684]">
              Daily &amp; weekly regional risk trends with hazard-type incident counts
            </p>
          </div>
        </div>

        {/* Daily / Weekly View Toggle */}
        <div className="flex items-center gap-1 bg-[#F1F3F6] p-0.5 rounded-[3px] border border-[#E3E7EC]">
          <button
            onClick={() => setView('daily')}
            className={`px-2.5 py-1 rounded-[2px] text-xs font-medium transition-colors ${
              view === 'daily'
                ? 'bg-[#FFFFFF] text-[#3457D5] border border-[#E3E7EC] shadow-sm'
                : 'text-[#6B7684] hover:text-[#1A2126]'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setView('weekly')}
            className={`px-2.5 py-1 rounded-[2px] text-xs font-medium transition-colors ${
              view === 'weekly'
                ? 'bg-[#FFFFFF] text-[#3457D5] border border-[#E3E7EC] shadow-sm'
                : 'text-[#6B7684] hover:text-[#1A2126]'
            }`}
          >
            Weekly
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="bg-[#F7F8FA] p-2.5 rounded-[4px] border border-[#E3E7EC]">
          <span className="text-[11px] text-[#6B7684] block">
            Avg daily risk index (7d)
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className={`text-xl font-semibold ${
              avgRisk7 >= 40 ? 'text-[#D9364A]' : (avgRisk7 >= 25 ? 'text-[#D48806]' : 'text-[#1A2126]')
            }`}>
              {avgRisk7}
            </span>
            <span className="text-xs text-[#6B7684]">/ 100</span>
          </div>
        </div>

        <div className="bg-[#F7F8FA] p-2.5 rounded-[4px] border border-[#E3E7EC]">
          <span className="text-[11px] text-[#6B7684] block">
            Emergency alerts dispatched (7d)
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <AlertTriangle className="w-4 h-4 text-[#D48806]" />
            <span className="text-xl font-semibold text-[#1A2126]">{alerts7}</span>
            <span className="text-xs text-[#6B7684]">incidents</span>
          </div>
        </div>

        <div className="bg-[#F7F8FA] p-2.5 rounded-[4px] border border-[#E3E7EC]">
          <span className="text-[11px] text-[#6B7684] block">
            Hazard types alerted (7d)
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-semibold text-[#1A2126]">{activeHazards}</span>
            <span className="text-xs text-[#6B7684]">/ {hazardCounts.length || 7} monitored</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">

        {/* Trend: Risk Index (line) + Alert Volume (bars) */}
        <div className="lg:col-span-7 bg-[#F7F8FA] p-3 rounded-[6px] border border-[#E3E7EC]">
          <span className="text-xs font-semibold text-[#1A2126] flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-[#3457D5]" />
            {view === 'daily'
              ? 'Daily risk index & alert volume (last 14 days)'
              : 'Weekly risk index & alert volume (last 8 weeks)'}
          </span>
          <div className="w-full h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 5, right: 0, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#EDEFF2" vertical={false} />
                <XAxis dataKey={xKey} stroke="#6B7684" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis yAxisId="risk" domain={[0, 100]} stroke="#6B7684" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis yAxisId="alerts" orientation="right" stroke="#6B7684" tick={{ fontSize: 10 }} tickLine={false} />
                <Tooltip content={customTooltip} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px', color: '#1A2126' }} />
                <Bar yAxisId="alerts" dataKey="alertCount" name="Alerts" fill="#3457D5" radius={[3, 3, 0, 0]} barSize={18} />
                <Line yAxisId="risk" type="monotone" dataKey="riskIndex" name="Avg risk index" stroke="#D9364A" strokeWidth={2.5} dot={{ r: 2.5 }} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hazard Type Incident Counts (trailing 7 days) */}
        <div className="lg:col-span-5 bg-[#F7F8FA] p-3 rounded-[6px] border border-[#E3E7EC]">
          <span className="text-xs font-semibold text-[#1A2126] block mb-2">
            Incident counts by hazard type (last 7 days)
          </span>
          <div className="w-full h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={hazardCounts.map((h) => ({ ...h, shortLabel: HAZARD_LABELS[h.type] || h.label }))}
                margin={{ top: 0, right: 5, left: -12, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="2 2" stroke="#EDEFF2" horizontal={false} />
                <XAxis type="number" allowDecimals={false} stroke="#6B7684" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis type="category" dataKey="shortLabel" width={92} stroke="#6B7684" tick={{ fontSize: 10 }} tickLine={false} />
                <Tooltip
                  formatter={(value, name, props) => {
                    if (name === 'alerts') {
                      return [
                        `${value} alerts  (${props.payload.high} high / ${props.payload.medium} medium / ${props.payload.nodeCount} nodes)`,
                        props.payload.label
                      ];
                    }
                    return [value, name];
                  }}
                />
                <Bar dataKey="alerts" name="alerts" radius={[0, 3, 3, 0]} barSize={14}>
                  {hazardCounts.map((h, index) => (
                    <Cell key={index} fill={h.color || '#3457D5'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}