// Arduino .ino version (C++ under the hood)

const int ledPin = 13;
const int buttonPin = 2;
const int potPin = A0;

bool ledState = LOW;
bool lastButtonState = LOW;
bool modeToggle = false;

unsigned long previousMillis = 0;
int interval = 500;

void setup() {
  pinMode(ledPin, OUTPUT);
  pinMode(buttonPin, INPUT);
  Serial.begin(9600);
}

void loop() {
  int buttonState = digitalRead(buttonPin);

  if (buttonState == HIGH && lastButtonState == LOW) {
    modeToggle = !modeToggle;
    delay(50);
  }
  lastButtonState = buttonState;

  int potValue = analogRead(potPin);
  interval = map(potValue, 0, 1023, 100, 1000);

  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    if (modeToggle) {
      ledState = !ledState;
    } else {
      ledState = HIGH;
    }
    digitalWrite(ledPin, ledState);
  }

  static unsigned long lastLog = 0;
  if (millis() - lastLog >= 1000) {
    lastLog = millis();
    Serial.println(interval);
  }
}
