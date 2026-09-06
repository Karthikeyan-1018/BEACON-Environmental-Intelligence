import React from 'react';

export default function SensorValueCard({
  title,
  value,
  unit,
  prevValue,
  min = 0,
  max = 100,
  warningThreshold,
  criticalThreshold,
  precision = 1
}) {
  const numVal = Number(value) || 0;
  const numPrev = prevValue !== undefined ? Number(prevValue) : numVal;
  const diff = numVal - numPrev;

  // Strict independent threshold evaluation per sensor
  let status = 'normal';
  if (criticalThreshold !== undefined && numVal >= criticalThreshold) {
    status = 'critical';
  } else if (warningThreshold !== undefined && numVal >= warningThreshold) {
    status = 'warning';
  }

  // Calculate bar fill percentage
  const percent = Math.min(100, Math.max(0, ((numVal - min) / (max - min)) * 100));

  // Determine trend text (clean text, no graphical arrows)
  let trendText = 'steady';
  if (diff > 0.1) {
    trendText = `+${diff.toFixed(precision)}`;
  } else if (diff < -0.1) {
    trendText = `${diff.toFixed(precision)}`;
  }

  return (
    <div className="px-4 py-3 border-b border-[#EDEFF2] last:border-b-0 bg-transparent hover:bg-[#F7F8FA] transition-colors">
      {/* Top: Title & Low-Opacity Tinted Badge */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs font-medium text-[#1A2126]">
          {title}
        </span>
        <div>
          {status === 'critical' && (
            <span className="badge-risk-high">
              High risk
            </span>
          )}
          {status === 'warning' && (
            <span className="badge-risk-medium">
              Elevated
            </span>
          )}
          {status === 'normal' && (
            <span className="badge-normal">
              Normal
            </span>
          )}
        </div>
      </div>

      {/* Main Row: Mono Number (semi-bold on light) + Trend */}
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-1.5">
          <span
            className={`font-sensor-num font-semibold text-2xl tracking-tight ${
              status === 'critical'
                ? 'text-[#D9364A]'
                : status === 'warning'
                  ? 'text-[#D48806]'
                  : 'text-[#1A2126]'
            }`}
          >
            {typeof value === 'number' ? value.toFixed(precision) : value}
          </span>
          <span className="text-xs text-[#6B7684]">
            {unit}
          </span>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-[#6B7684]">
            {trendText}
          </span>
        </div>
      </div>

      {/* Subtle Hairline Range Bar */}
      <div className="w-full bg-[#EDEFF2] h-1.5 rounded-full mt-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            status === 'critical'
              ? 'bg-[#D9364A]'
              : status === 'warning'
                ? 'bg-[#D48806]'
                : 'bg-[#2E9E6B]'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Surrounding Context in Muted Text */}
      <div className="flex justify-between text-[10px] text-[#6B7684] mt-1">
        <span>{min} {unit}</span>
        {warningThreshold !== undefined && (
          <span>Threshold {warningThreshold}</span>
        )}
        <span>{max} {unit}</span>
      </div>
    </div>
  );
}
