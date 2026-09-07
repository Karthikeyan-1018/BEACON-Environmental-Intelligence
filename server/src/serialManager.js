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
      rssi: -74,        // dBm
      snr: 9.4,         // dB
      packet_id: 1042,
      freq: 433.175,    // MHz
      risk_level: 'low',
      confidence: 0.94,
      timestamp: new Date().toISOString()
    };

    // Sensor trend history for rolling charts (keep last 30 samples)
    this.history = [];
    this.initHistory();

    // Start mock generator initially
    this.startMockGenerator();

    // ---------------------------------------------------------------------------
    // ESP32 physical-node mirror (dedicated stream, independent of the virtual
    // node dashboards). Consumes the firmware's human-readable serial block:
    //   Temperature : 30.10 C
    //   Humidity    : 62.50 %
    //   Smoke       : 51
    //   Rain        : 4095
    //   Water       : 0
    //   Risk Type   : NORMAL | FLOOD | FIRE | COMBINED
    //   Risk Level  : NORMAL | WARNING | HIGH | CRITICAL
    //   STATUS : ALIVE  (printed every 30 seconds)
    // ---------------------------------------------------------------------------
    this.esp32 = {
      temp: 30.1,
      humidity: 62.5,
      smoke: 51,
      rain: 4095,
      water: 0,
      riskType: 'NORMAL',
      riskLevel: 'NORMAL',
      sequence: 0,
      lastUpdate: null,
      aliveAt: null
    };
    this.esp32BlockLines = [];
    this.esp32LastRealUpdate = 0;
    this.esp32NextAlive = 0;
    this.esp32Stats = { cycles: 0, alerts: 0, lastAlert: null, source: 'mock', levelRank: 0 };
    this.esp32LastAlertKey = null;
    this.startEsp32Mock();
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

      this.parser.on('data', (chunk) => {
        // Firmware may emit whole blocks at once; split into individual lines.
        String(chunk).split(/\r?\n/).forEach((l) => this.handleSerialLine(l));
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

  // ---------------------------------------------------------------------------
  // ESP32 physical-node stream: parses the firmware's human-readable serial
  // block (key : value per line) and mirrors it on a dedicated socket channel.
  // ---------------------------------------------------------------------------

  startEsp32Mock() {
    if (this.esp32MockTimer) clearInterval(this.esp32MockTimer);
    // Firmware samples sensors every 2 seconds.
    this.esp32MockTimer = setInterval(() => this.generateEsp32Mock(), 2000);
  }

  stopEsp32Mock() {
    if (this.esp32MockTimer) {
      clearInterval(this.esp32MockTimer);
      this.esp32MockTimer = null;
    }
  }

  generateEsp32Mock() {
    // Hardware takes priority: if a real ESP32 reading arrived recently, skip.
    if (Date.now() - this.esp32LastRealUpdate < 10000) return;

    const e = this.esp32;
    const roll = Math.random();

    // ~5% chance to enter a risk scenario, otherwise drift back to nominal.
    if (roll < 0.05) {
      const kind = roll < 0.02 ? 'fire' : (roll < 0.04 ? 'flood' : 'combined');
      if (kind === 'fire' || kind === 'combined') {
        e.smoke = Math.round(560 + Math.random() * 360);
        e.temp = +(46 + Math.random() * 6).toFixed(1);
      }
      if (kind === 'flood' || kind === 'combined') {
        e.rain = Math.round(300 + Math.random() * 900);
        e.water = Math.round(2100 + Math.random() * 1100);
      }
    } else {
      e.temp = Math.max(26, Math.min(36, +(e.temp + (Math.random() - 0.5) * 0.3).toFixed(1)));
      e.humidity = Math.max(45, Math.min(78, +(e.humidity + (Math.random() - 0.5) * 0.8).toFixed(1)));
      e.smoke = Math.max(40, Math.min(150, Math.round(e.smoke + (Math.random() - 0.5) * 6)));
      e.rain = Math.max(3200, Math.min(4095, Math.round(e.rain + (Math.random() - 0.5) * 40)));
      e.water = Math.max(0, Math.min(60, Math.round(e.water + (Math.random() - 0.5) * 12)));
    }

    e.riskType = this.classifyEsp32RiskType(e);
    e.riskLevel = this.classifyEsp32RiskLevel(e);
    e.sequence += 1;
    e.lastUpdate = new Date().toISOString();
    this.esp32Stats.source = 'mock';
    this.tallyEsp32Risk(e);

    const heartbeat = Date.now() >= this.esp32NextAlive;
    if (heartbeat) {
      e.aliveAt = new Date().toISOString();
      this.esp32NextAlive = Date.now() + 30000;
    }
    this.emitEsp32Telemetry({ heartbeat });
  }

  classifyEsp32RiskType(e) {
    // Mirror the on-node firmware logic: fire from smoke/temp, flood from water/rain.
    const fire = e.smoke >= 260 || e.temp >= 42;
    const flood = e.water >= 1600 || e.rain <= 1400;
    if (fire && flood) return 'COMBINED';
    if (fire) return 'FIRE';
    if (flood) return 'FLOOD';
    return 'NORMAL';
  }

  classifyEsp32RiskLevel(e) {
    const rank = (val, w, h, c) => (val >= c ? 3 : val >= h ? 2 : val >= w ? 1 : 0);
    const fire = Math.max(rank(e.temp, 42, 44, 47), rank(e.smoke, 260, 420, 700));
    // Rain sensor raw ADC is inverted: low reading = heavy precipitation.
    const flood = Math.max(rank(e.water, 1600, 2000, 2600), 3 - rank(e.rain, 1400, 900, 400));
    const worst = Math.max(fire, flood);
    if (worst >= 3) return 'CRITICAL';
    if (worst === 2) return 'HIGH';
    if (worst === 1) return 'WARNING';
    return 'NORMAL';
  }

  tallyEsp32Risk(e) {
    this.esp32Stats.cycles += 1;
    const rank = e.riskLevel === 'CRITICAL' ? 3 : e.riskLevel === 'HIGH' ? 2 : e.riskLevel === 'WARNING' ? 1 : 0;
    const prev = this.esp32Stats.levelRank || 0;
    if (rank > 0 && rank !== prev) {
      this.esp32Stats.alerts += 1;
      this.esp32Stats.lastAlert = new Date().toISOString();
    }
    this.esp32Stats.levelRank = rank;
  }

  formatEsp32Block(e) {
    return [
      '---------------------------------',
      'Temperature : ' + e.temp.toFixed(2) + ' C',
      'Humidity    : ' + e.humidity.toFixed(2) + ' %',
      'Smoke       : ' + e.smoke,
      'Rain        : ' + e.rain,
      'Water       : ' + e.water,
      '',
      'Risk Type   : ' + e.riskType,
      'Risk Level  : ' + e.riskLevel,
      '---------------------------------'
    ].join('\n');
  }

  emitEsp32Telemetry(extra = {}) {
    const payload = {
      data: { ...this.esp32 },
      stats: { ...this.esp32Stats },
      serialized: this.formatEsp32Block(this.esp32),
      heartbeat: !!extra.heartbeat,
      timestamp: new Date().toISOString()
    };
    if (this.io) {
      this.io.emit('esp32-telemetry', payload);
    }

    const { riskType, riskLevel } = payload.data;
    if (riskLevel && riskLevel !== 'NORMAL') {
      const alertKey = `${riskType}|${riskLevel}`;
      if (alertKey !== this.esp32LastAlertKey) {
        this.esp32LastAlertKey = alertKey;
        if (this.io) {
          this.io.emit('esp32-alert', {
            riskType,
            riskLevel,
            temp: payload.data.temp,
            humidity: payload.data.humidity,
            smoke: payload.data.smoke,
            rain: payload.data.rain,
            water: payload.data.water,
            message: `ESP32 Node — ${riskType} ${riskLevel}`,
            timestamp: payload.timestamp
          });
        }
      }
    } else {
      this.esp32LastAlertKey = null;
    }

    return payload;
  }

  emitEsp32Status() {
    if (this.io) {
      this.io.emit('esp32-status', {
        connected: this.isConnected,
        activePort: this.activePortPath,
        serialSupported: !!SerialPort
      });
    }
  }

  getEsp32Snapshot() {
    return {
      data: { ...this.esp32 },
      stats: { ...this.esp32Stats },
      status: this.getStatus(),
      serialized: this.formatEsp32Block(this.esp32)
    };
  }

  parseEsp32Line(line) {
    const m = line.match(/^([A-Za-z ]+?)\s*:\s*(.*)$/);
    if (!m) return;
    const key = m[1].trim().toLowerCase();
    const raw = m[2].trim().split(',')[0].trim();
    const e = this.esp32;
    switch (key) {
      case 'temperature': {
        const v = parseFloat(raw);
        if (!isNaN(v)) e.temp = +v.toFixed(2);
        break;
      }
      case 'humidity': {
        const v = parseFloat(raw);
        if (!isNaN(v)) e.humidity = +v.toFixed(2);
        break;
      }
      case 'smoke': {
        const v = parseInt(raw, 10);
        if (!isNaN(v)) e.smoke = v;
        break;
      }
      case 'rain': {
        const v = parseInt(raw, 10);
        if (!isNaN(v)) e.rain = v;
        break;
      }
      case 'water': {
        const v = parseInt(raw, 10);
        if (!isNaN(v)) e.water = v;
        break;
      }
      case 'risk type':
        e.riskType = raw.toUpperCase();
        break;
      case 'risk level':
        e.riskLevel = raw.toUpperCase();
        break;
      default:
        break;
    }
  }

  handleEsp32Text(line) {
    if (!line) return;
    const t = line.trim();
    if (!t) return;

    // STATUS : ALIVE heartbeat, printed by the firmware every 30 seconds.
    if (/^STATUS\s*:\s*ALIVE/i.test(t)) {
      this.esp32.aliveAt = new Date().toISOString();
      this.esp32NextAlive = Date.now() + 30000;
      this.emitEsp32Telemetry({ heartbeat: true });
      return;
    }

    this.esp32BlockLines.push(t);

    // A full reading block completes at the trailing "Risk Level" line.
    if (/^Risk Level\s*:/i.test(t)) {
      if (this.esp32BlockLines.length > 0) {
        this.esp32BlockLines.forEach((l) => this.parseEsp32Line(l));
        this.esp32BlockLines = [];
        const e = this.esp32;
        e.sequence += 1;
        e.lastUpdate = new Date().toISOString();
        e.aliveAt = e.aliveAt || new Date().toISOString();
        this.esp32LastRealUpdate = Date.now();
        this.esp32Stats.source = 'serial';
        this.tallyEsp32Risk(e);
        this.emitEsp32Telemetry({ heartbeat: false });
      }
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
    d.rssi = Math.max(-95, Math.min(-60, Math.round(d.rssi + (Math.random() - 0.5) * 2)));
    d.snr = +(d.snr + (Math.random() - 0.5) * 0.2).toFixed(1);
    d.packet_id += 1;
    d.freq = 433.175;

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
    } else if (hazardType === 'storm') {
      this.currentData.rainfall = 72.0;
      this.currentData.water_level = 65.0;
      this.currentData.risk_level = 'high';
      this.currentData.confidence = 0.96;
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
      // Not a JSON packet: treat as the ESP32 firmware's text block.
      this.handleEsp32Text(trimmed);
      return;
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
        rssi: Number(parsed.rssi !== undefined ? parsed.rssi : -74),
        snr: Number(parsed.snr !== undefined ? parsed.snr : 9.4),
        packet_id: Number(parsed.packet_id !== undefined ? parsed.packet_id : 1042),
        freq: Number(parsed.freq !== undefined ? parsed.freq : 433.175),
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
    this.emitEsp32Status();
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
