# Howling Whispers Analog

A browser-based virtual analog synthesizer and sound laboratory for The Howling Whispers ecosystem.

## First working concept

The `dev` branch now contains the first playable prototype:

- 3 oscillators with saw, square, and triangle waveforms
- individual oscillator level and detune controls
- resonant low-pass filter
- drive/saturation stage
- ADSR amplitude envelope
- filter LFO
- master output
- one-octave on-screen keyboard
- computer keyboard control using `A W S E D F T G Y H U J K`
- shared patch data model intended to become the contract between the website and future native/VST3 builds

The visual direction follows the dark celestial copper language of the main Howling Whispers landing experience, but presents it as a compact hardware-inspired synth panel.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Then open the Vite URL and click/play a key to arm the browser audio engine.

## Build

```bash
npm run build
```

## Architecture direction

The browser prototype currently uses the Web Audio API directly so we can prove the control surface and synthesis model quickly.

The next major architecture step is to move the DSP contract behind a shared engine boundary suitable for:

1. Browser AudioWorklet/WASM execution.
2. A native plugin host.
3. VST3 integration with FL Studio.
4. A common `.hwapatch` preset format across browser and plugin builds.

The long-term goal is one instrument identity with two hosts: web and DAW.
