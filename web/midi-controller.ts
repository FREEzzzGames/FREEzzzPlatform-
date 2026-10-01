export type MidiOutputInfo = { id: string; name: string; manufacturer?: string };

export class WebMidiController {
  private access: MIDIAccess | null = null;
  private output: MIDIOutput | null = null;
  private channel = 0;
  private octave = 4;
  private ccValues = new Map<number, number>();
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeVoices = new Map<number, { oscillator: OscillatorNode; gain: GainNode }>();

  async connect(): Promise<MidiOutputInfo[]> {
    this.ensureAudio();
    await this.resumeAudio();
    if (!("requestMIDIAccess" in navigator)) return [];
    this.access = await navigator.requestMIDIAccess();
    const outputs = [...this.access.outputs.values()];
    if (!this.output && outputs[0]) this.output = outputs[0];
    return outputs.map(output => ({ id: output.id, name: output.name || "MIDI Output", manufacturer: output.manufacturer || undefined }));
  }

  setOutput(id: string): void {
    const output = this.access?.outputs.get(id);
    if (!output) throw new Error("MIDI output not found.");
    this.output = output;
  }

  getOutput(): MidiOutputInfo | null {
    return this.output ? { id: this.output.id, name: this.output.name || "MIDI Output", manufacturer: this.output.manufacturer || undefined } : null;
  }

  noteOn(note: number, velocity = 100): void {
    void this.resumeAudio();
    this.send([0x90 | this.channel, note & 0x7f, velocity & 0x7f]);
    this.startVoice(note, velocity);
  }

  noteOff(note: number, velocity = 0): void {
    this.send([0x80 | this.channel, note & 0x7f, velocity & 0x7f]);
    this.stopVoice(note);
  }

  controlChange(controller: number, value: number): void {
    const normalized = Math.max(0, Math.min(127, Math.round(value)));
    this.ccValues.set(controller, normalized);
    this.send([0xb0 | this.channel, controller & 0x7f, normalized]);
    if (controller === 7) {
      this.ensureAudio();
      this.masterGain!.gain.value = normalized / 127 * 0.22;
    }
  }

  programChange(program: number): void { this.send([0xc0 | this.channel, program & 0x7f]); }
  setChannel(channel: number): void { this.channel = Math.max(0, Math.min(15, channel)); }
  setOctave(octave: number): void { this.octave = Math.max(1, Math.min(7, octave)); }
  getOctave(): number { return this.octave; }
  getCC(controller: number): number { return this.ccValues.get(controller) ?? 64; }

  private ensureAudio(): void {
    if (this.audioContext) return;
    const AudioContextCtor = globalThis.AudioContext ?? (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const context = new AudioContextCtor();
    const gain = context.createGain();
    gain.gain.value = (this.ccValues.get(7) ?? 100) / 127 * 0.22;
    gain.connect(context.destination);
    this.audioContext = context;
    this.masterGain = gain;
  }

  private async resumeAudio(): Promise<void> {
    this.ensureAudio();
    if (this.audioContext?.state === "suspended") await this.audioContext.resume();
  }

  private startVoice(note: number, velocity: number): void {
    this.ensureAudio();
    const context = this.audioContext;
    const master = this.masterGain;
    if (!context || !master) return;

    this.stopVoice(note);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.value = 440 * Math.pow(2, (note - 69) / 12);

    const peak = Math.max(0.001, (velocity / 127) * 0.18);
    const now = context.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.015);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(now);
    this.activeVoices.set(note, { oscillator, gain });
  }

  private stopVoice(note: number): void {
    const voice = this.activeVoices.get(note);
    if (!voice || !this.audioContext) return;
    const now = this.audioContext.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(Math.max(0.0001, voice.gain.gain.value), now);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    voice.oscillator.stop(now + 0.07);
    this.activeVoices.delete(note);
  }

  private send(message: number[]): void {
    this.output?.send(message);
  }
}

export const MIDI_NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export function midiNoteName(note: number): string {
  return `${MIDI_NOTE_NAMES[note % 12]}${Math.floor(note / 12) - 1}`;
}
