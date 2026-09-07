import React, { useState, useEffect } from 'react';
import socket from './socket';
import Header from './components/Header';
import LiveDashboard from './components/live/LiveDashboard';
import SimulatedDashboard from './components/simulated/SimulatedDashboard';
import Esp32NodeDashboard from './components/esp32/Esp32NodeDashboard';
import { WifiOff, BookOpen, X } from 'lucide-react';
import telemetryEngine from './telemetryEngine';
import audioAlert from './utils/audioAlert';

export default function App() {
  const [activeTab, setActiveTab] = useState('live');
  const [isConnected, setIsConnected] = useState(socket.connected);

  // Live Hardware Data State (initialized from autonomous engine)
  const initialSnapshot = telemetryEngine.getSnapshot();
  const [liveTelemetry, setLiveTelemetry] = useState(initialSnapshot.telemetry);
  const [hardwareState, setHardwareState] = useState(initialSnapshot.hardwareState);
  const [liveHistory, setLiveHistory] = useState(initialSnapshot.history);
  const [liveAlerts, setLiveAlerts] = useState(initialSnapshot.alerts);

  const [serialStatus, setSerialStatus] = useState({
    isConnected: false,
    activePort: null,
    isMockMode: true,
    serialSupported: true
  });

  const [queueStatus, setQueueStatus] = useState({
    isOnline: true,
    queuedCount: 0,
    isFlushing: false
  });

  // Regional Simulation Data State
  const [simData, setSimData] = useState({
    nodes: [],
    stats: {},
    alerts: []
  });

  // Server-pushed playback state (speed / pause / active cascade) so the bar
  // reflects backend-authorized control changes even across clients.
  const [simPlayback, setSimPlayback] = useState({ speed: 1, isPaused: false, activeCascade: null });

  const [showArchModal, setShowArchModal] = useState(false);

  // 1. Subscribe to autonomous client telemetry engine (ensures 100% active data stream)
  useEffect(() => {
    const unsubscribe = telemetryEngine.subscribe((snapshot) => {
      setLiveTelemetry(snapshot.telemetry);
      setHardwareState(snapshot.hardwareState);
      setLiveHistory(snapshot.history);
      setLiveAlerts(snapshot.alerts);
      if (snapshot.queueStatus) setQueueStatus(snapshot.queueStatus);

      // Trigger audio warnings if alarm is unmuted
      if (snapshot.telemetry.risk_level === 'high') {
        audioAlert.playCriticalAlarm();
      } else if (snapshot.telemetry.risk_level === 'medium') {
        audioAlert.playWarningChime();
      }
    });

    return unsubscribe;
  }, []);

  // 2. Connect to backend Socket.IO for physical serial and regional simulation sync
  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
      telemetryEngine.setRemoteDisconnected();
    }

    function onLiveTelemetry(payload) {
      if (!payload) return;
      telemetryEngine.syncRemotePacket(payload);
      if (payload.serialStatus) setSerialStatus(payload.serialStatus);
      if (payload.queueStatus) setQueueStatus(payload.queueStatus);
    }

    function onSimTelemetry(data) {
      if (data) setSimData(data);
    }

    function onPlaybackStatus(status) {
      if (!status) return;
      setSimPlayback({
        speed: status.speed !== undefined ? status.speed : simPlayback.speed,
        isPaused: status.isPaused !== undefined ? status.isPaused : simPlayback.isPaused,
        activeCascade: status.activeCascade || null
      });
    }

    function onSerialStatus(status) {
      if (status) setSerialStatus(status);
    }

    function onQueueStatus(status) {
      if (status) setQueueStatus(status);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('live-telemetry', onLiveTelemetry);
    socket.on('sim-telemetry-update', onSimTelemetry);
    socket.on('sim-playback-status', onPlaybackStatus);
    socket.on('serial-status', onSerialStatus);
    socket.on('offline-queue-status', onQueueStatus);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('live-telemetry', onLiveTelemetry);
      socket.off('sim-telemetry-update', onSimTelemetry);
      socket.off('sim-playback-status', onPlaybackStatus);
      socket.off('serial-status', onSerialStatus);
      socket.off('offline-queue-status', onQueueStatus);
    };
  }, []);

  // Interactive controls
  const handleSensorChange = (metric, value) => {
    telemetryEngine.setSensorValue(metric, value);
    socket.emit('client-sensor-change', { metric, value });
  };

  const handleInjectSpike = (hazardType) => {
    telemetryEngine.injectSpike(hazardType);
    socket.emit('client-inject-spike', hazardType);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#1A2126] flex flex-col font-sans">
      
      {/* Operations Console Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isConnected={isConnected}
      />

      {/* Disconnection Warning Bar */}
      {!isConnected && (
        <div className="bg-[#D48806]/10 border-b border-[#D48806]/30 px-4 py-1.5 text-[#D48806] text-xs font-medium flex items-center justify-center gap-2">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Backend link disconnected &mdash; Autonomous client telemetry engine active (100% interactive).</span>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto p-3 sm:p-4">
        {activeTab === 'live' ? (
          <LiveDashboard
            telemetry={liveTelemetry}
            serialStatus={serialStatus}
            hardwareState={hardwareState}
            history={liveHistory}
            alerts={liveAlerts}
            queueStatus={queueStatus}
            onSensorChange={handleSensorChange}
            onInjectSpike={handleInjectSpike}
          />
        ) : activeTab === 'esp32' ? (
          <Esp32NodeDashboard />
        ) : (
          <SimulatedDashboard simData={simData} playback={simPlayback} />
        )}
      </main>

      {/* Operations Console Footer */}
      <footer className="bg-[#FFFFFF] border-t border-[#E3E7EC] py-2.5 px-4 text-[#6B7684] text-xs mt-auto">
        <div className="max-w-[1720px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-[#1A2126] font-medium">Beacon v1.0</span>
            <span>SIH26178 / Qualcomm environmental disaster network</span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <button
              onClick={() => setShowArchModal(true)}
              className="flex items-center gap-1 text-[#3457D5] hover:underline font-medium transition-colors"
            >
              <BookOpen className="w-3 h-3" />
              <span>System architecture spec</span>
            </button>
            <span className="text-[#E3E7EC]">/</span>
            <span>Edge node: ESP32 + SX1278 LoRa (433MHz)</span>
          </div>
        </div>
      </footer>

      {/* Architecture Spec Modal */}
      {showArchModal && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-[#FFFFFF] border border-[#E3E7EC] rounded-[4px] shadow-[0_4px_20px_rgba(16,24,32,0.12)] w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-4 py-3 border-b border-[#E3E7EC] flex items-center justify-between">
              <span className="text-sm font-semibold text-[#1A2126]">
                Beacon system architecture (SIH26178)
              </span>
              <button
                onClick={() => setShowArchModal(false)}
                className="p-1 rounded-[3px] text-[#6B7684] hover:text-[#1A2126] hover:bg-[#F1F3F6]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3.5 text-xs text-[#6B7684]">
              
              {/* Pipeline 1 */}
              <div className="bg-[#F7F8FA] p-3.5 rounded-[3px] border border-[#E3E7EC]">
                <h4 className="text-xs font-semibold text-[#1A2126] mb-1.5">
                  Pipeline 1: BEACON virtual edge node (test dashboard)
                </h4>
                <div className="text-[11px] text-[#1A2126] bg-[#FFFFFF] p-2.5 rounded-[3px] border border-[#E3E7EC] leading-relaxed font-mono">
                  Edge node (DHT22, MQ-2, water level, rain) <br />
                  &nbsp;&nbsp;→ LoRa SX1278 433MHz telemetry packet <br />
                  &nbsp;&nbsp;→ ESP32 base station (buzzer and status LED) <br />
                  &nbsp;&nbsp;→ USB serial (115200 baud JSON stream) <br />
                  &nbsp;&nbsp;→ Node.js backend (serialport ingestion) <br />
                  &nbsp;&nbsp;→ WebSocket (Socket.IO) <br />
                  &nbsp;&nbsp;→ Operations console dashboard
                </div>
              </div>

              {/* Pipeline 2 */}
              <div className="bg-[#F7F8FA] p-3.5 rounded-[3px] border border-[#E3E7EC]">
                <h4 className="text-xs font-semibold text-[#1A2126] mb-1.5">
                  Pipeline 2: regional multi-hazard network (simulated dashboard)
                </h4>
                <div className="text-[11px] text-[#1A2126] bg-[#FFFFFF] p-2.5 rounded-[3px] border border-[#E3E7EC] leading-relaxed font-mono">
                  21 virtual nodes across 7 hazard classes in Western Ghats corridor <br />
                  &nbsp;&nbsp;→ Evolving Markov state engine (normal, brewing, peak, recovery) <br />
                  &nbsp;&nbsp;→ Telemetry simulation & threshold verification <br />
                  &nbsp;&nbsp;→ Socket.IO push every 3.5s <br />
                  &nbsp;&nbsp;→ Geospatial risk grid and prioritized dispatch routing
                </div>
              </div>

              {/* Decision Rules */}
              <div className="bg-[#F7F8FA] p-3.5 rounded-[3px] border border-[#E3E7EC]">
                <h4 className="text-xs font-semibold text-[#1A2126] mb-1.5">
                  Prioritized warning level routing
                </h4>
                <ul className="space-y-1 list-disc list-inside text-[#6B7684]">
                  <li><strong className="text-[#1A2126]">High severity and confidence &ge; 0.85:</strong> Dual dispatch to NDRF / SDMA authority and citizen emergency alert.</li>
                  <li><strong className="text-[#1A2126]">Medium severity and confidence &ge; 0.75:</strong> Citizen advisory broadcast (mobile app and SMS).</li>
                  <li><strong className="text-[#1A2126]">Medium severity and confidence &lt; 0.75:</strong> District disaster control room tactical watchlist.</li>
                  <li><strong className="text-[#1A2126]">Low severity:</strong> Automated routine edge telemetry logging.</li>
                </ul>
              </div>

            </div>

            <div className="px-4 py-2.5 border-t border-[#E3E7EC] flex justify-end bg-[#FFFFFF]">
              <button
                onClick={() => setShowArchModal(false)}
                className="console-btn"
              >
                Close spec
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
