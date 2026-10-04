// CLYF sleeve: samples the FSR and the MyoWare 2.0 envelope at a fixed rate and
// pushes every sample to the Python side over the Bridge.
//
// Wiring (everything at 3.3 V: A0/A1 are direct ADC inputs and not 5 V tolerant):
//   FSR:     A2 — FSR — A1 — 47 kΩ — GND     (A2 is driven HIGH as the FSR's 3.3 V
//            supply, which leaves the board's single 3V3 pin for the MyoWare. The FSR
//            draws well under 1 mA. 47 kΩ keeps FSR current under the
//            datasheet's 1 mA/cm² limit for this 4–5 mm active area)
//            Without the resistor A1 floats when the FSR is released: pressing still
//            raises the reading, but the released level drifts. Internal pull resistors
//            are no substitute here: on this board, a pin set to INPUT_PULLUP/PULLDOWN
//            is no longer seen by analogRead (measured on A0, A1 and A2).
//   MyoWare: VIN — 3.3V, GND — GND, ENV — A0

#include <Arduino_RouterBridge.h>

const int FSR_PIN = A1;
const int EMG_PIN = A0;
const int FSR_SUPPLY_PIN = A2;
// 100 Hz is ample for the ENV output, which the sensor already smooths. The Bridge
// link runs at 115200 baud; one sample is ~20 bytes, so this uses under a fifth of it.
const unsigned long PERIOD_US = 10000;

unsigned long next_us;
long seq = 0;

void setup() {
  Bridge.begin();
  analogReadResolution(12);  // 0–4095 across 0–3.3 V
  pinMode(FSR_SUPPLY_PIN, OUTPUT);
  digitalWrite(FSR_SUPPLY_PIN, HIGH);
  next_us = micros();
}

void loop() {
  unsigned long now = micros();
  if ((long)(now - next_us) < 0) return;
  next_us += PERIOD_US;
  // After a stall, resume on schedule instead of bursting to catch up; the
  // receiver sees the skipped sequence numbers as missing samples.
  if ((long)(now - next_us) > (long)PERIOD_US) {
    seq += (now - next_us) / PERIOD_US;
    next_us = now + PERIOD_US;
  }
  // One ADC is multiplexed across both pins, and its sampling capacitor keeps the
  // previous channel's charge. A high-impedance source (the FSR divider, or any
  // unconnected pin) cannot overwrite that charge in one conversion, so it echoes the
  // other channel. Discard one conversion per channel before keeping one.
  analogRead(FSR_PIN);
  int fsr = analogRead(FSR_PIN);
  analogRead(EMG_PIN);
  int emg = analogRead(EMG_PIN);
  Bridge.notify("sample", seq++, (long)(now / 1000), fsr, emg);
}
