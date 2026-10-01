export type MidiOutputInfo = { id: string; name: string; manufacturer?: string };
export type MidiInputInfo = { id: string; name: string; manufacturer?: string };

type Voice = {
  oscillator: OscillatorNode;
  filter: BiquadFilterNode;
  gain: GainNode;
};

const MIDI_MIN = 0;
const MIDI_MAX = 127;

function clamp(value: number, min = MIDI_MIN, max = MIDI_MAX): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export class WebMidiController {
  private access: MIDIAccess | null = null;
  private output: MIDIOutput | null = null;
  private input: MIDIInput | null = null;
  private channel = 0;
  private octave = 4;
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private activeVoices = new Map<number, Voice>();
  private ccValues = new Map<number, number>([
    [1, 0],
    [7, 100],
    [10, 64],
    [11, 127],
    [21, 92],
    [22, 28],
    [23, 32],
    [24, 64]
  ]);
  private audioEnabled = false;
  private inputHandler: ((event: MIDIMessageEvent) => void) | null = null;
  private onInputNote: ((note: number, velocity: number, pressed: boolean) => void) | null = null;

  async enableAudio(): Promise<boolean> {
    this.ensureAudio();
    if (!this.audioContext) return false;
    try {
      if (this.audioContext.state !== "running") await this.audioContext.resume();
      this.audioEnabled = this.audioContext.state === "running";
      return this.audioEnabled;
    } catch {
      this.audioEnabled = false;
      return false;
    }
  }

  async connect(): Promise<{ outputs: MidiOutputInfo[]; inputs: MidiInputInfo[] }> {
    await this.enableAudio();
    if (!("requestMIDIAccess" in navigator)) {
      throw new Error("Web MIDI is not available in this browser. Virtual sound remains available.");
    }

    this.access = await navigator.requestMIDIAccess();
    const outputs = [...this.access.outputs.values()];
    const inputs = [...this.access.inputs.values()];

    if (!this.output && outputs[0]) this.output = outputs[0];
    if (!this.input && inputs[0]) this.setInput(inputs[0].id);

    this.access.onstatechange = () => {
      if (this.output && this.access?.outputs.get(this.output.id) == null) {
        this.output = [...(this.access?.outputs.values() ?? [])][0] ?? null;
      }
      if (this.input && this.access?.inputs.get(this.input.id) == null) {
        this.input = null;
        this.detachInput();
      }
    };

    return {
      outputs: outputs.map(output => ({
        id: output.id,
        name: output.name || "MIDI Output",
        manufacturer: output.manufacturer || undefined
      })),
      inputs: inputs.map(input => ({
        id: input.id,
        name: input.name || "MIDI Input",
        manufacturer: input.manufacturer || undefined
      }))
    };
  }

  setOutput(id: string): void {
    if (!id) {
      this.output = null;
      return;
    }
    const output = this.access?.outputs.get(id);
    if (!output) throw new Error("MIDI output not found.");
    this.output = output;
  }

  setInput(id: string): void {
    this.detachInput();
    if (!id) return;
    const input = this.access?.inputs.get(id);
    if (!input) throw new Error("MIDI input not found.");
    this.input = input;
    this.inputHandler = event => this.handleIncomingMessage(event);
    input.onmidimessage = this.inputHandler;
  }

  setInputNoteHandler(handler: ((note: number, velocity: number, pressed: boolean) => void) | null): void {
    this.onInputNote = handler;
  }

  getOutput(): MidiOutputInfo | null {
    return this.output
      ? { id: this.output.id, name: this.output.name || "MIDI Output", manufacturer: this.output.manufacturer || undefined }
      : null;
  }

  getInput(): MidiInputInfo | null {
    return this.input
      ? { id: this.input.id, name: this.input.name || "MIDI Input", manufacturer: this.input.manufacturer || undefined }
      : null;
  }

  noteOn(note: number, velocity = 100): void {
    const midiNote = clamp(note, 0, 127);
    const midiVelocity = clamp(velocity);
    void this.enableAudio();
    this.send([0x90 | this.channel, midiNote, midiVelocity]);
    this.startVoice(midiNote, midiVelocity);
  }

  noteOff(note: number, velocity = 0): void {
    const midiNote = clamp(note, 0, 127);
    this.send([0x80 | this.channel, midiNote, clamp(velocity)]);
    this.stopVoice(midiNote);
  }

  triggerPad(note: number, velocity = 110): void {
    const midiNote = clamp(note, 0, 127);
    void this.enableAudio();
    this.send([0x99 | this.channel, midiNote, clamp(velocity)]);
    this.startPercussion(midiNote, clamp(velocity));
    window.setTimeout(() => this.send([0x89 | this.channel, midiNote, 0]), 80);
  }

  controlChange(controller: number, value: number): void {
    const cc = clamp(controller);
    const normalized = clamp(value);
    this.ccValues.set(cc, normalized);
    this.send([0xb0 | this.channel, cc, normalized]);
    this.applyControl(cc, normalized);
  }

  programChange(program: number): void {
    this.send([0xc0 | this.channel, clamp(program)]);
  }

  setChannel(channel: number): void {
    this.channel = Math.max(0, Math.min(15, Math.round(channel)));
  }

  getChannel(): number {
    return this.channel;
  }

  setOctave(octave: number): void {
    this.octave = Math.max(1, Math.min(7, Math.round(octave)));
  }

  getOctave(): number {
    return this.octave;
  }

  getCC(controller: number): number {
    return this.ccValues.get(controller) ?? 64;
  }

  isAudioEnabled(): boolean {
    return this.audioEnabled && this.audioContext?.state === "running";
  }

  getAudioState(): AudioContextState | "unavailable" | "idle" {
    if (!this.audioContext) {
      return typeof (globalThis as typeof globalThis & { AudioContext?: unknown }).AudioContext === "undefined"
        ? "unavailable"
        : "idle";
    }
    return this.audioContext.state;
  }

  private ensureAudio(): void {
    if (this.audioContext) return;

    const AudioContextCtor = globalThis.AudioContext ??
      (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    const context = new AudioContextCtor({ latencyHint: "interactive" });
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.knee.value = 18;
    compressor.ratio.value = 8;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.12;

    const master = context.createGain();
    master.gain.value = (this.getCC(7) / 127) * 0.32;
    master.connect(compressor);
    compressor.connect(context.destination);

    this.audioContext = context;
    this.masterGain = master;
    this.compressor = compressor;
  }

  private applyControl(controller: number, value: number): void {
    if (controller === 7 && this.masterGain) {
      this.masterGain.gain.setTargetAtTime((value / 127) * 0.32, this.audioContext?.currentTime ?? 0, 0.015);
    }

    for (const voice of this.activeVoices.values()) {
      if (controller === 21) {
        const cutoff = 180 + (value / 127) * 7600;
        voice.filter.frequency.setTargetAtTime(cutoff, this.audioContext?.currentTime ?? 0, 0.02);
      }
      if (controller === 22) {
        voice.filter.Q.setTargetAtTime(0.5 + (value / 127) * 12, this.audioContext?.currentTime ?? 0, 0.02);
      }
    }
  }

  private startVoice(note: number, velocity: number): void {
    this.ensureAudio();
    const context = this.audioContext;
    const master = this.masterGain;
    if (!context || !master) return;

    this.stopVoice(note);

    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();

    oscillator.type = "sawtooth";
    oscillator.frequency.value = 440 * Math.pow(2, (note - 69) / 12);
    filter.type = "lowpass";
    filter.frequency.value = 180 + (this.getCC(21) / 127) * 7600;
    filter.Q.value = 0.5 + (this.getCC(22) / 127) * 12;

    const attack = 0.008 + (this.getCC(23) / 127) * 0.35;
    const peak = Math.max(0.001, (velocity / 127) * 0.22);
    const now = context.currentTime;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + attack);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    oscillator.start(now);

    this.activeVoices.set(note, { oscillator, filter, gain });
  }

  private startPercussion(note: number, velocity: number): void {
    this.ensureAudio();
    const context = this.audioContext;
    const master = this.masterGain;
    if (!context || !master) return;

    const now = context.currentTime;
    const gain = context.createGain();
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();

    const isKick = note % 4 === 0;
    oscillator.type = isKick ? "sine" : "square";
    oscillator.frequency.setValueAtTime(isKick ? 150 : 90 + (note % 8) * 35, now);
    if (isKick) oscillator.frequency.exponentialRampToValueAtTime(52, now + 0.16);

    filter.type = "lowpass";
    filter.frequency.value = isKick ? 900 : 4200;
    const peak = Math.max(0.01, (velocity / 127) * 0.42);
    gain.gain.setValueAtTime(peak, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (isKick ? 0.2 : 0.12));

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    oscillator.start(now);
    oscillator.stop(now + (isKick ? 0.21 : 0.13));
  }

  private stopVoice(note: number): void {
    const voice = this.activeVoices.get(note);
    if (!voice || !this.audioContext) return;

    const now = this.audioContext.currentTime;
    const release = 0.03 + (this.getCC(24) / 127) * 0.45;

    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(Math.max(0.0001, voice.gain.gain.value), now);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + release);

    try {
      voice.oscillator.stop(now + release + 0.02);
    } catch {
      // The oscillator may already be scheduled to stop.
    }
    this.activeVoices.delete(note);
  }

  private handleIncomingMessage(event: MIDIMessageEvent): void {
    const data = event.data;
    if (!data || data.length < 2) return;
    const status = data[0] & 0xf0;
    const note = data[1] & 0x7f;
    const velocity = data[2] ?? 0;

    if (status === 0x90 && velocity > 0) {
      void this.enableAudio();
      this.startVoice(note, velocity);
      this.onInputNote?.(note, velocity, true);
      return;
    }

    if (status === 0x80 || (status === 0x90 && velocity === 0)) {
      this.stopVoice(note);
      this.onInputNote?.(note, velocity, false);
      return;
    }

    if (status === 0xb0 && data.length >= 3) {
      this.ccValues.set(note, velocity);
      this.applyControl(note, velocity);
    }
  }

  private detachInput(): void {
    if (this.input) this.input.onmidimessage = null;
    this.inputHandler = null;
  }

  private send(message: number[]): void {
    this.output?.send(message);
  }
}

export const MIDI_NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function midiNoteName(note: number): string {
  return `${MIDI_NOTE_NAMES[note % 12]}${Math.floor(note / 12) - 1}`;
}
