const { REGIONAL_NODES, HAZARD_TYPES, HAZARD_METADATA } = require('./regionalData');

class SimulationEngine {
  constructor(io) {
    this.io = io;
    this.nodes = new Map();
    this.alerts = [];
    this.timer = null;
    this.baseIntervalMs = 4500; // Calmer 4.5s base interval (readable operations cadence)
    this.speed = 1; // 0.5 | 1 | 2
    this.isPaused = false;
    this.cascadeStep = 0;
    this.activeCascade = null;
    this.initializeNodes();
  }

  setSpeed(multiplier) {
    const requestedSpeed = Number(multiplier);
    // The UI exposes these three cadences. Reject arbitrary socket values so a
    // client cannot accidentally restart the simulation at an excessive rate.
    this.speed = [0.5, 1, 2].includes(requestedSpeed) ? requestedSpeed : 1;
    if (this.timer) {
      this.start();
    }
    this.emitStatus();
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    this.emitStatus();
    return this.isPaused;
  }

  step() {
    this.tick();
  }

  start() {
    if (this.timer) clearInterval(this.timer);
    const interval = Math.max(1000, Math.round(this.baseIntervalMs / this.speed));
    this.timer = setInterval(() => {
      if (!this.isPaused) {
        this.tick();
      }
    }, interval);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  initializeNodes() {
    REGIONAL_NODES.forEach((node) => {
      const meta = HAZARD_METADATA[node.hazard_type];
      const initialPrimary = this.randomBetween(meta.normal[meta.primaryKey][0], meta.normal[meta.primaryKey][1]);
      const initialSecondary = this.randomBetween(meta.normal[meta.secondaryKey][0], meta.normal[meta.secondaryKey][1]);

      const initialHistory = [];
      const now = Date.now();
      for (let i = 14; i >= 0; i--) {
        initialHistory.push({
          timestamp: new Date(now - i * this.baseIntervalMs).toISOString(),
          primary: +(initialPrimary + (Math.random() - 0.5) * 2).toFixed(1),
          secondary: +(initialSecondary + (Math.random() - 0.5) * 1.5).toFixed(1)
        });
      }

      this.nodes.set(node.node_id, {
        ...node,
        state: 'NORMAL', // NORMAL | BREWING | CRITICAL | RECOVERING
        cyclesInState: 0,
        currentValues: {
          [meta.primaryKey]: +initialPrimary.toFixed(1),
          [meta.secondaryKey]: +initialSecondary.toFixed(1)
        },
        risk_level: 'low',
        confidence_score: +(0.85 + Math.random() * 0.12).toFixed(2),
        last_updated: new Date().toISOString(),
        history: initialHistory
      });
    });

    // Make one node initially in slight brewing state for immediate visual interest
    const initialBrewNode = this.nodes.get('REG-FL-02');
    if (initialBrewNode) {
      initialBrewNode.state = 'BREWING';
      initialBrewNode.cyclesInState = 2;
    }
  }

  randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  tick() {
    this.nodes.forEach((node) => {
      const meta = HAZARD_METADATA[node.hazard_type];
      node.cyclesInState++;

      // Evolving state machine transitions
      if (node.state === 'NORMAL') {
        // Small random chance of drifting into brewing event
        if (Math.random() < 0.05) {
          node.state = 'BREWING';
          node.cyclesInState = 0;
        }
      } else if (node.state === 'BREWING') {
        if (node.cyclesInState >= 4) {
          node.state = 'CRITICAL';
          node.cyclesInState = 0;
        }
      } else if (node.state === 'CRITICAL') {
        if (node.cyclesInState >= 5) {
          node.state = 'RECOVERING';
          node.cyclesInState = 0;
        }
      } else if (node.state === 'RECOVERING') {
        if (node.cyclesInState >= 4) {
          node.state = 'NORMAL';
          node.cyclesInState = 0;
        }
      }

      // Compute evolved values based on state
      let pVal = node.currentValues[meta.primaryKey];
      let sVal = node.currentValues[meta.secondaryKey];

      const pNormalRange = meta.normal[meta.primaryKey];
      const sNormalRange = meta.normal[meta.secondaryKey];

      switch (node.state) {
        case 'NORMAL':
          // Subtle natural drift
          pVal += (Math.random() - 0.5) * (pNormalRange[1] - pNormalRange[0]) * 0.15;
          sVal += (Math.random() - 0.5) * (sNormalRange[1] - sNormalRange[0]) * 0.15;
          // Clamp to normal bounds
          pVal = Math.max(pNormalRange[0], Math.min(pNormalRange[1], pVal));
          sVal = Math.max(sNormalRange[0], Math.min(sNormalRange[1], sVal));
          break;

        case 'BREWING':
          // Rising trend towards warning
          pVal += (meta.warning[meta.primaryKey] - pNormalRange[1]) * 0.28 + (Math.random() * 1.5);
          sVal += (meta.warning[meta.secondaryKey] - sNormalRange[1]) * 0.28 + (Math.random() * 1.0);
          break;

        case 'CRITICAL':
          // Spike well into critical threshold
          pVal = meta.critical[meta.primaryKey] + (Math.random() * 15);
          sVal = meta.critical[meta.secondaryKey] + (Math.random() * 8);
          break;

        case 'RECOVERING':
          // Decreasing trend back towards normal
          pVal -= (pVal - pNormalRange[1]) * 0.35;
          sVal -= (sVal - sNormalRange[1]) * 0.35;
          break;
      }

      // Assess Risk Level
      let riskLevel = 'low';
      let confidence = +(0.88 + Math.random() * 0.10).toFixed(2);

      if (pVal >= meta.critical[meta.primaryKey] || sVal >= meta.critical[meta.secondaryKey]) {
        riskLevel = 'high';
        confidence = +(0.92 + Math.random() * 0.07).toFixed(2);
      } else if (pVal >= meta.warning[meta.primaryKey] || sVal >= meta.warning[meta.secondaryKey]) {
        riskLevel = 'medium';
        confidence = +(0.80 + Math.random() * 0.12).toFixed(2);
      }

      node.currentValues[meta.primaryKey] = +pVal.toFixed(1);
      node.currentValues[meta.secondaryKey] = +sVal.toFixed(1);
      node.risk_level = riskLevel;
      node.confidence_score = Math.min(1.0, confidence);
      node.last_updated = new Date().toISOString();

      // Append history (keep 15 points)
      node.history.push({
        timestamp: node.last_updated,
        primary: node.currentValues[meta.primaryKey],
        secondary: node.currentValues[meta.secondaryKey]
      });
      if (node.history.length > 20) {
        node.history.shift();
      }

      // Check for alerts to raise
      if (riskLevel === 'high' || riskLevel === 'medium') {
        this.evaluateAndPushAlert(node, meta);
      }

    });

    const payload = this.getDashboardSnapshot();
    if (this.io) {
      this.io.emit('sim-telemetry-update', payload);
    }
  }

  evaluateAndPushAlert(node, meta) {
    const lastAlert = this.alerts.find((alert) => alert.node_id === node.node_id);
    const isDuplicate = lastAlert && lastAlert.node_id === node.node_id && (Date.now() - new Date(lastAlert.timestamp).getTime()) < 15000;

    if (!isDuplicate) {
      let recipient = 'Disaster Authority Watchlist';
      if (node.risk_level === 'high' && node.confidence_score >= 0.85) {
        recipient = 'Authority & Citizen (Dual Dispatch)';
      } else if (node.risk_level === 'medium' && node.confidence_score >= 0.75) {
        recipient = 'Citizen Advisory Broadcast';
      }

      const alertItem = {
        id: 'ALT-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 4),
        node_id: node.node_id,
        node_name: node.name,
        zone: node.zone,
        hazard_type: node.hazard_type,
        hazard_label: meta.label,
        severity: node.risk_level, // 'medium' or 'high'
        confidence: node.confidence_score,
        primary_value: `${node.currentValues[meta.primaryKey]} ${meta.primaryUnit}`,
        secondary_value: `${node.currentValues[meta.secondaryKey]} ${meta.secondaryUnit}`,
        recipient: recipient,
        timestamp: new Date().toISOString()
      };

      this.alerts.unshift(alertItem);
      if (this.alerts.length > 50) this.alerts.pop();

      if (this.io) {
        this.io.emit('sim-new-alert', alertItem);
      }
    }
  }

  triggerHazardScenario(hazardType) {
    const targetNodes = Array.from(this.nodes.values()).filter(n => n.hazard_type === hazardType);
    if (targetNodes.length > 0) {
      targetNodes.forEach((node, idx) => {
        node.state = idx === 0 ? 'CRITICAL' : 'BREWING';
        node.cyclesInState = 2;
      });
      this.tick();
      return { success: true, affected: targetNodes.length };
    }
    return { success: false, message: 'Hazard type not found' };
  }

  resetAllNodes() {
    this.nodes.forEach((node) => {
      node.state = 'NORMAL';
      node.cyclesInState = 0;
      const meta = HAZARD_METADATA[node.hazard_type];
      node.currentValues[meta.primaryKey] = +this.randomBetween(meta.normal[meta.primaryKey][0], meta.normal[meta.primaryKey][1]).toFixed(1);
      node.currentValues[meta.secondaryKey] = +this.randomBetween(meta.normal[meta.secondaryKey][0], meta.normal[meta.secondaryKey][1]).toFixed(1);
      node.risk_level = 'low';
      node.confidence_score = 0.92;
      node.last_updated = new Date().toISOString();
    });
    this.alerts = [];
    this.activeCascade = null;
    this.cascadeStep = 0;
    // Publish the reset state directly. Calling tick() here would immediately
    // advance the state machine and could randomly create a new warning.
    this.emitStatus();
    return { success: true, message: 'All nodes restored to nominal levels' };
  }

  triggerCascadeScenario(scenarioName = 'monsoon_deluge') {
    this.activeCascade = scenarioName;
    this.cascadeStep = 1;

    if (scenarioName === 'monsoon_deluge') {
      // Step 1: Upstream Bhavani River surges to peak
      const upstream1 = this.nodes.get('REG-FL-01');
      const upstream2 = this.nodes.get('REG-FL-02');
      if (upstream1) { upstream1.state = 'CRITICAL'; upstream1.cyclesInState = 1; }
      if (upstream2) { upstream2.state = 'BREWING'; upstream2.cyclesInState = 2; }
      // Landslide hillside node starts brewing moisture
      const lsNode = this.nodes.get('REG-LS-01');
      if (lsNode) { lsNode.state = 'BREWING'; lsNode.cyclesInState = 1; }
    } else if (scenarioName === 'wildfire_spread') {
      // Step 1: Nilgiris forest fire reaches peak
      const fire1 = this.nodes.get('REG-FF-01');
      const fire2 = this.nodes.get('REG-FF-02');
      if (fire1) { fire1.state = 'CRITICAL'; fire1.cyclesInState = 1; }
      if (fire2) { fire2.state = 'BREWING'; fire2.cyclesInState = 2; }
      // Air quality downwind begins sensing smoke
      const air1 = this.nodes.get('REG-AP-01');
      if (air1) { air1.state = 'BREWING'; air1.cyclesInState = 1; }
    } else if (scenarioName === 'chemical_plume') {
      const chemNode = this.nodes.get('REG-CH-01');
      const airNode = this.nodes.get('REG-AP-02');
      if (chemNode) { chemNode.state = 'CRITICAL'; chemNode.cyclesInState = 1; }
      if (airNode) { airNode.state = 'BREWING'; airNode.cyclesInState = 2; }
    }

    this.tick();
    return { success: true, scenario: scenarioName, step: 1 };
  }

  emitStatus() {
    if (this.io) {
      this.io.emit('sim-playback-status', {
        speed: this.speed,
        isPaused: this.isPaused,
        activeCascade: this.activeCascade
      });
      this.io.emit('sim-telemetry-update', this.getDashboardSnapshot());
    }
  }

  getDashboardSnapshot() {
    const nodesList = Array.from(this.nodes.values());
    const totalNodes = nodesList.length;
    const criticalNodes = nodesList.filter(n => n.risk_level === 'high').length;
    const warningNodes = nodesList.filter(n => n.risk_level === 'medium').length;
    const normalNodes = totalNodes - criticalNodes - warningNodes;

    // Composite Regional Disaster Risk Index (0 - 100)
    let totalScore = 0;
    nodesList.forEach(n => {
      if (n.risk_level === 'high') totalScore += 100 * n.confidence_score;
      else if (n.risk_level === 'medium') totalScore += 45 * n.confidence_score;
      else totalScore += 10;
    });
    const regionalRiskIndex = Math.min(100, Math.round(totalScore / totalNodes));

    // Hazard Breakdown
    const hazardBreakdown = {};
    Object.values(HAZARD_TYPES).forEach(type => {
      hazardBreakdown[type] = {
        total: nodesList.filter(n => n.hazard_type === type).length,
        inAlert: nodesList.filter(n => n.hazard_type === type && n.risk_level !== 'low').length
      };
    });

    // AI Emergency Dispatch & Impact Advisory (Qualcomm SIH26178 Decision Support)
    const citizensAtRisk = criticalNodes * 18500 + warningNodes * 6200;
    const recommendedDispatch = [];
    if (criticalNodes > 0) {
      recommendedDispatch.push({
        unit: 'NDRF 4th Battalion (Arakkonam Unit)',
        action: 'Deploy Swift Water & Flood Inundation Rescue Boats',
        priority: 'IMMEDIATE',
        status: 'DISPATCHED'
      });
      recommendedDispatch.push({
        unit: 'Tamil Nadu Fire & Rescue Services (Coimbatore Division)',
        action: 'Activate Thermal Containment & Chemical VOC Countermeasures',
        priority: 'HIGH',
        status: 'EN ROUTE'
      });
    }
    if (warningNodes > 0) {
      recommendedDispatch.push({
        unit: 'State Disaster Response Force (SDRF)',
        action: 'Pre-position Ghat Road Landslide Clearing Bulldozers & Earthmovers',
        priority: 'WATCH',
        status: 'STANDBY'
      });
    }

    const evacuationCorridors = [
      { route: 'NH-544 (Salem-Kochi Highway)', status: criticalNodes > 2 ? 'Congestion Advisory' : 'Clear & High-Speed Transit' },
      { route: 'Mettupalayam-Coonoor Ghat Road', status: warningNodes > 1 ? 'Heavy Rain / Landslide Watch - Slow Traffic' : 'Open' },
      { route: 'Pollachi Coastal Link Bypass', status: 'Primary Safe Evacuation Route' }
    ];

    return {
      nodes: nodesList,
      stats: {
        totalNodes,
        criticalNodes,
        warningNodes,
        normalNodes,
        regionalRiskIndex,
        hazardBreakdown,
        speed: this.speed,
        isPaused: this.isPaused,
        activeCascade: this.activeCascade
      },
      aiAdvisory: {
        citizensAtRisk,
        regionalRiskIndex,
        recommendedDispatch,
        evacuationCorridors,
        generatedAt: new Date().toISOString()
      },
      alerts: this.alerts.slice(0, 25),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = SimulationEngine;
