import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Maximize2, Minimize2, Layers, Eye } from 'lucide-react';
import { HAZARD_COLORS, getHazardColor, HAZARD_LABELS } from '../../hazardTheme';

export default function RegionalMap({
  nodes = [],
  selectedNode,
  onSelectNode
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersGroupRef = useRef(null);
  const circlesGroupRef = useRef(null);
  const markersMapRef = useRef(new Map());
  const circlesMapRef = useRef(new Map());

  const [activeLayer, setActiveLayer] = useState('street'); // 'street' | 'satellite' | 'topo'
  const [showDangerZones, setShowDangerZones] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const TILE_LAYERS = {
    street: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      className: 'light-tiles',
      maxZoom: 18
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      className: '',
      maxZoom: 18
    },
    topo: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      className: '',
      maxZoom: 17
    }
  };

  // 1. Initialize Leaflet Map with robust cleanup
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [11.04, 76.96],
      zoom: 10,
      zoomControl: true,
      attributionControl: false
    });

    const initialTile = TILE_LAYERS[activeLayer];
    const tileLayer = L.tileLayer(initialTile.url, {
      className: initialTile.className,
      maxZoom: initialTile.maxZoom
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    markersGroupRef.current = L.layerGroup().addTo(map);
    circlesGroupRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    // Recalculate dimensions after mount
    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(resizeTimer);
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      markersGroupRef.current = null;
      circlesGroupRef.current = null;
      markersMapRef.current.clear();
      circlesMapRef.current.clear();
    };
  }, []);

  // 2. Switch Tile Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const cfg = TILE_LAYERS[activeLayer];
    const newLayer = L.tileLayer(cfg.url, {
      className: cfg.className,
      maxZoom: cfg.maxZoom
    }).addTo(map);

    tileLayerRef.current = newLayer;
  }, [activeLayer]);

  // 3. Smooth flyTo when selectedNode changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedNode) return;
    map.flyTo([selectedNode.lat, selectedNode.lon], 13, {
      duration: 1.2,
      easeLinearity: 0.25
    });
  }, [selectedNode?.node_id]);

  // 4. Smooth In-Place Marker & Danger Circle Updates (No Screen Flickering)
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current || !circlesGroupRef.current) return;

    const markersGroup = markersGroupRef.current;
    const circlesGroup = circlesGroupRef.current;
    const markersMap = markersMapRef.current;
    const circlesMap = circlesMapRef.current;

    const currentActiveIds = new Set(nodes.map(n => n.node_id));

    // Remove markers for nodes no longer in view
    for (const [id, marker] of markersMap.entries()) {
      if (!currentActiveIds.has(id)) {
        markersGroup.removeLayer(marker);
        markersMap.delete(id);
      }
    }

    // Remove circles for nodes no longer in view
    for (const [id, circle] of circlesMap.entries()) {
      if (!currentActiveIds.has(id) || !showDangerZones) {
        circlesGroup.removeLayer(circle);
        circlesMap.delete(id);
      }
    }

    nodes.forEach((node) => {
      const isCritical = node.risk_level === 'high';
      const isWarning = node.risk_level === 'medium';
      const isSelected = selectedNode && selectedNode.node_id === node.node_id;
      const hazardColor = getHazardColor(node.hazard_type);

      const markerOpacity = isCritical || isWarning ? 1 : 0.75;
      const markerSize = isSelected ? 16 : (isCritical ? 14 : 11);

      const markerHtml = `
        <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          ${isCritical ? `
            <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: ${hazardColor}; opacity: 0.45; animation: console-alert-pulse 2s infinite;"></div>
          ` : ''}
          <div style="
            width: ${markerSize}px; 
            height: ${markerSize}px; 
            border-radius: 50%; 
            background: ${hazardColor}; 
            opacity: ${markerOpacity};
            border: 2.5px solid #FFFFFF; 
            box-shadow: ${isCritical ? `0 0 0 2px ${hazardColor}, 0 2px 8px rgba(0,0,0,0.3)` : (isWarning ? `0 0 0 1px ${hazardColor}, 0 1px 5px rgba(0,0,0,0.2)` : '0 1px 3px rgba(0,0,0,0.2)')};
            transition: all 0.2s;
          "></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'console-hazard-marker',
        html: markerHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const valuesList = Object.entries(node.currentValues || {})
        .map(([k, v]) => `<div>${k.replace('_', ' ')}: <span class="font-sensor-num" style="color: #1A2126; font-weight: 600;">${v}</span></div>`)
        .join('');

      const popupContent = `
        <div style="font-family: 'Inter', sans-serif; font-size: 11px; line-height: 1.4; padding: 4px; min-width: 190px;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #EDEFF2; padding-bottom: 4px; margin-bottom: 6px;">
            <span style="font-weight: 700; color: #1A2126;">${node.node_id}</span>
            <span style="color: ${hazardColor}; font-size: 10px; font-weight: 700; text-transform: uppercase;">${node.risk_level} RISK</span>
          </div>
          <div style="font-weight: 600; color: #1A2126; margin-bottom: 2px;">${node.name}</div>
          <div style="color: #6B7684; font-size: 10px; margin-bottom: 6px;">Zone: ${node.zone} &bull; ${HAZARD_LABELS[node.hazard_type] || node.hazard_type}</div>
          <div style="display: grid; grid-template-columns: 1fr; gap: 3px; background: #F7F8FA; padding: 6px; border: 1px solid #E3E7EC; border-radius: 4px; color: #6B7684;">
            ${valuesList}
          </div>
          <div style="margin-top: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #6B7684;">
            <span>Markov: <strong>${node.state.toLowerCase()}</strong></span>
            <span>Confidence: <strong>${Math.round(node.confidence_score * 100)}%</strong></span>
          </div>
        </div>
      `;

      if (markersMap.has(node.node_id)) {
        // Update existing marker in-place without destroying DOM node!
        const existingMarker = markersMap.get(node.node_id);
        existingMarker.setIcon(customIcon);
        existingMarker.setPopupContent(popupContent);
      } else {
        // Create new marker
        const newMarker = L.marker([node.lat, node.lon], { icon: customIcon });
        newMarker.bindPopup(popupContent);
        newMarker.on('click', () => {
          onSelectNode(node);
        });
        markersGroup.addLayer(newMarker);
        markersMap.set(node.node_id, newMarker);
      }

      // Update Danger Zone Circle
      if (showDangerZones && (isCritical || isWarning)) {
        const radius = isCritical ? 2400 : 1300;
        const opacity = isCritical ? 0.20 : 0.08;

        if (circlesMap.has(node.node_id)) {
          const circle = circlesMap.get(node.node_id);
          circle.setStyle({
            color: hazardColor,
            fillColor: hazardColor,
            fillOpacity: opacity,
            radius: radius
          });
        } else {
          const circle = L.circle([node.lat, node.lon], {
            color: hazardColor,
            fillColor: hazardColor,
            fillOpacity: opacity,
            radius: radius,
            weight: 1.5
          });
          circlesGroup.addLayer(circle);
          circlesMap.set(node.node_id, circle);
        }
      } else if (circlesMap.has(node.node_id)) {
        circlesGroup.removeLayer(circlesMap.get(node.node_id));
        circlesMap.delete(node.node_id);
      }
    });

  }, [nodes, selectedNode?.node_id, showDangerZones]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);
  };

  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([11.04, 76.96], 10, { animate: true });
    }
  };

  return (
    <div className={`console-panel overflow-hidden flex flex-col transition-all ${
      isFullscreen ? 'fixed inset-4 z-[2000] shadow-2xl' : 'h-full'
    }`}>
      
      {/* Map Header with Controls & Legend */}
      <div className="px-3.5 py-2.5 border-b border-[#EDEFF2] flex flex-wrap items-center justify-between gap-2 bg-[#FFFFFF]">
        
        {/* Title & Active Nodes */}
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-[#3457D5]" />
          <span className="text-xs font-bold text-[#1A2126]">
            Regional Environmental Geospatial Grid
          </span>
          <span className="text-[10px] text-[#6B7684] font-mono">
            ({nodes.length} Nodes Online)
          </span>
        </div>

        {/* Action Controls & Layer Switcher */}
        <div className="flex items-center gap-1.5">
          
          {/* Tile Layer Switcher */}
          <div className="flex items-center bg-[#F1F3F6] p-0.5 rounded-[4px] border border-[#E3E7EC]">
            <button
              onClick={() => setActiveLayer('street')}
              className={`px-2 py-0.5 rounded-[3px] text-[11px] font-medium transition-all ${
                activeLayer === 'street'
                  ? 'bg-[#FFFFFF] text-[#3457D5] shadow-xs'
                  : 'text-[#6B7684] hover:text-[#1A2126]'
              }`}
            >
              Street
            </button>
            <button
              onClick={() => setActiveLayer('satellite')}
              className={`px-2 py-0.5 rounded-[3px] text-[11px] font-medium transition-all ${
                activeLayer === 'satellite'
                  ? 'bg-[#FFFFFF] text-[#3457D5] shadow-xs'
                  : 'text-[#6B7684] hover:text-[#1A2126]'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => setActiveLayer('topo')}
              className={`px-2 py-0.5 rounded-[3px] text-[11px] font-medium transition-all ${
                activeLayer === 'topo'
                  ? 'bg-[#FFFFFF] text-[#3457D5] shadow-xs'
                  : 'text-[#6B7684] hover:text-[#1A2126]'
              }`}
            >
              Terrain
            </button>
          </div>

          {/* Danger Heat Zones Toggle */}
          <button
            onClick={() => setShowDangerZones(!showDangerZones)}
            className={`px-2 py-1 rounded-[4px] border text-xs flex items-center gap-1 transition-all ${
              showDangerZones
                ? 'bg-[#3457D5]/10 border-[#3457D5]/40 text-[#3457D5]'
                : 'bg-[#FFFFFF] border-[#E3E7EC] text-[#6B7684]'
            }`}
            title="Toggle Danger Inundation Zones"
          >
            <Eye className="w-3 h-3" />
            <span className="text-[10px]">Impact Zones</span>
          </button>

          {/* Reset View */}
          <button
            onClick={handleResetView}
            className="p-1.5 bg-[#FFFFFF] border border-[#E3E7EC] hover:bg-[#F1F3F6] rounded-[4px] text-[#6B7684] hover:text-[#1A2126] transition-colors"
            title="Reset Corridor View"
          >
            <Navigation className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 bg-[#FFFFFF] border border-[#E3E7EC] hover:bg-[#F1F3F6] rounded-[4px] text-[#6B7684] hover:text-[#1A2126] transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand Regional Map'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

        </div>

      </div>

      {/* Leaflet Map Canvas */}
      <div className="relative flex-1 min-h-[480px] w-full">
        <div ref={mapContainerRef} className="w-full h-full min-h-[480px]" />

        {/* Hazard Legend Strip on Top Left */}
        <div className="absolute top-3 left-3 z-[400] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-[6px] border border-[#E3E7EC] text-[10px] text-[#6B7684] shadow-sm flex items-center gap-3">
          <span className="font-bold text-[#1A2126] uppercase">Hazards:</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: HAZARD_COLORS.flood }}></span> Flood
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: HAZARD_COLORS.forest_fire }}></span> Fire
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: HAZARD_COLORS.air_pollution }}></span> Air
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: HAZARD_COLORS.extreme_heat }}></span> Heat
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: HAZARD_COLORS.landslide }}></span> Landslide
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: HAZARD_COLORS.chemical_leak }}></span> Chem
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: HAZARD_COLORS.water_quality }}></span> Water
          </span>
        </div>

        {/* Location Overlay on Bottom Left */}
        <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-[6px] border border-[#E3E7EC] text-xs text-[#6B7684] shadow-sm font-medium">
          <span>Western Ghats Corridor &bull; Coimbatore & Nilgiris Basin</span>
        </div>

      </div>

    </div>
  );
}
