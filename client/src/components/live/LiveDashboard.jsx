import React from 'react';
import LoRaSignalInspector from './LoRaSignalInspector';
import LiveControlCockpit from './LiveControlCockpit';
import InteractiveSensorGauge from './InteractiveSensorGauge';
import LiveNodeMap from './LiveNodeMap';
import LiveCharts from './LiveCharts';
import HardwareMirror from './HardwareMirror';
import AlertLogPanel from './AlertLogPanel';
import OfflineQueueBanner from './OfflineQueueBanner';
import { Droplets, Thermometer, CloudRain, Flame, Wind } from 'lucide-react';
import { HAZARD_COLORS } from '../../hazardTheme';

export default function LiveDashboard({
  telemetry,
  serialStatus,
  hardwareState,
  history,
  alerts,
  queueStatus,
  onSensorChange,
  onInjectSpike
}) {
  return (
    <div className="space-y-3.5">
      
      {/* 1. LoRa Physical RF Signal & Raw Packet Inspector */}
      <LoRaSignalInspector telemetry={telemetry} />

      {/* 2. Hands-on Interactive Control Cockpit (Sliders + Spikes + Audio Chime) */}
      <LiveControlCockpit
        telemetry={telemetry}
        serialStatus={serialStatus}
        onSensorChange={onSensorChange}
        onInjectSpike={onInjectSpike}
      />

      {/* 3. Base Station Store-and-Forward Hardware Offline Queue Buffer */}
      <OfflineQueueBanner queueStatus={queueStatus} />

      {/* 4. Five Circular SVG Radial Gauges (Modern High-Tech Operations Strip) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        
        {/* Water Level */}
        <InteractiveSensorGauge
          title="Water Level"
          value={telemetry?.water_level || 0}
          unit="cm"
          min={0}
          max={100}
          warningThreshold={45}
          criticalThreshold={75}
          precision={1}
          color={HAZARD_COLORS.flood}
          icon={Droplets}
          history={history}
        />

        {/* Ambient Temperature */}
        <InteractiveSensorGauge
          title="Ambient Temp"
          value={telemetry?.temp || 0}
          unit="°C"
          min={15}
          max={55}
          warningThreshold={40}
          criticalThreshold={48}
          precision={1}
          color={HAZARD_COLORS.extreme_heat}
          icon={Thermometer}
          history={history}
        />

        {/* Relative Humidity */}
        <InteractiveSensorGauge
          title="Humidity"
          value={telemetry?.humidity || 0}
          unit="%"
          min={20}
          max={100}
          warningThreshold={85}
          criticalThreshold={95}
          precision={1}
          color={HAZARD_COLORS.air_pollution}
          icon={Wind}
          history={history}
        />

        {/* Smoke Concentration */}
        <InteractiveSensorGauge
          title="Smoke (MQ-2)"
          value={telemetry?.smoke || 0}
          unit="ppm"
          min={50}
          max={1000}
          warningThreshold={350}
          criticalThreshold={600}
          precision={0}
          color={HAZARD_COLORS.forest_fire}
          icon={Flame}
          history={history}
        />

        {/* Precipitation Rate */}
        <InteractiveSensorGauge
          title="Rainfall"
          value={telemetry?.rainfall || 0}
          unit="mm/h"
          min={0}
          max={80}
          warningThreshold={25}
          criticalThreshold={50}
          precision={1}
          color={HAZARD_COLORS.water_quality}
          icon={CloudRain}
          history={history}
        />

      </div>

      {/* 5. Middle Grid: Geospatial Radar Map (7 cols) + Physical Hardware Mirror (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        
        {/* Geospatial Map with Radar Sweep */}
        <div className="lg:col-span-7 h-[330px]">
          <LiveNodeMap telemetry={telemetry} />
        </div>

        {/* Hardware Mirror (Base Station Buzzer, Decibels, Status LEDs) */}
        <div className="lg:col-span-5 h-[330px]">
          <HardwareMirror
            hardwareState={hardwareState}
            telemetry={telemetry}
          />
        </div>

      </div>

      {/* 6. Lower Grid: Dynamic Time-Series Waveforms (7 cols) + Alert Dispatch Feed (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        
        {/* Rolling Waveform Charts */}
        <div className="lg:col-span-7 min-h-[340px]">
          <LiveCharts history={history} />
        </div>

        {/* Incident Alert Dispatch Feed */}
        <div className="lg:col-span-5 min-h-[340px]">
          <AlertLogPanel alerts={alerts} />
        </div>

      </div>

    </div>
  );
}
