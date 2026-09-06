import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { HAZARD_COLORS } from '../../hazardTheme';

export default function LiveCharts({ history = [] }) {
  const [activeMetric, setActiveMetric] = useState('combined');

  const customTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#FFFFFF] border border-[#E3E7EC] p-2.5 rounded-[4px] text-xs shadow-md">
          <p className="text-[#6B7684] text-[11px] mb-1.5 border-b border-[#EDEFF2] pb-1">
            Time {label}
          </p>
          {payload.map((item, index) => (
            <div key={index} className="flex items-center justify-between gap-3 py-0.5">
              <span className="flex items-center gap-1.5 text-[#6B7684]">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span>{item.name}:</span>
              </span>
              <span className="font-sensor-num font-semibold text-[#1A2126]">{item.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="console-panel p-3.5 flex flex-col h-full">
      {/* Header & Metric View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 pb-2.5 border-b border-[#EDEFF2]">
        <span className="text-xs font-medium text-[#1A2126]">
          Telemetry time series (last 30 samples)
        </span>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-[#F1F3F6] p-0.5 rounded-[3px] border border-[#E3E7EC]">
          <button
            onClick={() => setActiveMetric('combined')}
            className={`px-2 py-1 rounded-[2px] text-xs font-medium transition-colors ${
              activeMetric === 'combined'
                ? 'bg-[#FFFFFF] text-[#3457D5] border border-[#E3E7EC] shadow-sm'
                : 'text-[#6B7684] hover:text-[#1A2126]'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveMetric('water')}
            className={`px-2 py-1 rounded-[2px] text-xs font-medium transition-colors ${
              activeMetric === 'water'
                ? 'bg-[#FFFFFF] text-[#3457D5] border border-[#E3E7EC] shadow-sm'
                : 'text-[#6B7684] hover:text-[#1A2126]'
            }`}
          >
            Water and rain
          </button>
          <button
            onClick={() => setActiveMetric('thermal')}
            className={`px-2 py-1 rounded-[2px] text-xs font-medium transition-colors ${
              activeMetric === 'thermal'
                ? 'bg-[#FFFFFF] text-[#3457D5] border border-[#E3E7EC] shadow-sm'
                : 'text-[#6B7684] hover:text-[#1A2126]'
            }`}
          >
            Temp and humidity
          </button>
          <button
            onClick={() => setActiveMetric('smoke')}
            className={`px-2 py-1 rounded-[2px] text-xs font-medium transition-colors ${
              activeMetric === 'smoke'
                ? 'bg-[#FFFFFF] text-[#3457D5] border border-[#E3E7EC] shadow-sm'
                : 'text-[#6B7684] hover:text-[#1A2126]'
            }`}
          >
            Smoke
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-[240px] sm:h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          {activeMetric === 'combined' ? (
            <LineChart data={history} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#EDEFF2" vertical={false} />
              <XAxis dataKey="timestamp" stroke="#6B7684" tick={{ fontSize: 10 }} tickLine={false} />
              <YAxis yAxisId="left" stroke="#6B7684" tick={{ fontSize: 10 }} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" stroke="#6B7684" tick={{ fontSize: 10 }} tickLine={false} />
              <Tooltip content={customTooltip} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px', color: '#1A2126' }} />
              <Line yAxisId="left" type="monotone" dataKey="water_level" name="Water (cm)" stroke={HAZARD_COLORS.flood} strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line yAxisId="left" type="monotone" dataKey="rainfall" name="Rain (mm/h)" stroke={HAZARD_COLORS.water_quality} strokeWidth={2} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
              <Line yAxisId="right" type="monotone" dataKey="smoke" name="Smoke (ppm)" stroke={HAZARD_COLORS.forest_fire} strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line yAxisId="left" type="monotone" dataKey="temp" name="Temp (°C)" stroke={HAZARD_COLORS.extreme_heat} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          ) : activeMetric === 'water' ? (
            <LineChart data={history} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#EDEFF2" vertical={false} />
              <XAxis dataKey="timestamp" stroke="#6B7684" tick={{ fontSize: 10 }} tickLine={false} />
              <YAxis stroke="#6B7684" tick={{ fontSize: 10 }} tickLine={false} />
              <Tooltip content={customTooltip} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px', color: '#1A2126' }} />
              <Line type="monotone" dataKey="water_level" name="Water level (cm)" stroke={HAZARD_COLORS.flood} strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="rainfall" name="Rainfall (mm/h)" stroke={HAZARD_COLORS.water_quality} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          ) : activeMetric === 'thermal' ? (
            <LineChart data={history} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#EDEFF2" vertical={false} />
              <XAxis dataKey="timestamp" stroke="#6B7684" tick={{ fontSize: 10 }} tickLine={false} />
              <YAxis yAxisId="t" domain={[15, 55]} stroke="#6B7684" tick={{ fontSize: 10 }} tickLine={false} />
              <YAxis yAxisId="h" orientation="right" domain={[20, 100]} stroke="#6B7684" tick={{ fontSize: 10 }} tickLine={false} />
              <Tooltip content={customTooltip} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px', color: '#1A2126' }} />
              <Line yAxisId="t" type="monotone" dataKey="temp" name="Temperature (°C)" stroke={HAZARD_COLORS.extreme_heat} strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line yAxisId="h" type="monotone" dataKey="humidity" name="Humidity (%)" stroke={HAZARD_COLORS.air_pollution} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          ) : (
            <LineChart data={history} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#EDEFF2" vertical={false} />
              <XAxis dataKey="timestamp" stroke="#6B7684" tick={{ fontSize: 10 }} tickLine={false} />
              <YAxis stroke="#6B7684" tick={{ fontSize: 10 }} tickLine={false} />
              <Tooltip content={customTooltip} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px', color: '#1A2126' }} />
              <Line type="monotone" dataKey="smoke" name="Smoke (ppm)" stroke={HAZARD_COLORS.forest_fire} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
