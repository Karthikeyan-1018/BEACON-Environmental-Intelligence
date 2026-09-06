/*
 * =========================================================================
 * BEACON Base Station ESP32 Firmware
 * Problem Statement: SIH26178 (Qualcomm) - Disaster Management Network
 * Hardware: ESP32 + LoRa SX1278 (RA-02) 433MHz + Buzzer + Status LED
 * =========================================================================
 *
 * Description:
 * Receives LoRa telemetry packets from the Edge Node (DHT22, MQ-2, Water Level, Rain).
 * Evaluates risk status locally for immediate hardware response (Buzzer & LED),
 * and streams standardized JSON over USB Serial (115200 baud) to the laptop backend.
 */

#include <SPI.h>
#include <LoRa.h>
#include <ArduinoJson.h> // ArduinoJson v6 or v7

// LoRa SX1278 Pin Definitions for ESP32
#define LORA_SS    5
#define LORA_RST   14
#define LORA_DIO0  2
#define LORA_FREQ  433E6 // 433 MHz (Standard LoRa frequency for India/Asia)

// Hardware Output Pins
#define BUZZER_PIN 25
#define LED_GREEN  26
#define LED_RED    27

// Fixed Node Location (SKCET Campus)
const char* NODE_ID = "N1-SKCET";
const char* LOCATION = "SKCET Campus, Coimbatore";
const float FIXED_LAT = 10.9366;
const float FIXED_LON = 76.9558;

void setup() {
  Serial.begin(115200);
  while (!Serial && millis() < 3000);

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_RED, OUTPUT);

  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(LED_GREEN, HIGH);
  digitalWrite(LED_RED, LOW);

  // Initialize SPI & LoRa
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
  if (!LoRa.begin(LORA_FREQ)) {
    Serial.println("{\"status\":\"error\",\"message\":\"LoRa SX1278 init failed\"}");
    // Beep error pattern
    for (int i = 0; i < 3; i++) {
      digitalWrite(BUZZER_PIN, HIGH);
      delay(100);
      digitalWrite(BUZZER_PIN, LOW);
      delay(100);
    }
  } else {
    LoRa.setSpreadingFactor(7);
    LoRa.setSignalBandwidth(125E3);
    LoRa.setCodingRate4(5);
    LoRa.setSyncWord(0xF3); // BEACON sync word
    Serial.println("{\"status\":\"ready\",\"message\":\"LoRa SX1278 receiver initialized at 433MHz\"}");
  }
}

void loop() {
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    String incomingPayload = "";
    while (LoRa.available()) {
      incomingPayload += (char)LoRa.read();
    }

    // Parse packet from edge node
    StaticJsonDocument<384> doc;
    DeserializationError error = deserializeJson(doc, incomingPayload);

    if (!error) {
      float water_level = doc["water_level"] | 0.0;
      float temp = doc["temp"] | 0.0;
      float humidity = doc["humidity"] | 0.0;
      int smoke = doc["smoke"] | 0;
      float rainfall = doc["rainfall"] | 0.0;

      // Local Edge Risk Assessment
      String risk_level = "low";
      float confidence = 0.94;

      if (water_level > 70.0 || smoke > 600 || rainfall > 45.0 || temp > 48.0) {
        risk_level = "high";
        confidence = 0.96;
        triggerAlarm(true);
      } else if (water_level > 40.0 || smoke > 350 || rainfall > 20.0 || temp > 39.0) {
        risk_level = "medium";
        confidence = 0.88;
        triggerWarning();
      } else {
        triggerAlarm(false);
      }

      // Construct forwarded JSON packet to laptop serial
      StaticJsonDocument<512> forwardDoc;
      forwardDoc["node_id"] = NODE_ID;
      forwardDoc["location"] = LOCATION;
      forwardDoc["lat"] = FIXED_LAT;
      forwardDoc["lon"] = FIXED_LON;
      forwardDoc["water_level"] = water_level;
      forwardDoc["temp"] = temp;
      forwardDoc["humidity"] = humidity;
      forwardDoc["smoke"] = smoke;
      forwardDoc["rainfall"] = rainfall;
      forwardDoc["risk_level"] = risk_level;
      forwardDoc["confidence"] = confidence;
      forwardDoc["rssi"] = LoRa.packetRssi();
      forwardDoc["snr"] = LoRa.packetSnr();
      forwardDoc["timestamp"] = "LIVE";

      serializeJson(forwardDoc, Serial);
      Serial.println(); // CR/LF delimiter for parser
    }
  }
}

void triggerAlarm(bool active) {
  if (active) {
    digitalWrite(BUZZER_PIN, HIGH);
    digitalWrite(LED_RED, HIGH);
    digitalWrite(LED_GREEN, LOW);
  } else {
    digitalWrite(BUZZER_PIN, LOW);
    digitalWrite(LED_RED, LOW);
    digitalWrite(LED_GREEN, HIGH);
  }
}

void triggerWarning() {
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(LED_RED, HIGH);
  digitalWrite(LED_GREEN, HIGH); // Amber combination
}
