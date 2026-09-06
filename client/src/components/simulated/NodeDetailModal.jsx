import React from 'react';
import { X, BrainCircuit, ArrowUp, ArrowDown } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { getHazardColor, HAZARD_LABELS, getSeverityColor } from '../../hazardTheme';

const KEY_LABEL = { pm25: 'PM2.5', pm10: 'PM10', ph: 'pH', voc: 'VOC' };

function keyLabel(key) {
  return KEY_LABEL[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function bandOf(ev) {
  if (!ev) return 'normal';
  if (ev.inverted) {
    if (ev.value <= ev.critical) return 'critical';
    if (ev.value <= ev.warning) return 'warning';
    return 'normal';
  }
  if (ev.value >= ev.critical) return 'critical';
  if (ev.value >= ev.warning) return 'warning';
  return 'normal';
}

export default function NodeDetailModal({ node, onClose }) {
  if (!node) return null;

  const isCritical = node.risk_level === 'high';
  const isWarning = node.risk_level === 'medium';

  const riskColor = getSeverityColor(node.risk_level);
  const badgeClass = isCritical ? 'badge-risk-high' : (isWarning ? 'badge-risk-medium' : 'badge-risk-low');
  const hazardColor = getHazardColor(node.hazard_type);
  const hazardLabel = HAZARD_LABELS[node.hazard_type] || node.hazard_type;

  let recipient = 'Local automated telemetry logging';
  if (isCritical && node.confidence_score >= 0.85) {
    recipient = 'Disaster Management Authority (NDRF/SDMA) and citizen emergency broadcast';
  } else if (isWarning && node.confidence_score >= 0.75) {
    recipient = 'Citizen early warning advisory (SMS and app alert)';
  } else if (isWarning) {
    recipient = 'District disaster control room tactical watchlist';
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-[#FFFFFF] border border-[#E3E7EC] rounded-[4px] shadow-[0_4px_24px_rgba(16,24,32,0.12)] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#EDEFF2] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${isCritical ? 'animate-pulse' : ''}`}
              style={{ backgroundColor: hazardColor }}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#1A2126]">
                  {node.node_id}
                </span>
                <span
                  className="px-1.5 py-0.5 rounded-[3px] text-[10px] font-medium border"
                  style={{
                    color: hazardColor,
                    borderColor: `${hazardColor}50`,
                    backgroundColor: `${hazardColor}14`
                  }}
                >
                  {hazardLabel}
                </span>
                <span className={badgeClass}>
                  {node.risk_level} risk
                </span>
                <span className="text-[11px] text-[#6B7684]">
                  State: {node.state.toLowerCase()}
                </span>
              </div>
              <p className="text-xs text-[#6B7684] mt-0.5">
                {node.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-[3px] text-[#6B7684] hover:text-[#1A2126] hover:bg-[#F1F3F6] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-3.5">
          
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-[#F7F8FA] p-2.5 rounded-[4px] border border-[#E3E7EC]">
              <span className="text-[10px] text-[#6B7684] block">Zone</span>
              <span className="text-[#1A2126] font-medium truncate block mt-0.5">{node.zone}</span>
            </div>
            <div className="bg-[#F7F8FA] p-2.5 rounded-[4px] border border-[#E3E7EC]">
              <span className="text-[10px] text-[#6B7684] block">Coordinates</span>
              <span className="text-[#1A2126] font-medium block mt-0.5">{node.lat.toFixed(4)}°N, {node.lon.toFixed(4)}°E</span>
            </div>
            <div className="bg-[#F7F8FA] p-2.5 rounded-[4px] border border-[#E3E7EC]">
              <span className="text-[10px] text-[#6B7684] block">Elevation</span>
              <span className="text-[#1A2126] font-medium block mt-0.5">{node.elevation || '420m'}</span>
            </div>
            <div className="bg-[#F7F8FA] p-2.5 rounded-[4px] border border-[#E3E7EC]">
              <span className="text-[10px] text-[#6B7684] block">AI confidence</span>
              <span className="text-[#2E9E6B] font-semibold block mt-0.5">{Math.round(node.confidence_score * 100)}%</span>
            </div>
          </div>

          {/* Current Sensor Telemetry */}
          <div>
            <span className="text-xs font-semibold text-[#1A2126] block mb-1.5">
              Live sensor telemetry
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(node.currentValues || {}).map(([key, val]) => (
                <div key={key} className="bg-[#F7F8FA] p-3 rounded-[4px] border border-[#E3E7EC] flex items-center justify-between">
                  <span className="text-xs text-[#6B7684]">
                    {key.replace('_', ' ')}
                  </span>
                  <span className="font-sensor-num font-semibold text-2xl text-[#1A2126]">
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Why this risk level? — AI decision explanation */}
          {node.riskExplanation && (
            <div
              className="rounded-[4px] border p-3 border-l-4"
              style={{ borderColor: '#E3E7EC', borderLeftColor: riskColor, backgroundColor: `${riskColor}0A` }}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <BrainCircuit className="w-3.5 h-3.5" style={{ color: riskColor }} />
                <span className="text-xs font-semibold text-[#1A2126]">
                  Why this risk level?
                </span>
                <span className="ml-auto text-[10px] text-[#6B7684]">
                  AI decision rationale &middot; {Math.round(node.confidence_score * 100)}% confidence
                </span>
              </div>

              <p className="text-xs leading-relaxed text-[#1A2126]">
                {node.riskExplanation}
              </p>

              {node.riskEvidence && (
                <div className="mt-2 space-y-1.5">
                  {[node.riskEvidence.primary, node.riskEvidence.secondary].map((ev) => {
                    const band = bandOf(ev);
                    const bandColor = band === 'critical' ? '#D9364A' : band === 'warning' ? '#D48806' : '#2E9E6B';
                    return (
                      <div key={ev.key} className="flex items-center gap-2 bg-[#FFFFFF] rounded-[3px] border border-[#E3E7EC] px-2 py-1.5">
                        {ev.inverted
                          ? <ArrowDown className="w-3 h-3 shrink-0 text-[#D48806]" />
                          : <ArrowUp className="w-3 h-3 shrink-0 text-[#D48806]" />}
                        <span className="text-[10px] font-semibold text-[#6B7684] w-24 shrink-0">
                          {keyLabel(ev.key)}
                        </span>
                        <span className="flex items-center gap-1 font-sensor-num font-bold text-xs text-[#1A2126]">
                          {ev.value}
                          <span className="text-[10px] font-normal text-[#6B7684]">{ev.unit}</span>
                          <span
                            className="ml-1 px-1.5 py-0.5 rounded-[3px] text-[9px] font-bold"
                            style={{ backgroundColor: `${bandColor}18`, color: bandColor }}
                          >
                            {band === 'critical' ? 'CRITICAL' : band === 'warning' ? 'WARNING' : 'WITHIN RANGE'}
                          </span>
                        </span>
                        <span className="ml-auto hidden md:flex items-center gap-1.5">
                          <span className="text-[9px] px-1.5 py-0.5 rounded-[3px] border text-[#D48806] border-[#D48806]/30 bg-[#D48806]/5">
                            {ev.inverted ? '≤' : '≥'} {ev.warning} {ev.unit} warn
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-[3px] border text-[#D9364A] border-[#D9364A]/30 bg-[#D9364A]/5">
                            {ev.inverted ? '≤' : '≥'} {ev.critical} {ev.unit} crit
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Sparkline History Curve */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-[#1A2126]">
                15-cycle telemetry trend
              </span>
              <span className="text-[11px] text-[#6B7684]">
                State: {node.state.toLowerCase()}
              </span>
            </div>
            <div className="w-full h-36 bg-[#F7F8FA] rounded-[4px] p-2 border border-[#E3E7EC]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={node.history || []} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#EDEFF2" vertical={false} />
                  <XAxis dataKey="timestamp" tick={false} stroke="#EDEFF2" />
                  <YAxis stroke="#6B7684" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E3E7EC', borderRadius: '4px', fontSize: '11px', color: '#1A2126', boxShadow: '0 2px 8px rgba(16,24,32,0.08)' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="primary"
                    name="Primary reading"
                    stroke={hazardColor}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Warning Dispatch Target */}
          <div className="p-2.5 rounded-[4px] bg-[#F7F8FA] border border-[#E3E7EC] text-xs">
            <span className="text-[10px] text-[#6B7684] block mb-0.5">
              Disaster warning dispatch target:
            </span>
            <p className="text-[#1A2126] font-medium text-xs">
              {recipient}
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-[#EDEFF2] flex justify-end bg-[#FFFFFF]">
          <button
            onClick={onClose}
            className="console-btn"
          >
            Close inspector
          </button>
        </div>

      </div>
    </div>
  );
}
