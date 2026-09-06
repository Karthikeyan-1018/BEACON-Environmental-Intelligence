import React, { useState, useEffect } from 'react';
import { Usb, RefreshCw, Play, Square } from 'lucide-react';
import socket from '../../socket';

export default function SerialControlBar({ serialStatus, onInjectSpike }) {
  const [ports, setPorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState('');
  const [baudRate, setBaudRate] = useState('115200');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeSpike, setActiveSpike] = useState('nominal'); // 'flood' | 'fire' | 'nominal'

  const fetchPorts = async () => {
    try {
      const res = await fetch('http://localhost:5001/api/serial/ports');
      const data = await res.json();
      setPorts(data.ports || []);
      if (data.ports && data.ports.length > 0 && !selectedPort) {
        setSelectedPort(data.ports[0].path);
      }
    } catch (e) {
      console.warn('Could not fetch serial ports:', e);
    }
  };

  useEffect(() => {
    fetchPorts();
  }, []);

  const handleConnect = async () => {
    if (!selectedPort) return;
    setIsLoading(true);
    setMessage('');
    try {
      const res = await fetch('http://localhost:5001/api/serial/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: selectedPort, baudRate })
      });
      const data = await res.json();
      setMessage(data.message || (data.success ? 'Connected' : 'Connection failed'));
    } catch (e) {
      setMessage('Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await fetch('http://localhost:5001/api/serial/disconnect', { method: 'POST' });
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMock = (enable) => {
    socket.emit('client-serial-mock', enable);
  };

  const handleSpike = (type) => {
    setActiveSpike(type);
    if (onInjectSpike) onInjectSpike(type);
  };

  const isConnected = serialStatus?.isConnected;
  const isMock = serialStatus?.isMockMode;

  return (
    <div className="console-panel p-3">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
        
        {/* Left: Pipeline State & COM Connection */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-[3px] bg-[#F7F8FA] border border-[#E3E7EC] text-[#6B7684]">
              <Usb className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6B7684]">
                Hardware serial:
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-[3px] border font-medium ${
                  isConnected
                    ? 'badge-risk-low'
                    : isMock
                      ? 'bg-[#3457D5]/10 text-[#3457D5] border-[#3457D5]/30'
                      : 'badge-neutral'
                }`}
              >
                {isConnected
                  ? `Connected (${serialStatus.activePort} at 115200 baud)`
                  : isMock
                    ? 'Mock serial active'
                    : 'Disconnected'}
              </span>
            </div>
          </div>

          {/* Port Selector & Action */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedPort}
              onChange={(e) => setSelectedPort(e.target.value)}
              className="bg-[#FFFFFF] border border-[#E3E7EC] text-[#1A2126] text-xs rounded-[4px] px-2.5 py-1.5 focus:outline-none focus:border-[#3457D5] cursor-pointer"
            >
              {ports.length === 0 ? (
                <option value="">No serial ports detected</option>
              ) : (
                ports.map((p) => (
                  <option key={p.path} value={p.path}>
                    {p.path} ({p.manufacturer || 'Serial'})
                  </option>
                ))
              )}
            </select>

            <button
              onClick={fetchPorts}
              title="Rescan serial ports"
              className="console-btn p-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {isConnected ? (
              <button
                onClick={handleDisconnect}
                disabled={isLoading}
                className="console-btn-test"
              >
                <Square className="w-3 h-3" />
                <span>Disconnect</span>
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isLoading || !selectedPort}
                className="console-btn-primary disabled:opacity-50"
              >
                <Play className="w-3 h-3" />
                <span>Connect</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: Mock Mode Toggle & Distinct Styled Spike Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2 xl:pt-0 border-t xl:border-t-0 border-[#EDEFF2]">
          
          {/* Test / Mock Mode Switch */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#6B7684]">Test mode:</span>
            <button
              onClick={() => handleToggleMock(!isMock)}
              className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors cursor-pointer ${
                isMock ? 'bg-[#3457D5]' : 'bg-[#E3E7EC]'
              }`}
            >
              <span
                className={`inline-block h-2.5 w-2.5 transform rounded-full bg-[#FFFFFF] shadow-sm transition-transform ${
                  isMock ? 'translate-x-3.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Quick Simulation Spike Buttons */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[#6B7684] mr-0.5">Simulate:</span>
            <button
              onClick={() => handleSpike('flood')}
              className={`console-btn ${activeSpike === 'flood' ? 'console-btn-active' : ''}`}
            >
              Flood surge
            </button>
            <button
              onClick={() => handleSpike('fire')}
              className={`console-btn ${activeSpike === 'fire' ? 'console-btn-active' : ''}`}
            >
              Fire smoke
            </button>
            <button
              onClick={() => handleSpike('nominal')}
              className={`console-btn ${activeSpike === 'nominal' ? 'console-btn-active' : ''}`}
            >
              Calm
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
