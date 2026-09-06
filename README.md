# BEACON: AI-Powered Multi-Hazard Environmental Intelligence Network
### Smart India Hackathon Problem Statement SIH26178 (Qualcomm)

> **Disaster Management & Multi-Hazard Early Warning Network**  
> Covering Floods, Forest Fires, Air Pollution, Extreme Heat, Landslides, Industrial Chemical Leaks, and Water Quality Degradation.

---

## 🎯 Project Overview & Dual-Dashboard Concept

BEACON bridges a **real physical hardware prototype** with a **large-scale regional disaster intelligence network** through two switchable dashboards in a single web application:

1. **Dashboard 1 — LIVE (Real Physical Hardware Prototype)**:
   - Evaluates real edge telemetry from an active physical node equipped with **DHT22 (Temperature/Humidity)**, **MQ-2 (Smoke/Gas)**, **Water Level Sensor (River/Drainage Surge)**, and a **Rainfall Sensor**.
   - Transmits telemetry over long-range **LoRa SX1278 (433MHz)** to an **ESP32 Base Station**.
   - ESP32 Base Station connects over **USB Serial (115200 baud)** to the laptop backend.
   - Live sensor cards with trend indicators, fixed map position at **SKCET Campus (Coimbatore)**, rolling Recharts time series, alert logs, an offline queue simulator for connection dropouts, and a visual physical mirror of the hardware buzzer and status LED.
   - Includes **Mock Serial / Test Mode** toggle so the live hardware dashboard can be tested or demoed standalone without hardware plugged in.

2. **Dashboard 2 — SIMULATED (Regional Multi-Hazard Network)**:
   - Demonstrates the full-scale vision of SIH26178 across **21 virtual edge nodes** grouped into realistic geomorphic zones across the Western Ghats / Nilgiris / Coimbatore corridor.
   - Simulates all **7 hazard classes**:
     1. Flash Flood / River Surge (Water Level, Rainfall)
     2. Forest Fire / Wildfire (Smoke, Ambient Temp)
     3. Air Pollution (PM2.5, PM10)
     4. Extreme Heat (Surface Temp, Relative Humidity)
     5. Landslide Precursors (Soil Moisture Saturation, Vibration/Tilt)
     6. Industrial Chemical Leaks (Gas Concentration, VOCs)
     7. Water Quality Degradation (pH level, Turbidity proxy)
   - Powered by an **evolving state engine** (Normal ➔ Brewing ➔ Peak Alert ➔ Recovery) with 1-click scenario triggers for live jury demonstrations.
   - Interactive Leaflet geospatial map with dynamic hazard-specific icons and risk hotspot radius overlays.
   - Multi-recipient dispatch classification: **Disaster Authority (NDRF/SDMA)**, **Citizen Advisory (SMS/Mobile App)**, or **Dual Dispatch**.

---

## 🏗️ Architecture Diagrams (Ready for Slides)

### Pipeline 1: Live Physical Prototype (Dashboard 1)
```
┌───────────────────────────────────────────────────────────┐
│                   PHYSICAL EDGE NODE                      │
│ Sensors: DHT22 (Temp/Hum), MQ-2 (Smoke), Water Level, Rain│
│ Microcontroller: ESP32 / Arduino Nano                     │
│ RF Transmitter: LoRa SX1278 (RA-02 433MHz)                │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼ LoRa RF Packet (433 MHz)
┌───────────────────────────────────────────────────────────┐
│                 ESP32 LORA BASE STATION                   │
│ LoRa Receiver: SX1278 (RA-02)                             │
│ Local Hardware Indicators: Piezo Buzzer + Status LED      │
│ Edge Risk Evaluation: On-Device Threshold Filter          │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼ USB Serial (115200 Baud JSON Stream)
┌───────────────────────────────────────────────────────────┐
│                 BEACON NODE.JS BACKEND                    │
│ SerialPort Ingestion & Parser (with Mock Mode Fallback)   │
│ Offline Queue & Store-and-Forward Buffer                  │
│ WebSocket Gateway (Socket.IO Hub)                         │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼ WebSocket (Socket.IO)
┌───────────────────────────────────────────────────────────┐
│               REACT DASHBOARD (WEB CLIENT)                │
│ Live Sensor Cards • SKCET Map • Recharts • Hardware Mirror│
└───────────────────────────────────────────────────────────┘
```

### Pipeline 2: Regional Multi-Hazard Simulation (Dashboard 2)
```
┌───────────────────────────────────────────────────────────┐
│             BEACON SYNTHETIC TELEMETRY ENGINE             │
│ 21 Nodes across 7 Hazard Classes (Coimbatore/Nilgiris)    │
│ Evolving State Machine (Normal ➔ Brewing ➔ Peak ➔ Recover) │
│ Live Interactive Scenario Injectors (Flood, Fire, Leak)   │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼ Real-time Risk Assessment (Composite Index 0-100)
┌───────────────────────────────────────────────────────────┐
│              WARNING LEVEL DISPATCH ROUTER                │
│ High Risk & Conf >= 0.85 ➔ NDRF / SDMA + Citizen Dual     │
│ Med Risk & Conf >= 0.75 ➔ Citizen Advisory (SMS / App)    │
│ Med Risk & Conf < 0.75  ➔ Authority Tactical Watchlist    │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼ WebSocket Broadcast (Every 3.5s)
┌───────────────────────────────────────────────────────────┐
│               REGIONAL REACT COMMAND CENTER               │
│ Leaflet Geospatial Hotspots • Live Alert Feed • Sparklines│
└───────────────────────────────────────────────────────────┘
```

---

## 🚀 Quickstart Guide

### Prerequisites
- Node.js (v18 or higher — tested on Node v24)
- npm (v9 or higher)

### 1. Installation
In the root directory, install dependencies:
```bash
npm run install:all
```
*(Or install individually: `npm install` in root, `cd server && npm install`, and `cd client && npm install`)*

---

## 🕹️ Running the Application

To run both Backend (port `5000`) and Frontend (port `3000`) simultaneously:
```bash
npm run dev
```

Then open your browser at:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📖 Step-by-Step Demo Modes

### Mode 1: Standalone Simulation with Zero Hardware
1. Launch the app with `npm run dev`.
2. By default, the app opens on the **"REGIONAL SIMULATION"** tab.
3. Observe all 21 virtual nodes updating smoothly every 3.5 seconds across 7 hazards.
4. **Presentation Tip**: Under "Live Demo Disaster Scenario Injectors", click **"Flash Flood"** or **"Forest Fire"**.
   - Notice affected nodes surging into Warning and Critical states.
   - The Regional Risk Index elevates.
   - New alerts stream into the **Live Alert Feed**, tagged with **"AUTHORITY + CITIZENS (DUAL DISPATCH)"**.
5. Click any marker on the map to open the **Node Detail Modal** showing the 15-cycle sparkline waveform and sensor limits.
6. Click **"Reset All"** to return the entire network to calm nominal conditions.

---

### Mode 2: Live Prototype in Mock / Test Mode (No Hardware Needed)
1. Switch to the **"LIVE HARDWARE"** tab using the top switcher.
2. If no ESP32 base station is plugged in, the system automatically activates **Mock/Test Mode**.
3. Telemetry packets for node `N1-SKCET` at SKCET Campus stream every 2 seconds.
4. Test the pipeline buttons on the top bar:
   - Click **"Flood"**: Watch water level surge to 88.5 cm, triggering the visual **Piezo Buzzer** animation and turning the **Status LED RED**.
   - Click **"Chime On"** on the ESP32 Base Station Mirror to hear the audio alert beep through your browser!
   - Click **"Simulate Drop (Toggle Offline)"**: Observe the **Offline Queue** buffer packets when cloud connectivity drops. Click **"Restore Uplink"** to watch the queue flush with zero packet loss.
   - Click **"Calm"** to return to nominal status.

---

### Mode 3: Connecting Real Hardware (ESP32 Base Station over USB)
1. Flash the provided Arduino sketch [`server/esp32_firmware/base_station.ino`](file:///c:/SIH%202026/BEACON-Environmental-Intelligence/server/esp32_firmware/base_station.ino) onto your ESP32 Base Station board using the Arduino IDE.
   - Requires libraries: `LoRa` by Sandeep Mistry and `ArduinoJson` (v6 or v7).
2. Connect the ESP32 Base Station to your laptop via USB cable.
3. On the **LIVE HARDWARE** dashboard:
   - Click the **Refresh Ports** icon (`↻`).
   - Select your ESP32's COM port (e.g. `COM3` or `COM4` - Silicon Labs CP210x or CH340).
   - Turn OFF the "Test / Mock Mode" switch.
   - Click **"Connect Hardware"**.
4. Telemetry received by the ESP32 over LoRa from the physical Edge Node will now stream straight into the UI in real time!

---

## 📡 Base Station USB Serial Packet Protocol
The backend expects newline-delimited JSON packets at `115200` baud:
```json
{
  "node_id": "N1-SKCET",
  "location": "SKCET Campus, Coimbatore",
  "lat": 10.9366,
  "lon": 76.9558,
  "water_level": 22.4,
  "temp": 29.8,
  "humidity": 64.0,
  "smoke": 110,
  "rainfall": 3.5,
  "risk_level": "low",
  "confidence": 0.94,
  "timestamp": "2026-09-04T05:22:00.000Z"
}
```

---

## 🛠️ Technology Stack
- **Frontend**: React 18, Webpack 5, Tailwind CSS, Lucide Icons, Leaflet Maps, Recharts.
- **Backend**: Node.js, Express, Socket.IO, SerialPort (with automatic mock fallback).
- **Physical Edge Hardware**: ESP32, SX1278 LoRa (433MHz), DHT22, MQ-2, Water Level Sensor, Tipping Bucket Rain Gauge, Piezo Buzzer, RGB Indicator LED.

---

## 🏆 Smart India Hackathon (SIH26178) Alignment
- **Comprehensive Hazard Coverage**: Addresses all 7 disaster categories specified in the problem statement.
- **Edge ML & Decision Intelligence**: On-device threshold verification and confidence-weighted risk index.
- **Resilient Offline Architecture**: Store-and-forward edge queuing for intermittent connectivity.
- **Prioritized Dispatches**: Dynamic alert routing to disaster response authorities (NDRF/SDMA) and citizen advisories.
