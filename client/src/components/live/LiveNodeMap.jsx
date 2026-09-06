import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  MapPin, 
  Navigation, 
  Layers, 
  Radio, 
  Radar, 
  Maximize2, 
  Minimize2,
  Signal,
  Wifi
} from 'lucide-react';
import { getSeverityColor } from '../../hazardTheme';

export default function LiveNodeMap({ telemetry }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markerRef = useRef(null);
  const gatewayMarkerRef = useRef(null);
  const linkLineRef = useRef(null);
  const circleRef = useRef(null);
  const coverageRingsRef = useRef([]);

  const [activeLayer, setActiveLayer] = useState('street'); // 'street' | 'satellite' | 'topo'
  const [showRings, setShowRings] = useState(true);
  const [showRadar, setShowRadar] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const lat = telemetry?.lat || 10.9366;
  const lon = telemetry?.lon || 76.9558;
  const riskLevel = telemetry?.risk_level || 'low';

  // Base station gateway coordinates (~520m northeast on SKCET campus)
  const gatewayLat = lat + 0.0032;
  const gatewayLon = lon + 0.0040;

  const TILE_LAYERS = {
    street: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      className: 'light-tiles',
      maxZoom: 19
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

  // 1. Initialize Map once with robust cleanup
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [(lat + gatewayLat) / 2, (lon + gatewayLon) / 2],
      zoom: 15,
      zoomControl: true,
      attributionControl: false
    });

    const initialTile = TILE_LAYERS[activeLayer];
    const tileLayer = L.tileLayer(initialTile.url, {
      className: initialTile.className,
      maxZoom: initialTile.maxZoom
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    // Recalculate dimensions after mount to prevent grey/broken tiles
    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(resizeTimer);
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      markerRef.current = null;
      gatewayMarkerRef.current = null;
      linkLineRef.current = null;
      circleRef.current = null;
      coverageRingsRef.current = [];
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

  // 3. Update Markers, LoRa Wireless Link Vector, and Radar Circles
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const color = getSeverityColor(riskLevel);
    const isHigh = riskLevel === 'high';
    const isMedium = riskLevel === 'medium';

    // A. Physical Sensor Node Marker (with optional 360° rotating radar sweep)
    const nodeIcon = L.divIcon({
      className: 'console-marker',
      html: `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
          ${showRadar ? `
            <div class="radar-scanner" style="position: absolute; width: 140px; height: 140px; border-radius: 50%; pointer-events: none;"></div>
          ` : ''}
          ${(isHigh || isMedium) ? `
            <div class="radar-wave" style="position: absolute; width: 100%; height: 100%; border-radius: 50%; border: 2px solid ${color}; background: ${color}25;"></div>
          ` : ''}
          <div style="width: 16px; height: 16px; border-radius: 50%; background: ${color}; border: 3px solid #FFFFFF; box-shadow: 0 2px 8px rgba(16,24,32,0.35); position: relative; z-index: 10;"></div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lon]);
      markerRef.current.setIcon(nodeIcon);
    } else {
      const marker = L.marker([lat, lon], { icon: nodeIcon }).addTo(map);
      markerRef.current = marker;
    }

    // Node Popup
    const nodePopupHtml = `
      <div style="font-family: 'Inter', sans-serif; font-size: 11px; line-height: 1.4; padding: 4px; min-width: 190px;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #EDEFF2; padding-bottom: 4px; margin-bottom: 6px;">
          <span style="font-weight: 700; color: #1A2126;">${telemetry?.node_id || 'N1-SKCET'} (Physical Edge Node)</span>
          <span style="color: ${color}; font-size: 10px; font-weight: 700; text-transform: uppercase;">${riskLevel}</span>
        </div>
        <div style="color: #6B7684; font-size: 10px; margin-bottom: 6px;">SKCET Campus Lab 1 &bull; 433MHz LoRa</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; background: #F7F8FA; padding: 6px; border: 1px solid #EDEFF2; border-radius: 4px;">
          <div>Water: <strong style="color: #1A2126;">${telemetry?.water_level || 0} cm</strong></div>
          <div>Rain: <strong style="color: #1A2126;">${telemetry?.rainfall || 0} mm/h</strong></div>
          <div>Temp: <strong style="color: #1A2126;">${telemetry?.temp || 0} °C</strong></div>
          <div>Smoke: <strong style="color: #1A2126;">${telemetry?.smoke || 0} ppm</strong></div>
        </div>
        <div style="margin-top: 6px; font-size: 10px; color: #6B7684;">
          Line-of-Sight Link: <strong>520m</strong> to Base Station Gateway
        </div>
      </div>
    `;
    markerRef.current.bindPopup(nodePopupHtml);

    // B. LoRa Base Station Gateway Marker
    const gatewayIcon = L.divIcon({
      className: 'gateway-marker',
      html: `
        <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
          <div style="width: 26px; height: 26px; border-radius: 6px; background: #3457D5; color: white; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 8px rgba(52,87,213,0.4);">
            📡
          </div>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    if (gatewayMarkerRef.current) {
      gatewayMarkerRef.current.setLatLng([gatewayLat, gatewayLon]);
    } else {
      const gMarker = L.marker([gatewayLat, gatewayLon], { icon: gatewayIcon }).addTo(map);
      gMarker.bindPopup(`
        <div style="font-family: 'Inter', sans-serif; font-size: 11px; padding: 4px; min-width: 180px;">
          <div style="font-weight: 700; color: #3457D5; border-bottom: 1px solid #EDEFF2; padding-bottom: 3px; margin-bottom: 4px;">
            ESP32 LoRa Base Station Gateway
          </div>
          <div style="color: #6B7684; font-size: 10px; margin-bottom: 4px;">
            SKCET Department Server Room &bull; USB Ingestion
          </div>
          <div style="background: #F7F8FA; padding: 4px 6px; border: 1px solid #EDEFF2; border-radius: 3px; font-size: 10px;">
            Frequency: 433.175 MHz &bull; Baud: 115200<br/>
            Store-and-Forward: Active Flash SPIFFS
          </div>
        </div>
      `);
      gatewayMarkerRef.current = gMarker;
    }

    // C. Animated LoRa RF Wireless Line-of-Sight Vector
    const linkCoords = [[lat, lon], [gatewayLat, gatewayLon]];
    if (linkLineRef.current) {
      linkLineRef.current.setLatLngs(linkCoords);
      linkLineRef.current.setStyle({ color: isHigh ? '#D9364A' : '#3457D5' });
    } else {
      const poly = L.polyline(linkCoords, {
        color: '#3457D5',
        weight: 2.5,
        dashArray: '6, 8',
        className: 'lora-rf-link',
        opacity: 0.85
      }).addTo(map);
      linkLineRef.current = poly;
    }

    // D. Danger Radius Circle
    if (circleRef.current) {
      circleRef.current.setLatLng([lat, lon]);
      circleRef.current.setStyle({
        color: color,
        fillColor: color,
        fillOpacity: isHigh ? 0.20 : (isMedium ? 0.12 : 0.05),
        radius: isHigh ? 450 : (isMedium ? 250 : 120),
        weight: 1.5
      });
    } else {
      const circle = L.circle([lat, lon], {
        color: color,
        fillColor: color,
        fillOpacity: 0.05,
        radius: 120,
        weight: 1.5
      }).addTo(map);
      circleRef.current = circle;
    }

    // E. Coverage Range Rings (250m, 800m, 2000m)
    coverageRingsRef.current.forEach((r) => map.removeLayer(r));
    coverageRingsRef.current = [];

    if (showRings) {
      const ring250 = L.circle([lat, lon], {
        color: '#6B7684',
        fill: false,
        weight: 1,
        dashArray: '4, 6',
        opacity: 0.4,
        radius: 250
      }).addTo(map);

      const ring800 = L.circle([lat, lon], {
        color: '#3457D5',
        fill: false,
        weight: 1,
        dashArray: '4, 6',
        opacity: 0.35,
        radius: 800
      }).addTo(map);

      coverageRingsRef.current = [ring250, ring800];
    }

  }, [lat, lon, riskLevel, telemetry, showRadar, showRings]);

  const handleCenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([(lat + gatewayLat) / 2, (lon + gatewayLon) / 2], 15, { animate: true });
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);
  };

  return (
    <div className={`bg-[#FFFFFF] border border-[#E3E7EC] rounded-[8px] overflow-hidden flex flex-col shadow-[0_1px_3px_rgba(16,24,32,0.04)] transition-all ${
      isFullscreen ? 'fixed inset-4 z-[2000] shadow-2xl' : 'h-full'
    }`}>
      
      {/* Map Control Toolbar */}
      <div className="px-3.5 py-2.5 border-b border-[#EDEFF2] flex flex-wrap items-center justify-between gap-2 bg-[#FFFFFF]">
        
        {/* Left: Node Info & RF Link Status */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-[4px] bg-[#3457D5]/10 flex items-center justify-center text-[#3457D5]">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#1A2126]">
              Live LoRa RF Vector Map
            </span>
            <span className="text-[10px] text-[#6B7684] ml-1.5 hidden sm:inline font-mono">
              Node &rarr; Base Station Link (520m LoS)
            </span>
          </div>
        </div>

        {/* Right: Layer Switcher & Toggles */}
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

          {/* Radar Sweep Toggle */}
          <button
            onClick={() => setShowRadar(!showRadar)}
            className={`p-1.5 rounded-[4px] border text-xs flex items-center gap-1 transition-all ${
              showRadar 
                ? 'bg-[#3457D5]/10 border-[#3457D5]/40 text-[#3457D5]' 
                : 'bg-[#FFFFFF] border-[#E3E7EC] text-[#6B7684]'
            }`}
            title="Toggle 360° Radar Scanner"
          >
            <Radar className="w-3.5 h-3.5" />
          </button>

          {/* Recenter Button */}
          <button
            onClick={handleCenter}
            className="p-1.5 bg-[#FFFFFF] border border-[#E3E7EC] hover:bg-[#F1F3F6] rounded-[4px] text-[#6B7684] hover:text-[#1A2126] transition-colors"
            title="Recenter link"
          >
            <Navigation className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 bg-[#FFFFFF] border border-[#E3E7EC] hover:bg-[#F1F3F6] rounded-[4px] text-[#6B7684] hover:text-[#1A2126] transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand Map'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

        </div>

      </div>

      {/* Map Canvas Viewport */}
      <div className="relative flex-1 min-h-[320px] w-full">
        <div ref={mapContainerRef} className="w-full h-full min-h-[320px]" />
        
        {/* Floating status tag */}
        <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-[6px] border border-[#E3E7EC] text-xs text-[#6B7684] flex items-center gap-2 shadow-sm">
          <span 
            className="w-2.5 h-2.5 rounded-full animate-pulse" 
            style={{ background: getSeverityColor(riskLevel) }} 
          />
          <span className="font-bold text-[#1A2126]">SKCET Edge Node</span>
          <span>&bull;</span>
          <span className="font-mono text-[#3457D5]">SX1278 (433MHz)</span>
          <span>&bull;</span>
          <span className="font-mono text-[#2E9E6B]">Link: -74 dBm</span>
        </div>

        {/* Legend Overlay on Bottom Right */}
        <div className="absolute bottom-3 right-3 z-[400] bg-white/95 backdrop-blur-md p-2 rounded-[6px] border border-[#E3E7EC] text-[10px] text-[#6B7684] space-y-1 shadow-sm hidden sm:block font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#2B7FD4]" />
            <span>Physical Sensor Node</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-[2px] bg-[#3457D5]" />
            <span>ESP32 Base Station Gateway</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-[#3457D5]" />
            <span>433MHz LoRa Line-of-Sight</span>
          </div>
        </div>

      </div>

    </div>
  );
}
