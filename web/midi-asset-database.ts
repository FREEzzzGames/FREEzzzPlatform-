export type MidiAssetLicense = "CC0";

export type MidiAssetItem = {
  id: string;
  name: string;
  category: "controller" | "control-icons" | "input-ui";
  source: string;
  sourceUrl: string;
  license: MidiAssetLicense;
  attributionRequired: boolean;
  description: string;
};

export const MIDI_ASSET_CATALOG: readonly MidiAssetItem[] = [
  {
    id: "oga-controller-icons",
    name: "Controller Icons",
    category: "controller",
    source: "OpenGameArt",
    sourceUrl: "https://opengameart.org/content/controller-icons",
    license: "CC0",
    attributionRequired: false,
    description: "Controller UI icons released under CC0."
  },
  {
    id: "oga-control-icons",
    name: "Control Icons",
    category: "control-icons",
    source: "OpenGameArt",
    sourceUrl: "https://opengameart.org/content/control-icons",
    license: "CC0",
    attributionRequired: false,
    description: "Low-resolution control icons for interface elements."
  },
  {
    id: "oga-cc0-gui",
    name: "CC0 Public Domain GUI Collection",
    category: "input-ui",
    source: "OpenGameArt",
    sourceUrl: "https://opengameart.org/content/cc0-public-domain-gui",
    license: "CC0",
    attributionRequired: false,
    description: "CC0 GUI collection containing input prompts, buttons and control UI."
  },
  {
    id: "commons-gamepad-idv",
    name: "Video Game Controller Icon",
    category: "controller",
    source: "Wikimedia Commons",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Video-Game-Controller-Icon-IDV-green.svg",
    license: "CC0",
    attributionRequired: false,
    description: "CC0 controller icon suitable for a controller library."
  },
  {
    id: "commons-paomedia-gamepad",
    name: "Small-n-flat Gamepad",
    category: "controller",
    source: "Wikimedia Commons",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Paomedia_small-n-flat_gamepad.svg",
    license: "CC0",
    attributionRequired: false,
    description: "CC0 gamepad icon from the small-n-flat icon set."
  },
  {
    id: "commons-gamepad-solid",
    name: "Gamepad Solid",
    category: "controller",
    source: "Wikimedia Commons",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Gamepad-solid.svg",
    license: "CC0",
    attributionRequired: false,
    description: "CC0 solid controller icon."
  }
];

const STORAGE_KEY = "freezzz:radio:midi-assets";

export function loadMidiAssetCollection(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function toggleMidiAssetCollection(id: string): string[] {
  const collection = new Set(loadMidiAssetCollection());
  if (collection.has(id)) collection.delete(id);
  else collection.add(id);
  const result = [...collection];
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(result)); } catch {}
  return result;
}
