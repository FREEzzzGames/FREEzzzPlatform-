export type MidiSoundPreset = {
  id: string;
  name: string;
  family: "synth" | "keys" | "bass" | "pad" | "pluck";
  wave: OscillatorType;
  attack: number;
  release: number;
  filter: number;
  resonance: number;
  detune: number;
  description: string;
};

export const MIDI_SOUND_PRESETS: readonly MidiSoundPreset[] = [
  { id:"studio-piano", name:"Studio Piano", family:"keys", wave:"triangle", attack:.004, release:.32, filter:5200, resonance:1.2, detune:0, description:"Clean keyboard tone" },
  { id:"bright-piano", name:"Bright Piano", family:"keys", wave:"triangle", attack:.003, release:.24, filter:7600, resonance:.8, detune:0, description:"Bright attack" },
  { id:"warm-keys", name:"Warm Keys", family:"keys", wave:"sine", attack:.012, release:.42, filter:3200, resonance:.7, detune:-2, description:"Soft rounded keys" },
  { id:"analog-lead", name:"Analog Lead", family:"synth", wave:"sawtooth", attack:.012, release:.18, filter:4800, resonance:3.5, detune:4, description:"Focused mono-style lead" },
  { id:"soft-lead", name:"Soft Lead", family:"synth", wave:"triangle", attack:.025, release:.28, filter:4200, resonance:2, detune:2, description:"Smooth melodic lead" },
  { id:"digital-lead", name:"Digital Lead", family:"synth", wave:"square", attack:.004, release:.14, filter:6200, resonance:1.5, detune:0, description:"Crisp digital lead" },
  { id:"sub-bass", name:"Sub Bass", family:"bass", wave:"sine", attack:.012, release:.26, filter:900, resonance:1.1, detune:-3, description:"Deep low end" },
  { id:"saw-bass", name:"Saw Bass", family:"bass", wave:"sawtooth", attack:.008, release:.18, filter:1700, resonance:2.2, detune:-2, description:"Punchy analog bass" },
  { id:"glass-pad", name:"Glass Pad", family:"pad", wave:"sine", attack:.18, release:.85, filter:5400, resonance:1.4, detune:7, description:"Slow ambient layer" },
  { id:"space-pad", name:"Space Pad", family:"pad", wave:"triangle", attack:.25, release:1.15, filter:3600, resonance:2.4, detune:-7, description:"Wide atmospheric tone" },
  { id:"soft-pluck", name:"Soft Pluck", family:"pluck", wave:"triangle", attack:.002, release:.18, filter:6800, resonance:2.5, detune:1, description:"Short melodic pluck" },
  { id:"square-pluck", name:"Square Pluck", family:"pluck", wave:"square", attack:.002, release:.12, filter:5000, resonance:1.8, detune:0, description:"Retro percussive synth" }
];

export const MIDI_UI_SOUND_CATALOG = [
  { id:"kenney-ui", name:"Kenney UI SFX", source:"OpenGameArt", license:"CC0", sourceUrl:"https://opengameart.org/content/51-ui-sound-effects-buttons-switches-and-clicks", description:"51 CC0 clicks, rollovers and switches." },
  { id:"robin-ui", name:"UI Feedback SFX", source:"OpenGameArt", license:"CC0", sourceUrl:"https://opengameart.org/content/ui-sound-effects-button-clicks-user-feedback-notifications", description:"CC0 clicks, selections, notifications and feedback." }
] as const;

const PRESET_KEY = "freezzz:midi:preset";
const UI_SOUND_KEY = "freezzz:midi:ui-sound";

export function loadMidiPresetId(): string {
  try { return localStorage.getItem(PRESET_KEY) || MIDI_SOUND_PRESETS[0].id; } catch { return MIDI_SOUND_PRESETS[0].id; }
}
export function saveMidiPresetId(id: string): void {
  try { localStorage.setItem(PRESET_KEY, id); } catch {}
}
export function loadMidiUiSoundId(): string {
  try { return localStorage.getItem(UI_SOUND_KEY) || "kenney-ui"; } catch { return "kenney-ui"; }
}
export function saveMidiUiSoundId(id: string): void {
  try { localStorage.setItem(UI_SOUND_KEY, id); } catch {}
}
