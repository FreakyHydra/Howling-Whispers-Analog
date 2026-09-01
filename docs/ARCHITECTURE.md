# Howling Whispers Analog architecture

Analog is intentionally modular from the first working concept. The project must not grow into a single application file that owns rendering, DSP, input, sequencing, MIDI, storage, and host integration at once.

## Hard rule

`src/main.ts` is a bootstrap file only. It imports global styles, starts the application, and nothing else.

The architecture guard currently limits:

- `src/main.ts` to 40 lines
- every other TypeScript module to 300 lines

If a module reaches the limit, split it by responsibility instead of increasing the limit casually.

## Current boundaries

```text
src/
  main.ts                 bootstrap only
  app.ts                  application composition
  patch.ts                portable synth/patch state

  audio/
    synth-engine.ts        Web Audio synthesis and DSP

  input/
    performance.ts         computer and on-screen keyboard input
    midi.ts                future Web MIDI input

  ui/
    markup.ts              view markup
    patch-controls.ts      UI-to-patch bindings
    format.ts              display formatting
```

## Planned boundaries

New systems get their own modules/directories rather than being appended to `main.ts` or `app.ts`:

```text
midi/ or input/            MIDI devices, CC learn, pitch bend, pedals
sequencer/                 motion and note sequencing
presets/                   patch save/load/import/export
transport/                 tempo, clock, play/stop and host sync
recording/                 MIDI/audio capture
projects/                  future DAW project state
mixer/                     future DAW routing and buses
maestro/                   future Coda Maestro command layer
plugin/                    shared contracts for VST3/CLAP/native hosts
```

## Shared-engine rule

UI code must not become the synth engine. Patch state and audio behavior stay independent enough that the same concepts can later be reused by:

- the browser instrument
- a VST3/CLAP plugin
- the future Howling Whispers DAW
- Coda Maestro automation

The browser interface is one client of the instrument, not the instrument itself.
