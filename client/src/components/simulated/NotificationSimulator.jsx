import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Smartphone,
  MessageSquare,
  ShieldAlert,
  X,
  Megaphone,
  Radio,
  Siren
} from 'lucide-react';
import { getHazardColor } from '../../hazardTheme';

const SMS_DELAY = 250;
const AUTHORITY_DELAY = 900;
const CITIZEN_DELAY = 1500;
const CARD_LIFETIME = 9000;

const AUTHORITY_UNITS = {
  flood: 'NDRF 4th Battalion (Arakkonam Unit)',
  forest_fire: 'Tamil Nadu Fire & Rescue Services',
  air_pollution: 'TN Pollution Control Board (TNPCB)',
  extreme_heat: 'District Disaster Management Authority',
  landslide: 'SDRF Geotechnical Response Team',
  chemical_leak: 'Industrial Safety & Health Dept (DISH)',
  water_quality: 'TWAD Water Quality Task Force'
};

function timeStr() {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function buildSmsBody(alert) {
  const label = (alert.hazard_label || alert.hazard_type || 'hazard').toUpperCase();
  return (
    `[BEACON EMERGENCY] ${label} alert near ${alert.node_name} (${alert.zone}). ` +
    `${alert.primary_value} detected, CRITICAL risk. Move to higher ground / safe zone now. ` +
    `Use evacuation corridor NH-544. Stay tuned to civic broadcasts.`
  );
}

function buildCitizenBody(alert) {
  const label = alert.hazard_label || alert.hazard_type;
  const conf = Math.round((alert.confidence || 0.9) * 100);
  return (
    `${label} detected near ${alert.node_name}. Risk CRITICAL (${conf}% confidence). ` +
    `${alert.primary_value} exceeds safe thresholds. Follow official evacuation advisories.`
  );
}

function ToastCard({ toast, onClose }) {
  const [visible, setVisible] = useState(false);
  const { kind, alert } = toast;

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const tHide = setTimeout(() => setVisible(false), CARD_LIFETIME - 300);
    const tClose = setTimeout(onClose, CARD_LIFETIME);
    return () => {
      clearTimeout(tHide);
      clearTimeout(tClose);
    };
  }, [onClose]);

  const hazardColor = getHazardColor(alert.hazard_type);

  let card = null;

  if (kind === 'sms') {
    card = (
      <div className="rounded-[10px] bg-[#0B3B2E] text-white shadow-[0_10px_32px_rgba(16,24,32,0.35)] overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-[#0E4535] border-b border-white/10">
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-[#7DE3B0]" />
            <span className="text-[11px] font-bold tracking-wide">SMS &middot; BEACON Emergency Gateway</span>
          </div>
          <span className="text-[10px] text-white/60 flex items-center gap-1">
            <Smartphone className="w-3 h-3" />
            {timeStr()}
          </span>
        </div>
        <div className="px-3 py-2 text-[10px] text-white/70 flex justify-between">
          <span>To: Citizens of {alert.zone}</span>
          <span>via +91 CELL BROADCAST</span>
        </div>
        <div className="px-3 pb-3">
          <div className="bg-white text-[#0B3B2E] rounded-md rounded-tl-sm px-3 py-2 text-[11.5px] leading-relaxed">
            {buildSmsBody(alert)}
            <span className="sms-caret inline-block w-[6px] h-[13px] bg-[#0B3B2E] ml-0.5 align-middle" />
          </div>
        </div>
      </div>
    );
  } else if (kind === 'authority') {
    const unit = AUTHORITY_UNITS[alert.hazard_type] || 'District Disaster Control Room';
    const conf = Math.round((alert.confidence || 0.9) * 100);
    card = (
      <div className="rounded-[10px] bg-[#FFFFFF] border border-[#E3E7EC] shadow-[0_10px_32px_rgba(16,24,32,0.25)] overflow-hidden border-l-[4px]"
        style={{ borderLeftColor: hazardColor }}>
        <div className="flex items-center justify-between px-3 py-2 bg-[#F1F3F6] border-b border-[#EDEFF2]">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-[#D9364A]" />
            <span className="text-[11px] font-bold text-[#1A2126] tracking-wide">AUTHORITY DISPATCH &middot; CONTROL ROOM</span>
          </div>
          <span className="text-[10px] text-[#6B7684]">{timeStr()}</span>
        </div>
        <div className="px-3 py-2.5 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#1A2126] uppercase tracking-wide" style={{ color: hazardColor }}>
              {alert.hazard_label}
            </span>
            <span className="badge-risk-high">CRITICAL</span>
          </div>
          <div className="text-[11px] text-[#6B7684]">
            Node <span className="font-sensor-num font-semibold text-[#1A2126]">{alert.node_id}</span> &middot; {alert.node_name} &middot; {alert.zone}
          </div>
          <div className="bg-[#F7F8FA] rounded-[4px] border border-[#E3E7EC] px-2 py-1.5 text-[11px] text-[#1A2126]">
            <span className="text-[#6B7684]">Reading:</span> <span className="font-sensor-num">{alert.primary_value}</span>
            <span className="mx-2 text-[#E3E7EC]">|</span>
            <span className="text-[#6B7684]">Confidence:</span> <span className="font-sensor-num text-[#2E9E6B]">{conf}%</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#1A2126] pt-1">
            <Siren className="w-3.5 h-3.5 text-[#D9364A]" />
            <span>
              <strong>{unit}</strong> &mdash; immediate response activated
            </span>
          </div>
        </div>
      </div>
    );
  } else {
    const conf = Math.round((alert.confidence || 0.9) * 100);
    card = (
      <div className="rounded-[14px] bg-[#141A20] text-white shadow-[0_10px_32px_rgba(16,24,32,0.4)] overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <div className="w-7 h-7 rounded-full bg-[#D9364A]/20 flex items-center justify-center">
            <Megaphone className="w-3.5 h-3.5 text-[#FF6B7A]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold tracking-wide text-white">
              BEACON Citizen Alert
            </div>
            <div className="text-[10px] text-white/55">now &middot; {timeStr()}</div>
          </div>
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: `${hazardColor}26`, color: hazardColor }}
          >
            CRITICAL
          </span>
        </div>
        <div className="px-3 pb-3">
          <div className="rounded-[8px] bg-white/5 border border-white/10 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[12px] font-bold" style={{ color: hazardColor }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: hazardColor }} />
              {alert.hazard_label}
            </div>
            <div className="text-[11px] text-white/80 leading-snug mt-1">
              {buildCitizenBody(alert)}
            </div>
            <div className="flex items-center justify-between text-[10px] text-white/55 mt-2">
              <span>{alert.node_id} &middot; {alert.zone}</span>
              <span>Confidence {conf}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto w-[340px] max-w-[92vw] transition-all duration-300 ease-out"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(48px)'
      }}
    >
      <div className="relative">
        <button
          onClick={onClose}
          className="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 rounded-full bg-[#FFFFFF] border border-[#E3E7EC] shadow-sm flex items-center justify-center text-[#6B7684] hover:text-[#D9364A]"
          title="Dismiss"
        >
          <X className="w-3 h-3" />
        </button>
        {card}
      </div>
    </div>
  );
}

export default function NotificationSimulator({ alerts = [] }) {
  const [toasts, setToasts] = useState([]);
  const [enabled, setEnabled] = useState(true);
  const [dockOpen, setDockOpen] = useState(false);
  const seenRef = useRef(new Set());
  const seqRef = useRef(0);
  const enabledRef = useRef(true);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (!enabledRef.current) return;
    const fresh = alerts.filter(
      (a) => a && a.severity === 'high' && !seenRef.current.has(a.id)
    );
    fresh.forEach((a) => seenRef.current.add(a.id));

    fresh.forEach((alert) => {
      const seq = ++seqRef.current;
      const spawn = (kind, delay) => {
        setTimeout(() => {
          if (!enabledRef.current) return;
          const toast = { id: `${seq}-${kind}`, kind, alert };
          setToasts((prev) => [...prev.slice(-6), toast]);
        }, delay);
      };
      spawn('sms', SMS_DELAY);
      spawn('authority', AUTHORITY_DELAY);
      spawn('citizen', CITIZEN_DELAY);
    });
  }, [alerts]);

  const handleToggle = () => {
    setEnabled((prev) => {
      const next = !prev;
      if (!next) setToasts([]);
      return next;
    });
  };

  return (
    <>
      {/* Auto-hiding toggle dock on the left edge: reach to reveal, slide back when idle */}
      <div
        className="fixed left-0 top-0 h-screen w-6 z-[1300]"
        onMouseEnter={() => setDockOpen(true)}
        onMouseLeave={() => setDockOpen(false)}
      >
        {/* Invisible hot-zone strip along the whole left edge */}
        <div className="absolute inset-0 w-6" />

        {/* Subtle idle hint indicator (hidden while open) */}
        {!dockOpen && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none">
            <div className="h-10 w-[5px] rounded-r-full bg-[#3457D5]/35 animate-pulse" />
          </div>
        )}

        {/* Sliding dock pill */}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 bg-[#0B0F14]/95 border border-l-0 border-[#3457D5]/40 rounded-l-none rounded-r-[14px] px-2 py-3 text-white shadow-[0_6px_20px_rgba(16,24,32,0.35)] transition-transform duration-300 ease-out"
          style={{
            transform: dockOpen
              ? 'translateX(0px)'
              : 'translateX(-100%)'
          }}
        >
          <Radio className="w-4 h-4 text-[#7DE3B0]" />
          <span
            className="text-[8px] font-bold tracking-[0.16em] text-white/70 uppercase"
            style={{ writingMode: 'vertical-rl' }}
          >
            Notification sim
          </span>
          <button
            onClick={handleToggle}
            onFocus={() => setDockOpen(true)}
            onBlur={() => setDockOpen(false)}
            className={`relative w-[18px] h-8 rounded-full transition-colors ${
              enabled ? 'bg-[#2E9E6B]' : 'bg-[#6B7684]/50'
            }`}
            title={enabled ? 'Pause simulated notifications' : 'Resume simulated notifications'}
          >
            <span
              className={`absolute left-0.5 w-[14px] h-[14px] rounded-full bg-white transition-all ${
                enabled ? 'top-[18px]' : 'top-0.5'
              }`}
            />
          </button>
          <span className={`text-[7px] font-bold tracking-wide ${enabled ? 'text-[#7DE3B0]' : 'text-white/50'}`}>
            {enabled ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>

      {/* Toast stack (bottom-right) */}
      <div className="fixed bottom-4 right-4 z-[1250] flex flex-col items-end gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </>
  );
}