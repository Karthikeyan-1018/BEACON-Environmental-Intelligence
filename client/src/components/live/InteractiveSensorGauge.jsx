import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function InteractiveSensorGauge({
  title,
  value = 0,
  unit = '',
  min = 0,
  max = 100,
  warningThreshold,
  criticalThreshold,
  precision = 1,
  color = '#2B7FD4',
  icon: Icon,
  history = []
}) {
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  const clampedValue = Math.min(Math.max(numericValue, min), max);
  const percentage = ((clampedValue - min) / (max - min)) * 100;

  const isCritical = criticalThreshold !== undefined && numericValue >= criticalThreshold;
  const isWarning = !isCritical && warningThreshold !== undefined && numericValue >= warningThreshold;

  // Active status color
  const statusColor = isCritical 
    ? '#D9364A' 
    : isWarning 
      ? '#D48806' 
      : color || '#2E9E6B';

  const statusLabel = isCritical ? 'CRITICAL' : isWarning ? 'WARNING' : 'NORMAL';

  // SVG circular arc calculations (240-degree arc: 150° to 390°)
  const radius = 54;
  const strokeWidth = 8;
  const arcCircumference = 2 * Math.PI * radius * (240 / 360);
  const strokeDashoffset = arcCircumference - (arcCircumference * percentage) / 100;

  // Compute trend delta from history
  let trendDelta = 0;
  let trendDirection = 'flat';
  if (history.length >= 2) {
    const prev = history[history.length - 2];
    const curr = history[history.length - 1];
    const keyMap = {
      'Water Level': 'water_level',
      'Ambient Temp': 'temp',
      'Humidity': 'humidity',
      'Smoke (MQ-2)': 'smoke',
      'Rainfall': 'rainfall'
    };
    const key = keyMap[title];
    if (key && prev && curr && prev[key] !== undefined && curr[key] !== undefined) {
      trendDelta = +(curr[key] - prev[key]).toFixed(precision);
      if (trendDelta > 0.05) trendDirection = 'up';
      else if (trendDelta < -0.05) trendDirection = 'down';
    }
  }

  return (
    <div className="bg-[#FFFFFF] border border-[#E3E7EC] hover:border-[#CFD6DE] rounded-[8px] p-3.5 flex flex-col justify-between shadow-[0_1px_3px_rgba(16,24,32,0.04)] hover:shadow-[0_3px_12px_rgba(16,24,32,0.08)] transition-all duration-200 relative overflow-hidden group">
      
      {/* Top subtle highlight line colored by active state */}
      <div 
        className="absolute top-0 left-0 right-0 h-[3px] transition-colors duration-300"
        style={{ backgroundColor: statusColor }}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5">
          {Icon && (
            <div 
              className="w-6 h-6 rounded-[4px] flex items-center justify-center text-xs"
              style={{ backgroundColor: `${statusColor}15`, color: statusColor }}
            >
              <Icon className="w-3.5 h-3.5" />
            </div>
          )}
          <span className="text-xs font-semibold text-[#1A2126] tracking-tight">
            {title}
          </span>
        </div>

        {/* Status Pill */}
        <span 
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider transition-all duration-300"
          style={{ 
            backgroundColor: `${statusColor}15`, 
            color: statusColor,
            border: `1px solid ${statusColor}40` 
          }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Circular Radial Gauge */}
      <div className="relative flex items-center justify-center my-1.5">
        <svg 
          className="w-36 h-28 transform -rotate-[210deg]" 
          viewBox="0 0 140 140"
        >
          {/* Background Track */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="#EDEFF2"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcCircumference} 999`}
            strokeLinecap="round"
          />

          {/* Active Gradient / Color Fill Arc */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={statusColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcCircumference} 999`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>

        {/* Center Digital Value Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-3 pointer-events-none">
          <div className="flex items-baseline gap-1">
            <span 
              className="text-2xl font-bold font-sensor-num tracking-tight transition-colors duration-300"
              style={{ color: isCritical ? '#D9364A' : '#1A2126' }}
            >
              {numericValue.toFixed(precision)}
            </span>
            <span className="text-xs font-semibold text-[#6B7684]">
              {unit}
            </span>
          </div>

          {/* Live Trend Indicator */}
          <div className="flex items-center gap-1 mt-0.5 text-[11px] font-medium">
            {trendDirection === 'up' && (
              <span className="flex items-center text-[#D9364A]">
                <TrendingUp className="w-3 h-3 mr-0.5" />
                +{trendDelta}
              </span>
            )}
            {trendDirection === 'down' && (
              <span className="flex items-center text-[#2E9E6B]">
                <TrendingDown className="w-3 h-3 mr-0.5" />
                {trendDelta}
              </span>
            )}
            {trendDirection === 'flat' && (
              <span className="flex items-center text-[#8A96A0]">
                <Minus className="w-3 h-3 mr-0.5" />
                stable
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer Limits & Thresholds */}
      <div className="flex items-center justify-between text-[11px] text-[#8A96A0] pt-1.5 border-t border-[#EDEFF2] font-mono">
        <span>Min {min}</span>
        {warningThreshold && (
          <span className="text-[#D48806]/90 font-medium">
            Warn &ge;{warningThreshold}
          </span>
        )}
        {criticalThreshold && (
          <span className="text-[#D9364A]/90 font-medium">
            Crit &ge;{criticalThreshold}
          </span>
        )}
        <span>Max {max}</span>
      </div>

    </div>
  );
}
