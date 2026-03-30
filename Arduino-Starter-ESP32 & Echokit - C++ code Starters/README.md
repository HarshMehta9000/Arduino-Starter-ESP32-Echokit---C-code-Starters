# Arduino Smart LED Controller (C++ + Arduino)

## Overview
This project demonstrates how Arduino uses C++ under the hood while providing a simplified `.ino` interface.

It combines:
- LED blinking (non-blocking)
- Button-controlled mode switching
- Potentiometer-based speed control
- Serial logging

---

## Arduino vs C++

### Arduino (.ino)
- Simplified version of C++
- No need for `#include <Arduino.h>`
- Function prototypes auto-generated
- Easier for beginners

### C++ (.cpp)
- Standard embedded C++
- Requires explicit includes and structure
- Used in PlatformIO and advanced projects

👉 Internally, Arduino converts `.ino` → `.cpp` before compilation.

---

## Project Structure
```
arduino-smart-led-v2/
│── README.md
│── src/
│   ├── smart_led.ino
│   └── smart_led.cpp
```

---

## Components
- Arduino Uno
- LED + resistor
- Push button
- Potentiometer

---

## How to Run (Arduino IDE)
1. Open Arduino IDE
2. Open `smart_led.ino`
3. Select board (Arduino Uno)
4. Upload

---

## How to Run (C++ / PlatformIO)
1. Use `smart_led.cpp`
2. Ensure Arduino framework installed
3. Build & upload via PlatformIO

---

## Concepts Demonstrated
- millis() for non-blocking timing
- Digital input/output
- Analog input
- State management
- Embedded C++ structure
