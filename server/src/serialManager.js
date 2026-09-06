let SerialPort;
let ReadlineParser;

try {
  const serialModule = require('serialport');
  SerialPort = serialModule.SerialPort;
  ReadlineParser = require('@serialport/parser-readline').ReadlineParser;
} catch (e) {
  // Graceful fallback if native serialport is not compiled or installed
  SerialPort = null;
  ReadlineParser = null;
}

class SerialManager {
  constructor(io, offlineQueue) {
    this.io = io;
    this.offlineQueue = offlineQueue;
    this.port = null;
    this.parser = null;
    this.isConnected = false;
    this.activePortPath = null;
    this.isMockMode = true; // Defaults to mock mode so UI works 100% out of the box
    this.mockTimer = null;
    this.alerts = [];

    // Hardware mirror state
    this.hardwareState = {
      buzzer: false,
      led: 'GREEN', // GREEN | YELLOW | RED
      lastTrigger: null
    };

    // Baseline values for the SKCET physical node (DHT22, MQ-2, Water Level, Rainfall)
    this.currentData = {
      node_id: 'N1-SKCET',
      location: 'SKCET Campus, Coimbatore',
      lat: 10.9366,
      lon: 76.9558,
      water_level: 22.4, // cm
      temp: 29.8,       // °C
      humidity: 64.0,   // %
      smoke: 110,       // ppm (MQ-2)
      rainfall: 3.5,    // mm/h
      risk_level: 'low',
      confidence: 0.94,
      timestamp: new Date().toISOString()
    };

    // Sensor trend history for rolling charts (keep last 30 samples)
    this.history = [];
    this.initHistory();

    // Start mock generator initially
    this.startMockGenerator();
  }

  initHistory() {
    const now = Date.now();
    for (let i = 29; i >= 0; i--) {
      this.history.push({
        timestamp: new Date(now - i * 3000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        water_level: +(22 + (Math.random() - 0.5) * 3).toFixed(1),
        temp: +(29.5 + (Math.random() - 0.5) * 1.5).toFixed(1),
        humidity: +(64 + (Math.random() - 0.5) * 4).toFixed(1),
        smoke: Math.round(110 + (Math.random() - 0.5) * 20),
        rainfall: +(3.2 + (Math.random() - 0.5) * 1.5).toFixed(1)
      });
    }
  }

  async listPorts() {
    if (!SerialPort) {
      return [
        { path: 'COM3 (Simulated ESP32)', manufacturer: 'Silicon Labs / CP210x', friendlyName: 'ESP32 LoRa Base Station (Simulated)' },
        { path: 'COM4 (Simulated CH340)', manufacturer: 'WCH.CN', friendlyName: 'USB-Serial CH340' }
      ];
    }
    try {
      const ports = await SerialPort.list();
      return ports.map(p => ({
        path: p.path,
        manufacturer: p.manufacturer || 'Generic USB Serial',
        friendlyName: p.friendlyName || p.path
      }));
    } catch (err) {
      console.error('Error listing serial ports:', err);
      return [];
    }
  }

  async connect(portPath, baudRate = 115200) {
    if (this.isMockMode) {
      this.stopMockGenerator();
      this.isMockMode = false;
    }

    if (this.port && this.port.isOpen) {
      await this.disconnect();
    }

    if (!SerialPort) {
      console.warn('serialport package not available, remaining in mock mode');
      this.isMockMode = true;
      this.startMockGenerator();
      this.emitStatus();
      return { success: false, message: 'Native serialport not available on this platform' };
    }

    try {
      this.port = new SerialPort({
        path: portPath,
        baudRate: Number(baudRate),
        autoOpen: true
      });

      this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
      this.activePortPath = portPath;
      this.isConnected = true;

      this.port.on('open', () => {
        console.log(`Serial Port ${portPath} opened at ${baudRate} baud`);
        this.emitStatus();
      });

      this.parser.on('data', (line) => {
        this.handleSerialLine(line);
      });

      this.port.on('error', (err) => {
        console.error('Serial port error:', err);
        this.isConnected = false;
        this.emitStatus();
      });

      this.port.on('close', () => {
        console.log(`Serial Port ${portPath} closed`);
        this.isConnected = false;
        this.activePortPath = null;
        this.emitStatus();
      });

      return { success: true, message: `Connected to ${portPath}` };
    } catch (err) {
      console.error('Failed to open serial port:', err);
      this.isConnected = false;
      this.emitStatus();
      return { success: false, message: err.message };
    }
  }

  async disconnect() {
    if (this.port && this.port.isOpen) {
      return new Promise((resolve) => {
        this.port.close(() => {
          this.isConnected = false;
          this.activePortPath = null;
          this.emitStatus();
          resolve({ success: true, message: 'Disconnected' });
        });
      });
    }
    this.isConnected = false;
    this.activePortPath = null;
    this.emitStatus();
    return { success: true, message: 'Already disconnected' };
  }

  setMockMode(enable) {
    this.isMockMode = !!enable;
    if (this.isMockMode) {
      if (this.port && this.port.isOpen) {
        this.disconnect();
      }
      this.startMockGenerator();
    } else {
      this.stopMockGenerator();
    }
    this.emitStatus();
  }

  startMockGenerator() {
    if (this.mockTimer) clearInterval(this.mockTimer);
    this.mockTimer = setInterval(() => {
      this.generateMockPacket();
    }, 2000);
  }

  stopMockGenerator() {
    if (this.mockTimer) {
      clearInterval(this.mockTimer);
      this.mockTimer = null;
    }
  }

  generateMockPacket() {
    // Evolving simulation for SKCET single node:
    // Water level: normal 15-30cm, warning > 50cm, critical > 80cm
    // Temp: normal 26-34°C, warning > 40°C, critical > 48°C
    // Humidity: 50-80%
    // Smoke: 80-160 ppm, warning > 400 ppm, critical > 750 ppm
    // Rainfall: 0-10 mm/h, warning > 30 mm/h, critical > 60 mm/h

    const d = this.currentData;
    d.temp = +(d.temp + (Math.random() - 0.5) * 0.4).toFixed(1);
    d.humidity = Math.max(30, Math.min(95, +(d.humidity + (Math.random() - 0.5) * 0.8).toFixed(1)));
    d.smoke = Math.max(50, Math.round(d.smoke + (Math.random() - 0.5) * 6));
    d.rainfall = Math.max(0, +(d.rainfall + (Math.random() - 0.48) * 0.5).toFixed(1));
    d.water_level = Math.max(5, +(d.water_level + (Math.random() - 0.48) * 0.6).toFixed(1));

    // Calculate risk
    let risk = 'low';
    let conf = 0.94;

    if (d.water_level > 75 || d.smoke > 600 || d.rainfall > 50 || d.temp > 48) {
      risk = 'high';
      conf = 0.96;
    } else if (d.water_level > 45 || d.smoke > 350 || d.rainfall > 25 || d.temp > 40) {
      risk = 'medium';
      conf = 0.88;
    }

    d.risk_level = risk;
    d.confidence = conf;
    d.timestamp = new Date().toISOString();

    this.processPacket(d);
  }

  injectSpike(hazardType) {
    if (hazardType === 'flood') {
      this.currentData.water_level = 88.5;
      this.currentData.rainfall = 56.0;
      this.currentData.risk_level = 'high';
      this.currentData.confidence = 0.97;
    } else if (hazardType === 'fire') {
      this.currentData.smoke = 780;
      this.currentData.temp = 51.4;
      this.currentData.risk_level = 'high';
      this.currentData.confidence = 0.98;
    } else if (hazardType === 'nominal') {
      this.currentData.water_level = 21.0;
      this.currentData.rainfall = 2.0;
      this.currentData.smoke = 105;
      this.currentData.temp = 29.5;
      this.currentData.humidity = 65.0;
      this.currentData.risk_level = 'low';
      this.currentData.confidence = 0.95;
    }
    this.currentData.timestamp = new Date().toISOString();
    this.processPacket(this.currentData);
  }

  setSensorValue(metric, value) {
    const num = Number(value);
    if (!isNaN(num)) {
      this.currentData[metric] = num;
      this.currentData.timestamp = new Date().toISOString();
      this.processPacket(this.currentData);
    }
  }

  handleSerialLine(line) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
      return; // Not a JSON packet
    }

    try {
      const parsed = JSON.parse(trimmed);
      const packet = {
        node_id: parsed.node_id || 'N1-SKCET',
        location: parsed.location || 'SKCET Campus, Coimbatore',
        lat: parsed.lat || 10.9366,
        lon: parsed.lon || 76.9558,
        water_level: Number(parsed.water_level || 0),
        temp: Number(parsed.temp || 0),
        humidity: Number(parsed.humidity || 0),
        smoke: Number(parsed.smoke || 0),
        rainfall: Number(parsed.rainfall || 0),
        risk_level: parsed.risk_level || 'low',
        confidence: Number(parsed.confidence || 0.9),
        timestamp: parsed.timestamp || new Date().toISOString()
      };
      this.processPacket(packet);
    } catch (e) {
      console.warn('Failed to parse serial JSON:', line);
    }
  }

  processPacket(packet) {
    this.currentData = { ...packet };

    // Update Hardware Mirror (Buzzer & LED)
    if (packet.risk_level === 'high') {
      this.hardwareState.buzzer = true;
      this.hardwareState.led = 'RED';
      this.hardwareState.lastTrigger = new Date().toISOString();
    } else if (packet.risk_level === 'medium') {
      this.hardwareState.buzzer = false;
      this.hardwareState.led = 'YELLOW';
    } else {
      this.hardwareState.buzzer = false;
      this.hardwareState.led = 'GREEN';
    }

    // Add to rolling history
    const timeLabel = new Date(packet.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.history.push({
      timestamp: timeLabel,
      water_level: packet.water_level,
      temp: packet.temp,
      humidity: packet.humidity,
      smoke: packet.smoke,
      rainfall: packet.rainfall
    });
    if (this.history.length > 30) this.history.shift();

    // Check alert log
    if (packet.risk_level !== 'low') {
      const lastAlert = this.alerts[0];
      const isRecent = lastAlert && (Date.now() - new Date(lastAlert.timestamp).getTime()) < 12000;
      if (!isRecent || lastAlert.severity !== packet.risk_level) {
        const newAlert = {
          id: 'LIVE-ALT-' + Date.now().toString(36),
          node_id: packet.node_id,
          location: packet.location,
          severity: packet.risk_level,
          confidence: packet.confidence,
          trigger_cause: packet.water_level > 50 ? 'Excessive River / Drainage Surge' : (packet.smoke > 400 ? 'Dense Smoke / Thermal Anomaly Detected' : 'Rainfall Runoff Threshold Exceeded'),
          metrics: {
            water_level: `${packet.water_level} cm`,
            temp: `${packet.temp} °C`,
            smoke: `${packet.smoke} PPM`,
            rainfall: `${packet.rainfall} mm/h`
          },
          recipient: packet.risk_level === 'high' ? 'Disaster Authority (NDRF) + Campus Safety Siren' : 'Campus Environmental Watchlist',
          timestamp: new Date().toISOString()
        };
        this.alerts.unshift(newAlert);
        if (this.alerts.length > 40) this.alerts.pop();
      }
    }

    // Pass through offline queue manager
    const queueStatus = this.offlineQueue ? this.offlineQueue.handleIncomingTelemetry(packet) : { isOnline: true, queuedCount: 0 };

    // Emit live packet to all frontend WebSocket clients
    if (this.io) {
      this.io.emit('live-telemetry', {
        telemetry: packet,
        hardwareState: this.hardwareState,
        history: this.history,
        alerts: this.alerts.slice(0, 15),
        queueStatus: queueStatus,
        serialStatus: this.getStatus()
      });
    }
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      activePort: this.activePortPath,
      isMockMode: this.isMockMode,
      serialSupported: !!SerialPort
    };
  }

  emitStatus() {
    if (this.io) {
      this.io.emit('serial-status', this.getStatus());
    }
  }

  getSnapshot() {
    return {
      telemetry: this.currentData,
      hardwareState: this.hardwareState,
      history: this.history,
      alerts: this.alerts,
      serialStatus: this.getStatus(),
      queueStatus: this.offlineQueue ? this.offlineQueue.getStatus() : { isOnline: true, queuedCount: 0 }
    };
  }
}

module.exports = SerialManager;
