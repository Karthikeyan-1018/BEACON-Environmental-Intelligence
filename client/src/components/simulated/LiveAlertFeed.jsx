import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getHazardColor } from '../../hazardTheme';

export default function LiveAlertFeed({ alerts = [], onSelectNodeById }) {
  const [filterSeverity, setFilterSeverity] = useState('all');

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity === 'all') return true;
    return a.severity === filterSeverity;
  });

  const getRecipientBadge = (recipient) => {
    if (recipient.includes('Authority & Citizen') || recipient.includes('Dual Dispatch')) {
      return {
        text: 'Authorities & citizens (dual dispatch)',
        className: 'badge-risk-high'
      };
    }
    if (recipient.includes('Citizen Advisory')) {
      return {
        text: 'Citizen advisory (SMS / app)',
        className: 'badge-risk-medium'
      };
    }
    return {
      text: 'Authority tactical watchlist',
      className: 'badge-neutral'
    };
  };

  return (
    <div className="console-panel p-3 flex flex-col h-full">
      {/* Header & Filter */}
      <div className="flex items-center justify-between border-b border-[#EDEFF2] pb-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#1A2126]">
            Alert dispatch feed
          </span>
          <span className="text-[11px] text-[#6B7684]">
            ({alerts.length} total)
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setFilterSeverity('all')}
            className={`console-btn py-0.5 px-2 text-[11px] ${
              filterSeverity === 'all' ? 'console-btn-active font-medium' : 'text-[#6B7684]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterSeverity('high')}
            className={`console-btn py-0.5 px-2 text-[11px] ${
              filterSeverity === 'high' ? 'console-btn-active font-medium' : 'text-[#6B7684]'
            }`}
          >
            Critical
          </button>
          <button
            onClick={() => setFilterSeverity('medium')}
            className={`console-btn py-0.5 px-2 text-[11px] ${
              filterSeverity === 'medium' ? 'console-btn-active font-medium' : 'text-[#6B7684]'
            }`}
          >
            Elevated
          </button>
        </div>
      </div>

      {/* Alert Feed List: Left-Border Colored by Hazard Type (4px) */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 max-h-[520px]">
        {filteredAlerts.length === 0 ? (
          <div className="h-36 flex flex-col items-center justify-center text-center p-4 text-[#6B7684]">
            <CheckCircle2 className="w-5 h-5 text-[#2E9E6B] mb-1 opacity-70" />
            <p className="text-xs font-medium text-[#1A2126]">No active alerts</p>
            <p className="text-[11px] text-[#6B7684] mt-0.5">
              Regional nodes operating within baseline ranges
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isHigh = alert.severity === 'high';
            const hazardColor = getHazardColor(alert.hazard_type);
            const recipient = getRecipientBadge(alert.recipient || '');
            const timeStr = new Date(alert.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });

            return (
              <div
                key={alert.id}
                style={{ borderLeftColor: hazardColor }}
                className={`p-2.5 rounded-[4px] border border-[#E3E7EC] border-l-[4px] shadow-[0_1px_3px_rgba(16,24,32,0.04)] transition-colors ${
                  isHigh
                    ? 'bg-[#D9364A]/[0.03]'
                    : 'bg-[#FFFFFF]'
                }`}
              >
                {/* Event header */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: hazardColor }}
                    />
                    <span className="text-xs font-semibold text-[#1A2126]">
                      {alert.hazard_label || 'Hazard event'} detected
                    </span>
                  </div>

                  <span className={isHigh ? 'badge-risk-high' : 'badge-risk-medium'}>
                    {alert.severity} risk
                  </span>
                </div>

                {/* Node info */}
                <div className="text-[11px] text-[#6B7684] mb-1">
                  <button
                    onClick={() => onSelectNodeById && onSelectNodeById(alert.node_id)}
                    className="hover:underline font-semibold cursor-pointer"
                    style={{ color: hazardColor }}
                  >
                    {alert.node_id}
                  </button>
                  <span className="text-[#6B7684]"> ({alert.node_name}, {alert.zone})</span>
                </div>

                {/* Reading values */}
                <div className="text-[10px] text-[#6B7684] my-1 bg-[#F7F8FA] px-2 py-1 rounded-[3px] border border-[#E3E7EC] flex flex-wrap gap-2">
                  <span>Reading: <span className="font-sensor-num font-semibold text-[#1A2126]">{alert.primary_value}</span></span>
                  <span>Confidence: <span className="text-[#2E9E6B] font-medium">{Math.round((alert.confidence || 0.9) * 100)}%</span></span>
                </div>

                {/* Recipient tag & time */}
                <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[#EDEFF2] mt-1">
                  <span className={recipient.className}>
                    {recipient.text}
                  </span>
                  <span className="text-[#6B7684]">{timeStr}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
