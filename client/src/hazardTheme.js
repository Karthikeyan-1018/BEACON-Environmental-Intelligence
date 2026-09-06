/**
 * Centralized Hazard-Color Theme & Token Definitions (Light Theme)
 * Problem Statement: SIH26178 (Qualcomm)
 * Clean, bright, high-clarity monitoring console
 */

export const HAZARD_COLORS = {
  flood: '#2B7FD4',         // Blue (Water level / Rainfall surge)
  forest_fire: '#E85D3D',   // Coral-orange (Smoke / Wildfire temp)
  air_pollution: '#8B4FD9', // Violet (PM2.5 / PM10)
  extreme_heat: '#E0972A',  // Amber-gold (Microclimate / Surface temp)
  landslide: '#8C6A4F',     // Terracotta-brown (Soil moisture / Vibration)
  chemical_leak: '#E23B72', // Magenta-pink (Toxic gas / VOC concentration)
  water_quality: '#1FA88A'  // Teal-green (pH / Turbidity)
};

// Primary interactive chrome: nav, buttons, links, active tab (confident indigo-blue)
export const CHROME_ACCENT = '#3457D5';

// Severity tokens with full metadata and backwards compatibility
export const SEVERITY_COLORS = {
  normal: { color: '#2E9E6B', tint: 'rgba(46, 158, 107, 0.1)', label: 'Normal' },
  low: { color: '#2E9E6B', tint: 'rgba(46, 158, 107, 0.1)', label: 'Low' },
  elevated: { color: '#D48806', tint: 'rgba(212, 136, 6, 0.1)', label: 'Elevated' },
  warning: { color: '#D48806', tint: 'rgba(212, 136, 6, 0.1)', label: 'Warning' },
  medium: { color: '#D48806', tint: 'rgba(212, 136, 6, 0.1)', label: 'Medium' },
  critical: { color: '#D9364A', tint: 'rgba(217, 54, 74, 0.1)', label: 'Critical' },
  high: { color: '#D9364A', tint: 'rgba(217, 54, 74, 0.1)', label: 'High' }
};

export function getSeverityColor(severity = 'low') {
  const sev = String(severity).toLowerCase();
  if (sev === 'high' || sev === 'critical') return '#D9364A';
  if (sev === 'medium' || sev === 'warning' || sev === 'elevated') return '#D48806';
  return '#2E9E6B';
}

export const HAZARD_LABELS = {
  flood: 'Flash flood',
  forest_fire: 'Forest fire',
  air_pollution: 'Air pollution',
  extreme_heat: 'Extreme heat',
  landslide: 'Landslide',
  chemical_leak: 'Chemical leak',
  water_quality: 'Water quality'
};

export function getHazardColor(hazardType) {
  return HAZARD_COLORS[hazardType] || '#6B7684';
}

export function getHazardSeverityStyle(hazardType, severity = 'low') {
  const baseColor = getHazardColor(hazardType);
  if (severity === 'high') {
    return {
      color: baseColor,
      background: `${baseColor}1A`, // ~10% tint
      border: `${baseColor}`,       // full border
      pulse: true,
      opacity: 1
    };
  }
  if (severity === 'medium') {
    return {
      color: baseColor,
      background: `${baseColor}14`, // ~8% tint
      border: `${baseColor}66`,
      pulse: false,
      opacity: 1
    };
  }
  // Low / nominal
  return {
    color: baseColor,
    background: `${baseColor}0D`, // ~5% tint
    border: '#E3E7EC',
    pulse: false,
    opacity: 0.75
  };
}
