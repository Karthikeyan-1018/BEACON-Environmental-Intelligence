const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const OfflineQueue = require('./offlineQueue');
const SerialManager = require('./serialManager');
const SimulationEngine = require('./simulationEngine');

const app = express();
const server = http.createServer(app);

// Enable CORS for client
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Initialize subsystems
const offlineQueue = new OfflineQueue(io);
const serialManager = new SerialManager(io, offlineQueue);
const simulationEngine = new SimulationEngine(io);

// Start background engines
simulationEngine.start();

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Send initial states immediately
  socket.emit('live-telemetry', serialManager.getSnapshot());
  socket.emit('sim-telemetry-update', simulationEngine.getDashboardSnapshot());
  socket.emit('offline-queue-status', offlineQueue.getStatus());
  socket.emit('serial-status', serialManager.getStatus());

  // Client-initiated controls
  socket.on('client-toggle-offline', () => {
    const status = offlineQueue.toggleOnline();
    console.log(`[OfflineQueue] Toggled online state. Now: ${status.isOnline ? 'ONLINE' : 'OFFLINE'}`);
  });

  socket.on('client-serial-mock', (enabled) => {
    serialManager.setMockMode(enabled);
  });

  socket.on('client-inject-spike', (hazardType) => {
    serialManager.injectSpike(hazardType);
  });

  socket.on('client-sensor-change', ({ metric, value }) => {
    serialManager.setSensorValue(metric, value);
  });

  socket.on('client-trigger-scenario', (hazardType) => {
    simulationEngine.triggerHazardScenario(hazardType);
  });

  socket.on('client-reset-scenario', () => {
    simulationEngine.resetAllNodes();
  });

  socket.on('client-sim-speed', (multiplier) => {
    simulationEngine.setSpeed(multiplier);
  });

  socket.on('client-sim-pause', () => {
    simulationEngine.togglePause();
  });

  socket.on('client-sim-step', () => {
    simulationEngine.step();
  });

  socket.on('client-sim-cascade', (scenarioName) => {
    simulationEngine.triggerCascadeScenario(scenarioName);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// REST API Endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'BEACON Environmental Intelligence Hub',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime())
  });
});

// Serial Management APIs
app.get('/api/serial/ports', async (req, res) => {
  const ports = await serialManager.listPorts();
  res.json({ ports });
});

app.post('/api/serial/connect', async (req, res) => {
  const { port, baudRate } = req.body;
  const result = await serialManager.connect(port, baudRate || 115200);
  res.json(result);
});

app.post('/api/serial/disconnect', async (req, res) => {
  const result = await serialManager.disconnect();
  res.json(result);
});

app.post('/api/serial/mock', (req, res) => {
  const { enabled } = req.body;
  serialManager.setMockMode(enabled);
  res.json({ success: true, isMockMode: serialManager.isMockMode });
});

app.post('/api/serial/inject', (req, res) => {
  const { hazardType } = req.body;
  serialManager.injectSpike(hazardType);
  res.json({ success: true, injected: hazardType });
});

// Offline Queue APIs
app.post('/api/offline/toggle', (req, res) => {
  const status = offlineQueue.toggleOnline();
  res.json(status);
});

// Simulation APIs
app.get('/api/simulation/snapshot', (req, res) => {
  res.json(simulationEngine.getDashboardSnapshot());
});

app.post('/api/simulation/trigger', (req, res) => {
  const { hazardType } = req.body;
  const result = simulationEngine.triggerHazardScenario(hazardType);
  res.json(result);
});

app.post('/api/simulation/reset', (req, res) => {
  const result = simulationEngine.resetAllNodes();
  res.json(result);
});

// Live Node snapshot API
app.get('/api/live/snapshot', (req, res) => {
  res.json(serialManager.getSnapshot());
});

// ESP32 physical-node snapshot API (dedicated dashboard stream)
app.get('/api/esp32/snapshot', (req, res) => {
  res.json(serialManager.getEsp32Snapshot());
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  BEACON Environmental Intelligence Backend Running`);
  console.log(`  Port: http://localhost:${PORT}`);
  console.log(`  Socket.IO: Ready for real-time bidirectional telemetry`);
  console.log(`=======================================================`);
});
