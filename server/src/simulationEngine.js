const { REGIONAL_NODES, HAZARD_TYPES, HAZARD_METADATA } = require('./regionalData');

const HAZARD_LIST = Object.values(HAZARD_TYPES);

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
    this.initializeAnalytics();
    this.weather = this.seedWeather();
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
        history: initialHistory,
        battery: +(82 + Math.random() * 17).toFixed(0),
        rssi: -Math.round(58 + Math.random() * 34),
        snr: +(6 + Math.random() * 10).toFixed(1),
        last_seen: new Date().toISOString()
      });
    });

    // Make one node initially in slight brewing state for immediate visual interest
    const initialBrewNode = this.nodes.get('REG-FL-02');
    if (initialBrewNode) {
      initialBrewNode.state = 'BREWING';
      initialBrewNode.cyclesInState = 2;
    }

    // Seed health envelope for every node, then force one node degraded for realism
    this.nodes.forEach((node) => this.refreshNodeHealth(node));
    const nodeKeys = Array.from(this.nodes.keys());
    const weakNode = this.nodes.get(nodeKeys[Math.floor(Math.random() * nodeKeys.length)]);
    if (weakNode) {
      weakNode.rssi = -Math.round(94 + Math.random() * 6);
      weakNode.battery = 26 + Math.round(Math.random() * 14);
      this.refreshNodeHealth(weakNode);
    }
  }

  randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  tick() {
    this.updateWeather();
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

      // Wind-driven plume advection: smoke / PM from upwind airborne sources
      const plume = this.computePlumeBoost(node);
      if (plume > 0) {
        pVal = +(pVal + plume).toFixed(1);
      }

      // Assess Risk Level
      let riskLevel = 'low';
      let confidence = +(0.88 + Math.random() * 0.10).toFixed(2);

      // Some secondary keys are dangerous at LOW readings (e.g. humidity in a
      // heatwave: critically dry air can push it below its floor).
      const pInverted = meta.critical[meta.primaryKey] < meta.normal[meta.primaryKey][1];
      const sInverted = meta.critical[meta.secondaryKey] < meta.normal[meta.secondaryKey][1];

      if (this.violatesThreshold(pVal, meta.critical[meta.primaryKey], pInverted) ||
          this.violatesThreshold(sVal, meta.critical[meta.secondaryKey], sInverted)) {
        riskLevel = 'high';
        confidence = +(0.92 + Math.random() * 0.07).toFixed(2);
      } else if (this.violatesThreshold(pVal, meta.warning[meta.primaryKey], pInverted) ||
                  this.violatesThreshold(sVal, meta.warning[meta.secondaryKey], sInverted)) {
        riskLevel = 'medium';
        confidence = +(0.80 + Math.random() * 0.12).toFixed(2);
      }

      node.currentValues[meta.primaryKey] = +pVal.toFixed(1);
      node.currentValues[meta.secondaryKey] = +sVal.toFixed(1);
      node.risk_level = riskLevel;
      node.confidence_score = Math.min(1.0, confidence);
      node.last_updated = new Date().toISOString();
      node.riskExplanation = this.buildRiskExplanation(node, meta, pVal, sVal, riskLevel, plume);
      node.riskEvidence = this.buildRiskEvidence(node, meta);

      // Node health dynamics (battery drain + LoRa link quality drift)
      node.battery = Math.max(14, Math.round(node.battery - Math.random() * 0.08));
      node.rssi = Math.max(-108, Math.min(-46, Math.round(node.rssi + (Math.random() - 0.5) * 1.6)));
      node.snr = Math.max(1.5, Math.min(18, +(node.snr + (Math.random() - 0.5) * 0.7).toFixed(1)));
      node.last_seen = new Date().toISOString();
      this.refreshNodeHealth(node);

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
    this.recordAnalyticsTick(payload);
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
        explanation: node.riskExplanation,
        weather: {
          dir: this.compassLabel(this.weather.windDeg),
          deg: this.weather.windDeg,
          speed: this.weather.windSpeed
        },
        timestamp: new Date().toISOString()
      };

      this.alerts.unshift(alertItem);
      if (this.alerts.length > 50) this.alerts.pop();

      this.todayCounters.alertCount += 1;
      this.weekCounters.alertCount += 1;
      if (this.todayCounters.byHazard[node.hazard_type]) {
        this.todayCounters.byHazard[node.hazard_type].alerts += 1;
      }

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
      node.riskExplanation = this.buildRiskExplanation(node, meta, node.currentValues[meta.primaryKey], node.currentValues[meta.secondaryKey], 'low', 0);
      node.riskEvidence = this.buildRiskEvidence(node, meta);
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

  // -------------------------------------------------------------------------
  // Risk decision explanations: traceable "why this level" for each node
  // -------------------------------------------------------------------------

  explainReading(value) {
    const n = +value;
    return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
  }

  keyLabel(key) {
    if (key === 'pm25') return 'PM2.5';
    if (key === 'pm10') return 'PM10';
    if (key === 'ph') return 'pH';
    if (key === 'voc') return 'VOC';
    return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  violatesThreshold(value, threshold, inverted) {
    return inverted ? value <= threshold : value >= threshold;
  }

  buildRiskExplanation(node, meta, pVal, sVal, riskLevel, plumeUsed) {
    const pKey = meta.primaryKey;
    const sKey = meta.secondaryKey;
    const pStr = this.explainReading(pVal) + ' ' + meta.primaryUnit;
    const sStr = this.explainReading(sVal) + ' ' + meta.secondaryUnit;
    const pLabel = this.keyLabel(pKey);
    const sLabel = this.keyLabel(sKey);
    const pInverted = meta.critical[pKey] < meta.normal[pKey][1];
    const sInverted = meta.critical[sKey] < meta.normal[sKey][1];

    if (riskLevel === 'high') {
      const pClause = pLabel + ' ' + pStr + (pInverted
        ? ' falls below ' + meta.critical[pKey] + ' ' + meta.primaryUnit + ' moisture floor'
        : ' exceeds ' + meta.critical[pKey] + ' ' + meta.primaryUnit + ' critical threshold');
      const sClause = sLabel + ' ' + sStr + (sInverted
        ? ' falls below ' + meta.critical[sKey] + ' ' + meta.secondaryUnit + ' moisture floor'
        : ' exceeds ' + meta.critical[sKey] + ' ' + meta.secondaryUnit + ' critical threshold');
      let text;
      if (this.violatesThreshold(Number(pVal), meta.critical[pKey], pInverted)) {
        text = 'CRITICAL because ' + pClause;
        if (this.violatesThreshold(Number(sVal), meta.critical[sKey], sInverted)) text += '; ' + sClause;
      } else {
        text = 'CRITICAL because ' + sClause;
      }
      if (plumeUsed > 0) text += ' (includes +' + this.explainReading(plumeUsed) + ' ' + meta.primaryUnit + ' downwind plume drift)';
      return text + '.';
    }

    if (riskLevel === 'medium') {
      const pClause = pLabel + ' ' + pStr + (pInverted
        ? ' dropped below ' + meta.warning[pKey] + ' ' + meta.primaryUnit + ' warning floor'
        : ' crossed ' + meta.warning[pKey] + ' ' + meta.primaryUnit + ' warning threshold');
      const sClause = sLabel + ' ' + sStr + (sInverted
        ? ' dropped below ' + meta.warning[sKey] + ' ' + meta.secondaryUnit + ' warning floor'
        : ' crossed ' + meta.warning[sKey] + ' ' + meta.secondaryUnit + ' warning threshold');
      let text;
      if (this.violatesThreshold(Number(pVal), meta.warning[pKey], pInverted)) {
        text = 'WARNING because ' + pClause;
        if (this.violatesThreshold(Number(sVal), meta.warning[sKey], sInverted)) text += '; ' + sClause;
      } else {
        text = 'WARNING because ' + sClause;
      }
      if (plumeUsed > 0) text += ' (includes +' + this.explainReading(plumeUsed) + ' ' + meta.primaryUnit + ' downwind plume drift)';
      return text + '.';
    }

    return 'NOMINAL — ' + pLabel + ' ' + pStr + ' within safe band (' +
      meta.normal[pKey][0] + '–' + meta.normal[pKey][1] + ' ' + meta.primaryUnit + ').';
  }

  buildRiskEvidence(node, meta) {
    const mkEvidence = (key, unit) => ({
      key,
      label: this.keyLabel(key),
      value: Math.round(node.currentValues[key] * 100) / 100,
      unit,
      inverted: meta.critical[key] < meta.normal[key][1],
      warning: meta.warning[key],
      critical: meta.critical[key]
    });
    return {
      primary: mkEvidence(meta.primaryKey, meta.primaryUnit),
      secondary: mkEvidence(meta.secondaryKey, meta.secondaryUnit)
    };
  }

  // -------------------------------------------------------------------------
  // Historical analytics: day/week risk aggregates, alert tallies, trend series
  // -------------------------------------------------------------------------

  seededRandom(seed) {
    const x = Math.sin(seed) * 43758.5453123;
    return x - Math.floor(x);
  }

  dateStr(d) {
    return d.toISOString().slice(0, 10);
  }

  dayLabel(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  weekLabel(iso) {
    return 'Wk ' + iso.slice(5).replace('-', '/');
  }

  getWeekStart(ts) {
    const d = new Date(ts);
    d.setUTCHours(0, 0, 0, 0);
    const diff = (d.getUTCDay() + 6) % 7; // Monday = 0
    d.setUTCDate(d.getUTCDate() - diff);
    return d;
  }

  newDayCounters() {
    const byHazard = {};
    HAZARD_LIST.forEach((type) => {
      byHazard[type] = { alerts: 0, high: 0, medium: 0 };
    });
    return { riskSum: 0, sampleCount: 0, highSamples: 0, mediumSamples: 0, alertCount: 0, byHazard };
  }

  newWeekCounters() {
    return { riskSum: 0, sampleCount: 0, highSamples: 0, mediumSamples: 0, alertCount: 0 };
  }

  initializeAnalytics() {
    this.sampleHistory = [];
    this.todayCounters = this.newDayCounters();
    this.weekCounters = this.newWeekCounters();
    this.currentDayStr = this.dateStr(new Date());
    this.currentWeekStr = this.dateStr(this.getWeekStart(Date.now()));

    const now = Date.now();

    // Pre-seed 13 completed days (index 13..1) — the 14th slot (today) is live.
    this.daily = [];
    for (let i = 13; i >= 1; i--) {
      this.daily.push(this.buildSeededDay(new Date(now - i * 86400000), i));
    }
    this.daily.push(this.buildDayEntryFromCounters(new Date(), this.todayCounters));

    // Pre-seed 7 completed weeks — the 8th slot (current week) is live.
    const currentWeekStart = this.getWeekStart(now).getTime();
    this.weekly = [];
    for (let i = 7; i >= 1; i--) {
      this.weekly.push(this.buildSeededWeek(new Date(currentWeekStart - i * 7 * 86400000), i));
    }
    this.weekly.push(this.buildWeekEntryFromCounters(this.getWeekStart(now), this.weekCounters));
  }

  buildDayEntryFromCounters(day, c) {
    const iso = this.dateStr(day);
    return {
      date: iso,
      label: this.dayLabel(iso),
      riskIndex: c.sampleCount ? Math.round(c.riskSum / c.sampleCount) : 15,
      highCount: c.highSamples,
      mediumCount: c.mediumSamples,
      alertCount: c.alertCount,
      byHazard: c.byHazard
    };
  }

  buildWeekEntryFromCounters(weekStart, c) {
    const iso = this.dateStr(weekStart);
    return {
      weekOf: iso,
      label: this.weekLabel(iso),
      riskIndex: c.sampleCount ? Math.round(c.riskSum / c.sampleCount) : 18,
      highCount: c.highSamples,
      mediumCount: c.mediumSamples,
      alertCount: c.alertCount
    };
  }

  buildSeededDay(dateObj, seedIndex) {
    const iso = this.dateStr(dateObj);
    const rnd = this.seededRandom(seedIndex * 37 + 3);
    const bigEvent = rnd > 0.68;
    const riskIndex = bigEvent
      ? 42 + Math.round(rnd * 34)
      : 10 + Math.round(this.seededRandom(seedIndex * 13 + 1) * 26);
    const highCount = bigEvent ? 2 + Math.round(rnd * 4) : Math.round(this.seededRandom(seedIndex * 17 + 5) * 2);
    const mediumCount = bigEvent ? 4 + Math.round(rnd * 6) : 1 + Math.round(this.seededRandom(seedIndex * 19 + 9) * 5);
    const alertCount = highCount * 3 + mediumCount * 2 + Math.round(this.seededRandom(seedIndex * 23 + 7) * 5);

    const byHazard = {};
    HAZARD_LIST.forEach((type, i) => {
      const h = this.seededRandom(seedIndex * 31 + i * 11 + 5);
      const hot = h > 0.6;
      const alerts = hot ? 1 + Math.round(h * 4) : (h > 0.3 ? 1 : 0);
      const high = hot ? Math.max(0, Math.round(h * 2.2) - 1) : 0;
      const medium = hot ? Math.max(0, Math.round(h * 1.8) - (high > 1 ? 1 : 0)) : (h > 0.25 ? 1 : 0);
      byHazard[type] = { alerts, high, medium };
    });

    return {
      date: iso,
      label: this.dayLabel(iso),
      riskIndex,
      highCount,
      mediumCount,
      alertCount,
      byHazard
    };
  }

  buildSeededWeek(dateObj, seedIndex) {
    const iso = this.dateStr(dateObj);
    const rnd = this.seededRandom(seedIndex * 43 + 2);
    return {
      weekOf: iso,
      label: this.weekLabel(iso),
      riskIndex: 14 + Math.round(rnd * 28),
      highCount: Math.round(rnd * 14),
      mediumCount: 8 + Math.round(rnd * 24),
      alertCount: 20 + Math.round(rnd * 60)
    };
  }

  handleDayRollover() {
    const todayStr = this.dateStr(new Date());
    if (this.currentDayStr && todayStr !== this.currentDayStr) {
      const previous = new Date(this.currentDayStr + 'T00:00:00Z');
      this.daily.push(this.buildDayEntryFromCounters(previous, this.todayCounters));
      if (this.daily.length > 30) this.daily.shift();
      this.todayCounters = this.newDayCounters();
    }
    this.currentDayStr = todayStr;
  }

  handleWeekRollover() {
    const wkStart = this.getWeekStart(Date.now());
    const wkStr = this.dateStr(wkStart);
    if (this.currentWeekStr && wkStr !== this.currentWeekStr) {
      const previous = new Date(this.currentWeekStr + 'T00:00:00Z');
      this.weekly.push(this.buildWeekEntryFromCounters(previous, this.weekCounters));
      if (this.weekly.length > 16) this.weekly.shift();
      this.weekCounters = this.newWeekCounters();
    }
    this.currentWeekStr = wkStr;
  }

  recordAnalyticsTick(snapshot) {
    const st = snapshot.stats;

    // Rolling risk series (for live sparkline / drill-down)
    this.sampleHistory.push({ t: Date.now(), riskIndex: st.regionalRiskIndex });
    if (this.sampleHistory.length > 140) this.sampleHistory.shift();

    // Feed both day and week accumulators
    const feed = (c) => {
      c.riskSum += st.regionalRiskIndex;
      c.sampleCount += 1;
      c.highSamples += st.criticalNodes;
      c.mediumSamples += st.warningNodes;
    };
    feed(this.todayCounters);
    feed(this.weekCounters);

    snapshot.nodes.forEach((n) => {
      const bucket = this.todayCounters.byHazard[n.hazard_type];
      if (bucket) {
        if (n.risk_level === 'high') bucket.high += 1;
        else if (n.risk_level === 'medium') bucket.medium += 1;
      }
    });

    this.handleDayRollover();
    this.handleWeekRollover();
  }

  getAnalyticsPayload() {
    // Live snapshot rows for today / current week
    const todayEntry = this.buildDayEntryFromCounters(new Date(), this.todayCounters);
    const dailyTrend = [...this.daily.slice(0, -1), todayEntry];

    const weekEntry = this.buildWeekEntryFromCounters(this.getWeekStart(Date.now()), this.weekCounters);
    const weeklyTrend = [...this.weekly.slice(0, -1), weekEntry];

    // Trailing 7-day incident tallies by hazard (6 completed days + live today)
    const trailing = dailyTrend.slice(-7);
    const tally = {};
    HAZARD_LIST.forEach((type) => { tally[type] = { alerts: 0, high: 0, medium: 0 }; });
    trailing.forEach((d) => {
      HAZARD_LIST.forEach((type) => {
        const b = d.byHazard && d.byHazard[type];
        if (b) {
          tally[type].alerts += b.alerts || 0;
          tally[type].high += b.high || 0;
          tally[type].medium += b.medium || 0;
        }
      });
    });

    const nodeCount = {};
    this.nodes.forEach((n) => { nodeCount[n.hazard_type] = (nodeCount[n.hazard_type] || 0) + 1; });

    const hazardCounts = HAZARD_LIST.map((type) => ({
      type,
      label: HAZARD_METADATA[type].label,
      color: HAZARD_METADATA[type].color,
      nodeCount: nodeCount[type] || 0,
      alerts: tally[type].alerts,
      high: tally[type].high,
      medium: tally[type].medium
    }));

    return {
      dailyTrend,
      weeklyTrend,
      hazardCounts,
      riskSeries: this.sampleHistory,
      generatedAt: new Date().toISOString()
    };
  }

  // -------------------------------------------------------------------------
  // Regional weather context & airborne plume advection (realism)
  // -------------------------------------------------------------------------

  seedWeather() {
    return {
      windDeg: Math.round(195 + Math.random() * 45), // west-southwesterly monsoon flow
      windSpeed: +(12 + Math.random() * 14).toFixed(1), // km/h
      condition: 'Dry westerlies',
      updatedAt: new Date().toISOString()
    };
  }

  updateWeather() {
    const w = this.weather;
    w.windDeg = Math.round((w.windDeg + (Math.random() - 0.5) * 14 + 360) % 360);
    w.windSpeed = Math.max(4, Math.min(45, +(w.windSpeed + (Math.random() - 0.5) * 2.6).toFixed(1)));
    if (w.windSpeed >= 32) w.condition = 'Strong gusty winds';
    else if (w.windSpeed >= 20) w.condition = 'Brisk monsoon flow';
    else if (w.windSpeed >= 10) w.condition = 'Moderate westerlies';
    else w.condition = 'Light airs';
    w.updatedAt = new Date().toISOString();
  }

  compassLabel(deg) {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return dirs[Math.round(((deg % 360) / 22.5)) % 16];
  }

  bearingDegrees(lat1, lon1, lat2, lon2) {
    const toRad = Math.PI / 180;
    const phi1 = lat1 * toRad;
    const phi2 = lat2 * toRad;
    const dLon = (lon2 - lon1) * toRad;
    const y = Math.sin(dLon) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
    return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
  }

  haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const toRad = Math.PI / 180;
    const dLat = (lat2 - lat1) * toRad;
    const dLon = (lon2 - lon1) * toRad;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  computePlumeBoost(node) {
    // Airborne plume advection only affects smoke (forest fire) and PM (air pollution).
    // Upwind CRITICAL/BREWING airborne sources push contaminant mass downwind.
    if (node.hazard_type !== 'forest_fire' && node.hazard_type !== 'air_pollution') return 0;
    let boost = 0;
    this.nodes.forEach((src) => {
      if (src.node_id === node.node_id) return;
      if (src.hazard_type !== 'forest_fire' && src.hazard_type !== 'air_pollution') return;
      const intensity = src.state === 'CRITICAL' ? 1 : src.state === 'BREWING' ? 0.4 : 0;
      if (intensity <= 0) return;
      const bearing = this.bearingDegrees(src.lat, src.lon, node.lat, node.lon);
      let delta = (bearing - this.weather.windDeg) % 360;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      if (Math.abs(delta) > 35) return; // source is not meaningfully upwind
      const distKm = this.haversineKm(src.lat, src.lon, node.lat, node.lon);
      const falloff = Math.max(0, 1 - distKm / 90);
      boost += intensity * falloff * (this.weather.windSpeed / 18) * 6;
    });
    return Math.min(20, +boost.toFixed(1));
  }

  hasActivePlumeSource() {
    let found = false;
    this.nodes.forEach((n) => {
      if ((n.hazard_type === 'forest_fire' || n.hazard_type === 'air_pollution') &&
          (n.state === 'CRITICAL' || n.state === 'BREWING')) {
        found = true;
      }
    });
    return found;
  }

  getWeatherContext() {
    return {
      windDeg: this.weather.windDeg,
      windSpeed: this.weather.windSpeed,
      windDir: this.compassLabel(this.weather.windDeg),
      condition: this.weather.condition,
      plumeActive: this.hasActivePlumeSource(),
      updatedAt: this.weather.updatedAt
    };
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

  refreshNodeHealth(node) {
    const rssi = Number(node.rssi) || -70;
    let signalLevel = 'excellent';
    let signalBars = 4;
    if (rssi <= -100) { signalLevel = 'degraded'; signalBars = 1; }
    else if (rssi <= -90) { signalLevel = 'poor'; signalBars = 1; }
    else if (rssi <= -82) { signalLevel = 'fair'; signalBars = 2; }
    else if (rssi <= -70) { signalLevel = 'good'; signalBars = 3; }

    const ageMs = Date.now() - new Date(node.last_seen).getTime();
    const stale = ageMs > 90000; // no heartbeat within 90s

    node.health = {
      battery: node.battery,
      rssi: node.rssi,
      snr: node.snr,
      last_seen: node.last_seen,
      signal_level: stale ? 'offline' : signalLevel,
      signal_bars: stale ? 0 : signalBars,
      status: stale ? 'offline' : (signalBars <= 1 ? 'degraded' : 'online')
    };
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
        activeCascade: this.activeCascade,
        weather: this.getWeatherContext()
      },
      aiAdvisory: {
        citizensAtRisk,
        regionalRiskIndex,
        recommendedDispatch,
        evacuationCorridors,
        generatedAt: new Date().toISOString()
      },
      analytics: this.getAnalyticsPayload(),
      alerts: this.alerts.slice(0, 25),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = SimulationEngine;
