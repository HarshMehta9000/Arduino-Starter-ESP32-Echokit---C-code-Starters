# Arduino Smart LED Controller (Arduino + C++)

# Arduino LED Controller

A simple Arduino project to control an LED using a button and a potentiometer.

## What it does

* Press the button to switch between:

  * LED always ON
  * LED blinking
* Use the potentiometer to control how fast the LED blinks

## Demo

(Add a picture or GIF here later)

## Components Used

* Arduino Uno
* LED
* 220Ω resistor
* Push button
* Potentiometer (10kΩ)

## Circuit

* LED → Pin 13
* Button → Pin 2
* Potentiometer → A0

## How to Run

1. Open Arduino IDE
2. Open `smart_led.ino`
3. Select **Arduino Uno**
4. Click Upload

## Code

The code is written in Arduino (which is based on C++).

* `smart_led.ino` → Arduino version (easy to read)
* `smart_led.cpp` → same logic in standard C++

## What I learned

* How to control LED using Arduino
* How to read button input
* How to use analog input (potentiometer)
* How to avoid delay() using millis()

## Author

Harsh Mehta


## Overview

This project demonstrates how Arduino is built on top of C++ while simplifying development through `.ino` files.

It combines multiple core embedded concepts into one clean project:

* Non-blocking LED blinking using `millis()`
* Button-based mode switching
* Analog input using a potentiometer
* Serial logging for debugging

---

## Why this project matters

Most beginners only write `.ino` files without understanding that Arduino is actually C++.

This project shows both:

* The simplified Arduino version (`.ino`)
* The equivalent embedded C++ version (`.cpp`)

This makes it useful for transitioning from Arduino to real embedded systems or frameworks like PlatformIO.

---

## Arduino vs C++

### Arduino (.ino)

* Simplified C++ abstraction
* No need to include headers manually
* Function prototypes are auto-generated
* Easier and faster for beginners

### C++ (.cpp)

* Standard embedded C++
* Requires `#include <Arduino.h>`
* Manual structure and declarations
* Used in professional environments (PlatformIO, embedded systems)

### Important

Arduino internally converts `.ino` → `.cpp` before compiling.

---

## Features

### 1. Non-blocking LED Control

Uses `millis()` instead of `delay()` to allow smooth multitasking.

### 2. Button-Based Mode Switching

* Toggle between:

  * Always ON mode
  * Blinking mode

### 3. Potentiometer Speed Control

* Adjust blink interval dynamically (100ms to 1000ms)

### 4. Serial Monitoring

* Real-time logging for debugging and visibility

---

## Project Structure

```
arduino-smart-led-v2/
│── README.md
│── src/
│   ├── smart_led.ino     # Arduino version
│   └── smart_led.cpp     # Pure C++ version
```

---

## Components Required

* Arduino Uno
* LED + resistor (220Ω recommended)
* Push button
* Potentiometer (10kΩ)

---

## How to Run

### Arduino IDE

1. Open Arduino IDE
2. Load `smart_led.ino`
3. Select board (Arduino Uno)
4. Upload code

### PlatformIO / C++

1. Use `smart_led.cpp`
2. Ensure Arduino framework is installed
3. Build and upload

---

## Concepts Demonstrated

* Non-blocking programming (`millis`)
* Digital input/output
* Analog input processing
* State-based logic
* Embedded C++ structure

---

## Future Improvements

* Interrupt-based button handling
* OLED display integration
* ESP32 WiFi dashboard
* IoT logging system

---

## Author

Harsh Mehta
