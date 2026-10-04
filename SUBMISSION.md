# Devpost submission: CLYF

## Project name
CLYF

## Elevator pitch (≤200 characters)
A forearm sleeve for climbers: it reads your grip muscles with sEMG and tells you, like an ETA, when your forearms have recovered enough to climb on.

## About the project

## Inspiration
Every climber knows the pump: your forearms burn, your grip fades, and you hang off a jug shaking out, guessing when you are ready to go again. Rest too little and you fall off the next move. Rest too long and you waste the session. Navigation apps tell you when you will arrive. Nothing tells a climber when their forearms will be ready. I wanted to build that ETA.

## What it does
CLYF is a compression sleeve with surface EMG electrodes over the forearm flexors, the muscles that close your fingers on a hold. It turns grip effort into a **forearm battery** on screen:

- **On the wall:** when you grip hard, the battery drains in proportion to how far you are above a sustainable effort level.
- **Resting:** when you let go, it recharges and shows a countdown, for example *"Ready in 12 s"*.
- **Relax properly:** if your forearm is still tense while resting, the EMG sees it and recharging slows down. The screen tells you to relax fully.
- **Ready:** at 80% it glows and chimes: *"Climb on."*

A small force sensor marks when the hand is on the hold. Effort is shown as a percentage of your own hardest grip (%MVC), calibrated automatically as you go. The battery level is a model estimate and is labelled that way on screen; the muscle signal underneath it is measured.

## How I built it
- **Sensing:** MyoWare 2.0 muscle sensor with its cable shield, three electrodes on the forearm (two on the flexor belly, the reference on bone), inside a compression sleeve. A 4 mm FSR on the hold.
- **Sampling:** an Arduino UNO Q. Its STM32 microcontroller reads both channels at 100 Hz and passes every sample over the Arduino Bridge to Python on the board's Linux side, which streams them to the browser with Socket.IO. No samples were dropped in testing.
- **No Wi-Fi needed:** campus Wi-Fi blocks devices from talking to each other, so the laptop reaches the board over the USB cable through an ADB port forward.
- **Dashboard (JavaScript + Canvas):** smooths the EMG envelope, calibrates relaxed and maximal levels automatically, flags a broken signal (for example an electrode coming off) instead of trusting it, and runs the battery model. It drains above 30% MVC, refills with a 20 s time constant scaled by how relaxed you are, and is ready at 80%. The idea is borrowed from the W′-balance model used in endurance sport.

## Challenges I ran into
- **Getting a clean muscle signal.** The first sessions read a flat 3 V: the reference electrode was not on bone and the gain was too high. Placement, skin prep and gain tuning mattered more than any code.
- **A spiky envelope.** During a squeeze the signal jumps between 0.1 V and the sensor's 3 V ceiling within a second. Calibrating "max grip" from peaks made real grips read only 30–40%. Replaying recorded data offline, I switched to per-second averages and longer smoothing, which separated rest from effort cleanly.
- **No pull-down resistor for the FSR.** Without it the analog pin floats and echoes the neighbouring EMG channel. I tried the chip's internal pull resistors instead and measured that on the UNO Q they disconnect the pin from the ADC, so the FSR is used as an on/off contact switch for now.
- **Networking.** Campus Wi-Fi isolation and macOS AirPlay occupying port 7000 both had to be worked around. A planned Apple Watch link for wrist haptics was built but could not be installed on the watch over this network in time.

## Accomplishments that I'm proud of
- A real, end-to-end muscle signal: in one test the envelope averaged about 2.7 V during squeezes and about 1 V during rests, at 100 Hz with no dropped samples.
- A dashboard that stays honest: measured values and model estimates are kept separate on screen, and a bad signal is reported rather than turned into a number.
- Going from a bag of parts to a wearable demo in one weekend.

## What I learned
How much EMG depends on the physical setup (electrode placement, the reference on bone, gain), how an FSR voltage divider really behaves, and why a model's output has to be labelled as an estimate when the measurement under it is real.

## What's next for CLYF
- A haptic "ready" tap on the wrist, so climbers never have to look at a screen mid-route.
- Sampling the raw EMG to track its frequency content, a known marker of muscle fatigue.
- Fitting drain and recovery rates to each climber instead of demo defaults.
- A proper resistor for the FSR, a wireless link, and a tidier sleeve.

## Built with
Arduino UNO Q, MyoWare 2.0, EMG, FSR, C++ (Arduino), Python, JavaScript, Socket.IO, HTML5 Canvas, ADB

## Try it out
Project page with a playable, clearly labelled simulation of the battery: https://claude.ai/artifact/FNZKUQSPu8G8zLcaeK39UN (set sharing to public before submitting)
