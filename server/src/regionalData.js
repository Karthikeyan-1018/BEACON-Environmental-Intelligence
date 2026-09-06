/**
 * Regional Multi-Hazard Network Node Definitions
 * Problem Statement: SIH26178 (Qualcomm)
 * Geographic Corridor: Western Ghats / Coimbatore / Nilgiris / River Basins
 */

const HAZARD_TYPES = {
  FLOOD: 'flood',
  FOREST_FIRE: 'forest_fire',
  AIR_POLLUTION: 'air_pollution',
  EXTREME_HEAT: 'extreme_heat',
  LANDSLIDE: 'landslide',
  CHEMICAL_LEAK: 'chemical_leak',
  WATER_QUALITY: 'water_quality'
};

const HAZARD_METADATA = {
  [HAZARD_TYPES.FLOOD]: {
    label: 'Flash Flood / River Surge',
    icon: 'Droplets',
    primaryUnit: 'cm',
    primaryKey: 'water_level',
    secondaryKey: 'rainfall',
    secondaryUnit: 'mm/h',
    normal: { water_level: [10, 35], rainfall: [0, 8] },
    warning: { water_level: 60, rainfall: 25 },
    critical: { water_level: 95, rainfall: 50 },
    color: '#2B7FD4' // Blue
  },
  [HAZARD_TYPES.FOREST_FIRE]: {
    label: 'Forest Fire / Smoke',
    icon: 'Flame',
    primaryUnit: 'PPM',
    primaryKey: 'smoke',
    secondaryKey: 'temp',
    secondaryUnit: '°C',
    normal: { smoke: [40, 110], temp: [24, 32] },
    warning: { smoke: 300, temp: 42 },
    critical: { smoke: 750, temp: 52 },
    color: '#E85D3D' // Coral-orange
  },
  [HAZARD_TYPES.AIR_POLLUTION]: {
    label: 'Air Pollution (PM2.5 / PM10)',
    icon: 'Wind',
    primaryUnit: 'µg/m³',
    primaryKey: 'pm25',
    secondaryKey: 'pm10',
    secondaryUnit: 'µg/m³',
    normal: { pm25: [20, 45], pm10: [40, 75] },
    warning: { pm25: 120, pm10: 180 },
    critical: { pm25: 250, pm10: 350 },
    color: '#8B4FD9' // Violet
  },
  [HAZARD_TYPES.EXTREME_HEAT]: {
    label: 'Extreme Heat & Microclimate',
    icon: 'Sun',
    primaryUnit: '°C',
    primaryKey: 'temp',
    secondaryKey: 'humidity',
    secondaryUnit: '%',
    normal: { temp: [28, 35], humidity: [45, 65] },
    warning: { temp: 41, humidity: 25 },
    critical: { temp: 46, humidity: 18 },
    color: '#E0972A' // Amber-gold
  },
  [HAZARD_TYPES.LANDSLIDE]: {
    label: 'Landslide Precursor',
    icon: 'Mountain',
    primaryUnit: '% Saturation',
    primaryKey: 'soil_moisture',
    secondaryKey: 'vibration',
    secondaryUnit: 'g-force',
    normal: { soil_moisture: [25, 45], vibration: [0.01, 0.05] },
    warning: { soil_moisture: 75, vibration: 0.25 },
    critical: { soil_moisture: 92, vibration: 0.65 },
    color: '#8C6A4F' // Terracotta-brown
  },
  [HAZARD_TYPES.CHEMICAL_LEAK]: {
    label: 'Industrial Chemical Leak',
    icon: 'ShieldAlert',
    primaryUnit: 'PPM',
    primaryKey: 'gas_concentration',
    secondaryKey: 'voc',
    secondaryUnit: 'PPB',
    normal: { gas_concentration: [5, 20], voc: [50, 150] },
    warning: { gas_concentration: 85, voc: 600 },
    critical: { gas_concentration: 220, voc: 1800 },
    color: '#E23B72' // Magenta-pink
  },
  [HAZARD_TYPES.WATER_QUALITY]: {
    label: 'Water Quality Degradation',
    icon: 'Activity',
    primaryUnit: 'pH',
    primaryKey: 'ph',
    secondaryKey: 'turbidity',
    secondaryUnit: 'NTU',
    normal: { ph: [6.8, 7.8], turbidity: [1.5, 4.5] },
    warning: { ph: 8.8, turbidity: 25 },
    critical: { ph: 10.2, turbidity: 85 },
    color: '#1FA88A' // Teal-green
  }
};

const REGIONAL_NODES = [
  // 1. Flood / Flash Flood (Noyyal & Bhavani River Corridors)
  {
    node_id: 'REG-FL-01',
    name: 'Bhavani Barrage Weir #3',
    hazard_type: HAZARD_TYPES.FLOOD,
    zone: 'Bhavani River Basin',
    lat: 11.2384,
    lon: 76.9961,
    elevation: '298m',
    installed: '2025-11-10'
  },
  {
    node_id: 'REG-FL-02',
    name: 'Noyyal River Bridge Lowland',
    hazard_type: HAZARD_TYPES.FLOOD,
    zone: 'Noyyal Drainage Corridor',
    lat: 10.9932,
    lon: 76.9644,
    elevation: '412m',
    installed: '2026-01-14'
  },
  {
    node_id: 'REG-FL-03',
    name: 'Siruvani Catchment Sluice',
    hazard_type: HAZARD_TYPES.FLOOD,
    zone: 'Siruvani Hill Stream',
    lat: 10.9572,
    lon: 76.7118,
    elevation: '580m',
    installed: '2026-02-02'
  },

  // 2. Forest Fire / Wildfire (Nilgiris Biosphere & Anamalai Foothills)
  {
    node_id: 'REG-FF-01',
    name: 'Maruthamalai Forest Perimeter',
    hazard_type: HAZARD_TYPES.FOREST_FIRE,
    zone: 'Western Ghats Ridge',
    lat: 11.0458,
    lon: 76.8524,
    elevation: '620m',
    installed: '2025-08-20'
  },
  {
    node_id: 'REG-FF-02',
    name: 'Kallar Elephant Corridor Reserve',
    hazard_type: HAZARD_TYPES.FOREST_FIRE,
    zone: 'Nilgiris Foothills',
    lat: 11.3129,
    lon: 76.9015,
    elevation: '480m',
    installed: '2025-09-12'
  },
  {
    node_id: 'REG-FF-03',
    name: 'Anamalai Foothill Sanctuary Sector 4',
    hazard_type: HAZARD_TYPES.FOREST_FIRE,
    zone: 'Anamalai Biosphere',
    lat: 10.7451,
    lon: 76.9145,
    elevation: '510m',
    installed: '2025-10-05'
  },

  // 3. Air Pollution (Urban Corridors & Transportation Hubs)
  {
    node_id: 'REG-AP-01',
    name: 'Gandhipuram Transit Junction',
    hazard_type: HAZARD_TYPES.AIR_POLLUTION,
    zone: 'Central Urban Core',
    lat: 11.0183,
    lon: 76.9676,
    elevation: '425m',
    installed: '2026-03-01'
  },
  {
    node_id: 'REG-AP-02',
    name: 'Avinashi Road Express Corridor',
    hazard_type: HAZARD_TYPES.AIR_POLLUTION,
    zone: 'Eastern Commercial Corridor',
    lat: 11.0345,
    lon: 77.0125,
    elevation: '430m',
    installed: '2026-03-15'
  },
  {
    node_id: 'REG-AP-03',
    name: 'Ukkadam Bus Terminal Plaza',
    hazard_type: HAZARD_TYPES.AIR_POLLUTION,
    zone: 'South Urban Hub',
    lat: 10.9882,
    lon: 76.9587,
    elevation: '418m',
    installed: '2026-04-10'
  },

  // 4. Extreme Heat (Urban Heat Island & Concrete Zones)
  {
    node_id: 'REG-EH-01',
    name: 'Peelamedu Tech Park Open Plaza',
    hazard_type: HAZARD_TYPES.EXTREME_HEAT,
    zone: 'Urban Heat Island',
    lat: 11.0267,
    lon: 77.0253,
    elevation: '432m',
    installed: '2026-04-18'
  },
  {
    node_id: 'REG-EH-02',
    name: 'Town Hall Commercial Grid',
    hazard_type: HAZARD_TYPES.EXTREME_HEAT,
    zone: 'High-Density Downtown',
    lat: 10.9965,
    lon: 76.9612,
    elevation: '415m',
    installed: '2026-05-02'
  },
  {
    node_id: 'REG-EH-03',
    name: 'Saravanampatti Logistics Terminal',
    hazard_type: HAZARD_TYPES.EXTREME_HEAT,
    zone: 'North Industrial Plain',
    lat: 11.0821,
    lon: 76.9942,
    elevation: '440m',
    installed: '2026-05-19'
  },

  // 5. Landslide Precursor (Mountain Slopes & Ghat Roads)
  {
    node_id: 'REG-LS-01',
    name: 'Coonoor Ghat Hairpin Bend #9',
    hazard_type: HAZARD_TYPES.LANDSLIDE,
    zone: 'Coonoor Mountain Pass',
    lat: 11.3412,
    lon: 76.8124,
    elevation: '1380m',
    installed: '2025-07-22'
  },
  {
    node_id: 'REG-LS-02',
    name: 'Burliar Steep Cut Slope',
    hazard_type: HAZARD_TYPES.LANDSLIDE,
    zone: 'Nilgiris Eastern Slope',
    lat: 11.3289,
    lon: 76.8621,
    elevation: '940m',
    installed: '2025-08-04'
  },
  {
    node_id: 'REG-LS-03',
    name: 'Valparai Ghat Road Kilometre 17',
    hazard_type: HAZARD_TYPES.LANDSLIDE,
    zone: 'Anamalai High Slopes',
    lat: 10.5187,
    lon: 76.9532,
    elevation: '1120m',
    installed: '2025-09-28'
  },

  // 6. Industrial Emissions / Chemical Leak (Industrial Belts)
  {
    node_id: 'REG-CH-01',
    name: 'SIDCO Kurichi Chemical Cluster #2',
    hazard_type: HAZARD_TYPES.CHEMICAL_LEAK,
    zone: 'Kurichi Industrial Estate',
    lat: 10.9412,
    lon: 76.9782,
    elevation: '410m',
    installed: '2026-02-14'
  },
  {
    node_id: 'REG-CH-02',
    name: 'Malumichampatti Electroplating Hub',
    hazard_type: HAZARD_TYPES.CHEMICAL_LEAK,
    zone: 'South Heavy Industrial Belt',
    lat: 10.9025,
    lon: 76.9984,
    elevation: '416m',
    installed: '2026-02-28'
  },
  {
    node_id: 'REG-CH-03',
    name: 'Arasur Foundry & Chemical Zone',
    hazard_type: HAZARD_TYPES.CHEMICAL_LEAK,
    zone: 'East Industrial Corridor',
    lat: 11.0654,
    lon: 77.1215,
    elevation: '390m',
    installed: '2026-03-20'
  },

  // 7. Water Quality Degradation (Lake Basins & Wetlands)
  {
    node_id: 'REG-WQ-01',
    name: 'Singanallur Wetland Bird Sanctuary Outlet',
    hazard_type: HAZARD_TYPES.WATER_QUALITY,
    zone: 'Singanallur Lake Basin',
    lat: 10.9856,
    lon: 77.0223,
    elevation: '410m',
    installed: '2026-01-19'
  },
  {
    node_id: 'REG-WQ-02',
    name: 'Valankulam Urban Lake Inflow',
    hazard_type: HAZARD_TYPES.WATER_QUALITY,
    zone: 'Valankulam Eco Basin',
    lat: 10.9912,
    lon: 76.9745,
    elevation: '415m',
    installed: '2026-01-25'
  },
  {
    node_id: 'REG-WQ-03',
    name: 'Ukkadam Periyakulam Sluice Gate',
    hazard_type: HAZARD_TYPES.WATER_QUALITY,
    zone: 'Ukkadam Reservoir',
    lat: 10.9821,
    lon: 76.9534,
    elevation: '414m',
    installed: '2026-02-10'
  }
];

module.exports = {
  HAZARD_TYPES,
  HAZARD_METADATA,
  REGIONAL_NODES
};
