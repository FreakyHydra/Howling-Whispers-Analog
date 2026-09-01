# Howling Whispers Analog - Modular Workstation Plan

Status: Planning only. Implementation is paused until this plan is accepted.

## 1. Product direction

Analog should evolve from a synth page with attached sequencers into a small browser-based modular music workstation.

The core rule is simple:

> Audio, transport, sequencing, and module state must continue independently of whatever screen the user is currently viewing.

Navigation changes the view only. It must never stop playback, reset a sequencer, desync a module, or destroy module state.

## 2. Core architecture principles

### 2.1 One persistent audio engine

Analog should use one application-owned audio engine and one shared AudioContext.

All instruments, sequencers, drums, effects, and buses connect through that engine instead of each creating their own independent playback clock.

Target signal flow:

```text
Instrument / Drum / Chip modules
        |
        v
Per-module gain / optional insert FX
        |
        v
Module buses
        |
        v
Master compressor
        |
        v
Master limiter
        |
        v
AudioContext destination
```

### 2.2 One persistent master transport

The master transport owns:

- Play
- Stop
- BPM
- Swing
- Bar
- Beat
- Step position
- Sync state
- Quantized start / join rules
- Panic / all-stop

Every synced module uses this transport.

### 2.3 Navigation does not own playback

Screens and workspaces are views only.

Example:

- Beat sequencer is playing.
- Bass sequencer is playing.
- Lead sequencer is playing.
- User switches to the Mixer screen.
- All three continue playing and remain synced.

No screen change may implicitly call stop, panic, reset, or re-arm an audio engine.

## 3. Master transport

The transport should remain visible regardless of workspace.

Suggested controls:

```text
PLAY | STOP | BPM 140 | SWING 12% | SYNC ON | BAR 03:02 | PANIC
```

### 3.1 Master Play

Master Play starts every armed / active synced module together from the same transport position.

### 3.2 Master Stop

Master Stop stops all sequencers together.

Possible later option:

- Immediate stop
- Stop at end of bar

### 3.3 Module-level play controls

Individual modules may still have:

- Arm
- Mute
- Solo
- Local play / stop where useful

However, when SYNC is enabled, starting a module while the master transport is already running must make it join on a quantized boundary instead of starting at an arbitrary time.

Default join behavior should be next bar unless testing shows next beat feels better.

### 3.4 Sync behavior

SYNC defaults to ON.

When enabled:

- Beat, synth, 808, chip, and future sequencers share tempo.
- They share the same transport phase.
- BPM changes apply globally.
- Swing changes apply globally unless a future module explicitly supports local swing.
- A newly started module joins on a musical boundary.
- Re-enabling sync should rejoin cleanly rather than jumping in the middle of a step.

SYNC OFF allows free-running experimental behavior.

## 4. Audio safety and quality

Audio quality is Phase 1 because the current clipping / distortion issue must be fixed before adding more instruments.

### 4.1 Synth gain staging

The synth must stop relying on full-level oscillator summing.

Plan:

- Add headroom before oscillator / voice summing.
- Scale or compensate gain as overlapping voices accumulate.
- Ensure release envelopes actually decay old notes instead of leaving excessive summed energy.
- Add voice stealing where a voice limit is reached.
- Keep intentional saturation separate from accidental digital clipping.

### 4.2 Synth output chain

Recommended synth chain:

```text
Oscillators
 -> voice envelope
 -> voice / polyphony gain compensation
 -> filter
 -> musical saturation / drive
 -> synth bus
 -> safety dynamics
 -> master bus
```

### 4.3 Master compressor

The master compressor is for dynamic control, not clipping repair.

Initial controls if exposed later:

- Threshold
- Ratio
- Attack
- Release
- Makeup gain

A hidden safe default compressor may exist even before the UI module is exposed.

### 4.4 Master limiter

A limiter is mandatory as the final safety wall.

Target ceiling should stay below full scale, approximately -1 dBFS.

The limiter must be a safety device, not something that is continuously crushed by an overdriven mix.

### 4.5 Stress tests

Audio acceptance tests should include:

- Multiple overlapping notes
- Long release times
- High filter resonance
- Maximum oscillator levels
- Fast sequencer retriggering
- Repeated 808 notes
- Drums plus multiple synth sequencers
- Effects engaged
- Rapid BPM changes
- Panic during dense playback

## 5. Modular workstation system

### 5.1 Module Bay

Analog gets a Module Bay / Add Module control.

Example:

```text
+ ADD MODULE
```

Initial module families:

- Rhythm Sequencer
- Synth Sequencer
- 808 Bass Machine
- Chip Synth
- Compressor
- Chorus
- Phaser
- Bit Crusher

Future candidates:

- Arpeggiator
- Chord Sequencer
- Sampler
- Delay
- Reverb
- Distortion
- EQ
- LFO module
- Mixer
- Oscilloscope
- Spectrum analyzer

### 5.2 Add, remove, bypass, duplicate

Modules should eventually support:

- Add
- Remove from workspace
- Bypass
- Duplicate
- Reset

Important rule:

Removing a module from the visible workspace must not automatically destroy its pattern or settings.

Reset is the destructive action.

### 5.3 Module reordering

Desktop:

- Drag using a module title bar.

Touch / accessibility fallback:

- Move Up
- Move Down

Do not make drag the only way to rearrange modules.

### 5.4 Collapse and focus

Every large module should support:

- Collapse to title strip
- Expand
- Focus mode

Focus mode temporarily gives one module most of the workspace without stopping anything else.

## 6. Workspace / screen system

Trying to display every module at once will become unusable.

Analog should therefore use multiple workspaces while keeping the audio engine persistent.

Suggested workspaces:

- SYNTH
- SEQUENCERS
- MIXER
- FX
- CHIP
- DAW

Possible layout presets:

- PERFORMANCE
- COMPOSE
- MIX
- CHIP
- FULL RACK

### 6.1 Persistent status strip

A compact status strip can show what is active even when those modules are not visible.

Example:

```text
DRUMS ●   808 ●   BASS ●   LEAD ○   CHIP ●
```

### 6.2 Panning

Middle-mouse panning may exist for a large rack or free-layout mode.

It must be optional.

The user should never need to pan around just to find Play, Stop, BPM, Sync, or Panic.

### 6.3 Mobile / tablet behavior

Do not require free-floating windows on touch devices.

Preferred touch behavior:

- Single-column module flow
- Collapsible modules
- Workspace tabs
- Focus mode
- Move Up / Move Down controls
- Large touch targets

A later optional Free Layout mode can exist on desktop.

## 7. Sequencer redesign

### 7.1 Variable pattern length

Sequencers should no longer be hardcoded to 16 steps.

Initial lengths:

- 8
- 16
- 32
- 64

Possible later option:

- Custom 1-128

Different sequencers may use different lengths while sharing the same transport.

Example:

```text
Drums: 16 steps
Bass: 32 steps
Lead: 64 steps
```

They loop independently but stay clock-synced.

### 7.2 Multiple melodic sequencers

Users should be able to create more than one melodic sequencer.

Common use case:

- Bottom / bass line
- Top / lead melody

This should not be a special hardcoded two-sequencer mode. The module system should allow additional sequencer instances.

### 7.3 Step selection plus synth keyboard entry

Primary melodic workflow:

1. Select a sequencer step.
2. The selected step enters note-entry mode.
3. Press a key on the onscreen synth keyboard, computer keyboard, or later MIDI controller.
4. That note is assigned to the selected step.

Example:

```text
STEP 05 -> select -> press G -> STEP 05 = G4
```

If the step was REST, pressing a note automatically activates it.

This replaces the current awkward workflow where the note is mainly chosen with a numerical slider.

### 7.4 Quick toggle behavior

The sequencer should make active/rest toggling fast.

Candidate interaction:

- Single click: select step
- Double click: toggle active / rest

This needs testing on touch devices because double-click is not a universal mobile interaction.

A visible Activate / Rest button should remain available as an accessible fallback.

### 7.5 Detailed step properties

After selecting a step, detailed controls may include:

- Note
- Velocity
- Gate
- Accent
- Tie
- Slide
- Glide amount
- Vibrato
- Octave
- Duty / pulse width where applicable

The keyboard remains the primary note-entry method.

## 8. 808 Bass Machine redesign

The current 808 should be treated as prototype quality and rebuilt.

The 808 should become a musical bass instrument rather than simply a kick-like oscillator.

Planned controls:

- Tunable note / pitch
- Long decay
- Release
- Glide / slide
- Pitch envelope
- Transient / attack amount
- Tone / filtering
- Saturation / drive
- Output level
- Choke / voice behavior

### 8.1 Sequenced 808 pitch

808 sequencer steps should support different notes so the user can write an actual bassline.

### 8.2 Repeated-note handling

Repeated and overlapping 808 hits need intentional behavior so long decays do not create uncontrolled mud or clipping.

### 8.3 Separate Kick and 808 responsibilities

Kick remains the drum transient.

808 becomes the bass voice.

They should not be treated as interchangeable instruments.

## 9. Chip / bit music system

Analog should support deliberate chip-style music instead of merely putting a bitcrusher on the normal synth.

### 9.1 8-bit mode / chip engine

Primary voice types:

- Pulse / square 1
- Pulse / square 2
- Triangle bass
- Noise percussion

Key controls:

- Duty cycle / pulse width
- Monophonic mode
- Portamento
- Per-step pitch slide
- Vibrato rate
- Vibrato depth
- Fast retrigger
- Accent
- Octave jumps
- Arpeggio mode
- Short gate lengths
- Pitch envelope

This should support tracks such as:

> 8-bit chiptune with square and pulse synthesis, a monophonic lead, repetitive syncopated hook, rapid pitch slides, and vibrato.

### 9.2 16-bit inspired mode

Possible sound tools:

- FM synthesis
- Wavetables
- Short PCM samples
- Richer drums
- More polyphony

### 9.3 32-bit inspired mode

Possible sound tools:

- Cleaner sample synthesis
- Tracker-style instruments
- Looping samples
- Early digital reverb character
- Optional low-rate PCM crunch

The 8 / 16 / 32 labels are musical era / engine modes, not claims that bit depth alone defines those sounds.

## 10. Bit Crusher / DAC effect

Separate from the chip synth engine, Analog should offer a general-purpose degradation effect.

Possible controls:

- Bit depth: 4 / 6 / 8 / 12 / 16
- Sample rate reduction
- Dither
- Jitter
- Drive
- Wet / dry mix

Example routing:

```text
Moog -> Bit Crusher -> Compressor -> Delay -> Master
```

## 11. Chorus and phaser

Chorus and phaser should be reusable effect modules rather than permanently hardcoded into every oscillator.

### 11.1 Chorus

Candidate controls:

- Rate
- Depth
- Delay
- Feedback
- Mix
- Stereo width

### 11.2 Phaser

Candidate controls:

- Rate
- Depth
- Feedback
- Stages
- Center frequency
- Mix

### 11.3 Insert slots

A synth can expose quick insert slots such as:

```text
FX 1: CHORUS
FX 2: PHASER
```

Later, the same effects can become full rack modules and shared-bus effects.

## 12. Routing strategy

Do not begin with arbitrary cable routing.

Initial architecture should use:

- Instrument modules
- Per-module output bus
- Optional insert chain
- Master bus

Later routing can evolve into:

```text
Synth -> Chorus -> Phaser -> Compressor -> Master
Drums -> Distortion -> Compressor -> Master
```

The architecture should leave room for this without requiring it in the first modular release.

## 13. Project persistence

Analog should save the workstation, not just isolated loops.

Project state should eventually include:

- Active modules
- Removed but preserved modules
- Module order
- Workspace layout
- Collapsed / expanded state
- BPM
- Swing
- Sync state
- Transport preferences
- Beat patterns
- Melodic patterns
- Pattern lengths
- Synth patches
- 808 settings
- Chip settings
- Effect settings
- Mixer settings
- DAW arrangement

Opening the project should restore the machine as the user left it.

## 14. Implementation roadmap

### Phase 1 - Audio foundation

Goal: Make the current engine safe and good enough to build on.

Tasks:

- Fix clipping caused by overlapping notes.
- Add proper synth gain staging.
- Add headroom to oscillator summing.
- Add voice handling / stealing as needed.
- Add master compressor safety stage.
- Add final limiter.
- Rebuild the 808.
- Audit kick, snare, clap, and hat quality.
- Stress-test dense playback.

Exit criteria:

- No accidental digital clipping under normal maximum-use scenarios.
- Overlapping synth notes remain controlled.
- 808 sounds musically usable and does not behave like a broken kick.

### Phase 2 - Shared transport

Goal: Make Analog one synchronized machine.

Tasks:

- One shared AudioContext.
- One master transport.
- Master Play / Stop.
- BPM / Swing ownership moves to transport.
- Sync state.
- Quantized joining.
- Persistent transport across screens.
- Active-module status indicators.

Exit criteria:

- Beat and synth stay locked over long playback.
- Switching workspaces never stops or restarts audio.
- Master Play starts all armed modules together.
- Master Stop stops all transport-driven modules together.

### Phase 3 - Module framework

Goal: Turn major features into reusable workstation modules.

Tasks:

- Module registry.
- Module Bay / Add Module.
- Add / remove / bypass / reset model.
- Preserve removed module state.
- Reorder modules.
- Collapse / expand.
- Focus mode.
- Touch-safe reorder controls.

Initial modules:

- Rhythm Sequencer
- Synth Sequencer
- 808 Bass Machine

Exit criteria:

- Modules can be added and removed without state loss.
- Multiple melodic sequencer instances can exist.
- Desktop and mobile layouts remain usable.

### Phase 4 - Sequencer UX

Goal: Make writing music fast.

Tasks:

- 8 / 16 / 32 / 64 step lengths.
- Select step then press synth key to assign note.
- Keyboard / computer-key note entry.
- Double-click quick toggle with accessible fallback.
- Step properties: gate, velocity, accent, tie, slide.
- Different sequencer lengths remain synced.

Exit criteria:

- A user can program a melody without using a MIDI-number slider.
- Bass and lead patterns can run simultaneously.
- Different pattern lengths loop correctly against one shared transport.

### Phase 5 - Chip engine

Goal: Make real chip-style composition possible.

Tasks:

- Pulse / square voices.
- Duty cycle.
- Triangle bass.
- Noise channel.
- Monophonic lead behavior.
- Pitch slide.
- Vibrato.
- Arpeggio tools.
- 8-bit focused presets.
- 16-bit and 32-bit inspired engine options after 8-bit is solid.

### Phase 6 - Effects rack

Goal: Add reusable sound-shaping modules.

Tasks:

- Chorus.
- Phaser.
- Bit Crusher / DAC.
- User-facing compressor.
- Later delay / reverb / distortion / EQ.

### Phase 7 - Routing and mixer expansion

Goal: Allow more advanced signal flow without destabilizing the core workstation.

Tasks:

- Insert chains.
- Shared effect buses.
- Mixer channels.
- Optional advanced routing.

Do not start this phase until module lifecycle and master transport are stable.

## 15. Non-goals for the first modular release

Avoid these until the core is stable:

- Fully free-form cable patching
- Unlimited floating desktop windows
- Complex automation lanes everywhere
- Hundreds of plugin types
- Rebuilding the DAW and modular rack simultaneously
- Requiring mouse-only drag interactions

## 16. UX rules

1. Play, Stop, Sync, BPM, and Panic are always easy to reach.
2. Changing screens never changes playback state.
3. Removing a module is not the same as deleting its work.
4. The fast path for melodic note entry is: select step, press note.
5. Advanced controls exist without blocking simple workflows.
6. Desktop convenience must not make tablet / phone use impossible.
7. Audio safety comes before adding more generators.
8. Every sequencer uses the same master timing model when synced.
9. Multiple sequencers are normal, not a special exception.
10. The UI should expose only the controls relevant to the current workspace while the entire audio engine continues underneath.

## 17. Current decision summary

The current agreed direction is:

- Pause feature implementation while architecture is planned.
- Fix clipping and dynamics first.
- Introduce one master audio engine and shared transport.
- Add Master Play and Master Stop.
- Keep all modules playing and synchronized when changing screens.
- Make sequencers modular, removable, reorderable, collapsible, and reusable.
- Support multiple melodic sequencers for bass and lead simultaneously.
- Support 8 / 16 / 32 / 64 step patterns.
- Replace slider-first note entry with step selection plus synth-key note entry.
- Rebuild the 808 as a real bass voice.
- Add deliberate 8-bit / 16-bit / 32-bit inspired music tools.
- Add a separate Bit Crusher / DAC effect.
- Add chorus and phaser as reusable effects.
- Preserve module and project state across workspace changes and reloads.
- Keep advanced free-routing and free-layout behavior for later phases.
