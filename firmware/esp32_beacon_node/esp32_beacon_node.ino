#include <DHT.h>
#include <ArduinoJson.h>

// ---------------------------------------------------------------------------
// Pin definitions — adjust to your wiring
// ---------------------------------------------------------------------------
#define DHT_PIN        4      // DHT22 data pin
#define DHT_TYPE       DHT22  // DHT22 (or DHT11)
#define SMOKE_PIN      34     // MQ-2 analog out (ADC1 channel)
#define RAIN_PIN       35     // Rain sensor analog (ADC1 channel, inverted: 4095 = dry)
#define WATER_PIN      32     // Water level sensor analog (ADC1 channel)

// ---------------------------------------------------------------------------
// Risk thresholds (mirror the server's classifyEsp32RiskType / RiskLevel)
// ---------------------------------------------------------------------------
#define FIRE_TEMP_WARN    42.0
#define FIRE_TEMP_HIGH    44.0
#define FIRE_TEMP_CRIT    47.0
#define FIRE_SMOKE_WARN   260
#define FIRE_SMOKE_HIGH   420
#define FIRE_SMOKE_CRIT   700

#define FLOOD_WATER_WARN  1600
#define FLOOD_WATER_HIGH  2000
#define FLOOD_WATER_CRIT  2600
#define FLOOD_RAIN_WARN   1400   // inverted: low value = heavy rain
#define FLOOD_RAIN_HIGH   900
#define FLOOD_RAIN_CRIT   400

// ---------------------------------------------------------------------------
// Timing
// ---------------------------------------------------------------------------
#define SENSOR_INTERVAL_MS  2000    // sensors checked every 2 s
#define ALIVE_INTERVAL_MS   30000   // STATUS : ALIVE every 30 s

// ---------------------------------------------------------------------------
// Globals
// ---------------------------------------------------------------------------
DHT dht(DHT_PIN, DHT_TYPE);
unsigned long lastSensorTime  = 0;
unsigned long lastAliveTime   = 0;

// ---------------------------------------------------------------------------
// Classify risk on-device (same logic as server)
// ---------------------------------------------------------------------------
const char* classifyRiskType(float temp, int smoke, int water, int rain) {
  bool fire  = (smoke >= FIRE_SMOKE_WARN) || (temp >= FIRE_TEMP_WARN);
  bool flood = (water >= FLOOD_WATER_WARN) || (rain <= FLOOD_RAIN_WARN);
  if (fire && flood) return "COMBINED";
  if (fire)          return "FIRE";
  if (flood)         return "FLOOD";
  return "NORMAL";
}

int rankVal(int val, int w, int h, int c) {
  if (val >= c) return 3;
  if (val >= h) return 2;
  if (val >= w) return 1;
  return 0;
}

const char* classifyRiskLevel(float temp, int smoke, int water, int rain) {
  int fireRank  = max(rankVal(smoke, FIRE_SMOKE_WARN, FIRE_SMOKE_HIGH, FIRE_SMOKE_CRIT),
                       rankVal((int)temp, (int)FIRE_TEMP_WARN, (int)FIRE_TEMP_HIGH, (int)FIRE_TEMP_CRIT));
  int floodRank = max(rankVal(water, FLOOD_WATER_WARN, FLOOD_WATER_HIGH, FLOOD_WATER_CRIT),
                       3 - rankVal(rain, FLOOD_RAIN_WARN, FLOOD_RAIN_HIGH, FLOOD_RAIN_CRIT));
  int worst = max(fireRank, floodRank);
  if (worst >= 3) return "CRITICAL";
  if (worst == 2) return "HIGH";
  if (worst == 1) return "WARNING";
  return "NORMAL";
}

// ---------------------------------------------------------------------------
// Print one complete reading block in the format the server parser expects
// ---------------------------------------------------------------------------
void printBlock(float temp, float humidity, int smoke, int rain, int water,
                const char* riskType, const char* riskLevel) {
  Serial.println("---------------------------------");
  Serial.print("Temperature : "); Serial.print(temp, 2);   Serial.println(" C");
  Serial.print("Humidity    : "); Serial.print(humidity, 2); Serial.println(" %");
  Serial.print("Smoke       : "); Serial.println(smoke);
  Serial.print("Rain        : "); Serial.println(rain);
  Serial.print("Water       : "); Serial.println(water);
  Serial.println();
  Serial.print("Risk Type   : "); Serial.println(riskType);
  Serial.print("Risk Level  : "); Serial.println(riskLevel);
  Serial.println("---------------------------------");
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  dht.begin();
  analogReadResolution(12);   // 0–4095 range
  delay(500);                 // let DHT22 stabilise
}

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------
void loop() {
  unsigned long now = millis();

  // --- Sensor reading + block print (every 2 s) ---
  if (now - lastSensorTime >= SENSOR_INTERVAL_MS) {
    lastSensorTime = now;

    float temp    = dht.readTemperature();          // °C
    float humidity = dht.readHumidity();             // %
    int   smoke   = analogRead(SMOKE_PIN);           // 0–4095 raw
    int   rain    = analogRead(RAIN_PIN);            // 0–4095 inverted
    int   water   = analogRead(WATER_PIN);           // 0–4095 raw

    // Guard against NaN from DHT22
    if (isnan(temp))    temp    = 0.0;
    if (isnan(humidity)) humidity = 0.0;

    const char* riskType  = classifyRiskType(temp, smoke, water, rain);
    const char* riskLevel = classifyRiskLevel(temp, smoke, water, rain);

    printBlock(temp, humidity, smoke, rain, water, riskType, riskLevel);
  }

  // --- STATUS : ALIVE heartbeat (every 30 s) ---
  if (now - lastAliveTime >= ALIVE_INTERVAL_MS) {
    lastAliveTime = now;
    Serial.println("STATUS : ALIVE");
  }
}