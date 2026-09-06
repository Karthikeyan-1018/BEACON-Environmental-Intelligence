import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function AlertLogPanel({ alerts = [] }) {
  return (
    <div className="console-panel p-3.5 flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-[#EDEFF2] pb-2.5 mb-2.5">
        <span className="text-xs font-medium text-[#1A2126]">
          Edge node event log
        </span>
        <span className="text-[11px] text-[#6B7684]">
          {alerts.length} events
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 max-h-[260px] pr-1">
        {alerts.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-center p-4 text-[#6B7684]">
            <CheckCircle2 className="w-6 h-6 text-[#2E9E6B] mb-1.5 opacity-70" />
            <p className="text-xs font-medium text-[#1A2126]">All sensors nominal</p>
            <p className="text-[11px] text-[#6B7684] mt-0.5">
              No threshold anomalies recorded in recent cycles
            </p>
          </div>
        ) : (
          alerts.map((alert) => {
            const isHigh = alert.severity === 'high';
            const timeStr = new Date(alert.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });

            return (
              <div
                key={alert.id}
                className={`p-2.5 rounded-[4px] border border-[#E3E7EC] border-l-[4px] shadow-[0_1px_3px_rgba(16,24,32,0.04)] transition-colors ${
                  isHigh
                    ? 'border-l-[#D9364A] bg-[#D9364A]/[0.03]'
                    : 'border-l-[#D48806] bg-[#D48806]/[0.03]'
                }`}
              >
                {/* Event header */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    {isHigh ? (
                      <AlertCircle className="w-3.5 h-3.5 text-[#D9364A] shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-[#D48806] shrink-0" />
                    )}
                    <span className="text-xs font-semibold text-[#1A2126]">
                      {alert.trigger_cause || 'Threshold exceeded'}
                    </span>
                  </div>

                  <span className={isHigh ? 'badge-risk-high' : 'badge-risk-medium'}>
                    {alert.severity} risk
                  </span>
                </div>

                {/* Metrics snapshot in sensor mono */}
                {alert.metrics && (
                  <div className="flex flex-wrap gap-2 text-[10px] text-[#6B7684] my-1 bg-[#F7F8FA] px-2 py-1 rounded-[3px] border border-[#E3E7EC]">
                    {Object.entries(alert.metrics).map(([k, v]) => (
                      <span key={k}>
                        {k}: <span className="font-sensor-num font-semibold text-[#1A2126]">{v}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Recipient & timestamp */}
                <div className="flex items-center justify-between text-[11px] text-[#6B7684] mt-1 pt-1 border-t border-[#EDEFF2]">
                  <span>Target: {alert.recipient}</span>
                  <span>{timeStr}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
