export type VirtualConsoleType = "sega-megadrive-3" | "sega-megadrive-6" | "nes" | "snes";

type ButtonSpec = { id:string; label:string; className:string; key:string };

export const CONTROLLER_PROFILES: Record<VirtualConsoleType,{name:string;buttons:ButtonSpec[]}> = {
  "sega-megadrive-3": { name:"SEGA Mega Drive · 3 Button", buttons:[
    {id:"up",label:"▲",className:"dpad-up",key:"ArrowUp"},{id:"down",label:"▼",className:"dpad-down",key:"ArrowDown"},
    {id:"left",label:"◀",className:"dpad-left",key:"ArrowLeft"},{id:"right",label:"▶",className:"dpad-right",key:"ArrowRight"},
    {id:"a",label:"A",className:"sega-a",key:"KeyS"},{id:"b",label:"B",className:"sega-b",key:"KeyA"},{id:"c",label:"C",className:"sega-c",key:"KeyD"},
    {id:"start",label:"START",className:"sega-start",key:"Enter"}
  ]},
  "sega-megadrive-6": { name:"SEGA Mega Drive · 6 Button", buttons:[
    {id:"up",label:"▲",className:"dpad-up",key:"ArrowUp"},{id:"down",label:"▼",className:"dpad-down",key:"ArrowDown"},
    {id:"left",label:"◀",className:"dpad-left",key:"ArrowLeft"},{id:"right",label:"▶",className:"dpad-right",key:"ArrowRight"},
    {id:"x",label:"X",className:"sega-x",key:"KeyQ"},{id:"y",label:"Y",className:"sega-y",key:"KeyW"},{id:"z",label:"Z",className:"sega-z",key:"KeyE"},
    {id:"a",label:"A",className:"sega-a",key:"KeyS"},{id:"b",label:"B",className:"sega-b",key:"KeyA"},{id:"c",label:"C",className:"sega-c",key:"KeyD"},
    {id:"mode",label:"MODE",className:"sega-mode",key:"ShiftLeft"},{id:"start",label:"START",className:"sega-start",key:"Enter"}
  ]},
  "nes": { name:"Nintendo Entertainment System", buttons:[
    {id:"up",label:"▲",className:"dpad-up",key:"ArrowUp"},{id:"down",label:"▼",className:"dpad-down",key:"ArrowDown"},
    {id:"left",label:"◀",className:"dpad-left",key:"ArrowLeft"},{id:"right",label:"▶",className:"dpad-right",key:"ArrowRight"},
    {id:"b",label:"B",className:"nes-b",key:"KeyA"},{id:"a",label:"A",className:"nes-a",key:"KeyS"},
    {id:"select",label:"SELECT",className:"nes-select",key:"ShiftLeft"},{id:"start",label:"START",className:"nes-start",key:"Enter"}
  ]},
  "snes": { name:"Super Nintendo", buttons:[
    {id:"up",label:"▲",className:"dpad-up",key:"ArrowUp"},{id:"down",label:"▼",className:"dpad-down",key:"ArrowDown"},
    {id:"left",label:"◀",className:"dpad-left",key:"ArrowLeft"},{id:"right",label:"▶",className:"dpad-right",key:"ArrowRight"},
    {id:"y",label:"Y",className:"snes-y",key:"KeyA"},{id:"x",label:"X",className:"snes-x",key:"KeyS"},
    {id:"b",label:"B",className:"snes-b",key:"KeyD"},{id:"a",label:"A",className:"snes-a",key:"KeyF"},
    {id:"select",label:"SELECT",className:"snes-select",key:"ShiftLeft"},{id:"start",label:"START",className:"snes-start",key:"Enter"}
  ]}
};

export class VirtualGamepad {
  private pressed = new Set<string>();
  constructor(private readonly profile: VirtualConsoleType, private readonly send:(key:string,type:"keydown"|"keyup")=>void) {}
  mount(container:HTMLElement):void {
    this.destroy();
    const p=CONTROLLER_PROFILES[this.profile];
    container.innerHTML=`<div class="virtual-gamepad" data-console="${this.profile}" aria-label="${p.name}"><div class="gamepad-title">${p.name}</div><div class="gamepad-body"><div class="gamepad-dpad"><button class="gamepad-button dpad-up" data-key="ArrowUp">▲</button><button class="gamepad-button dpad-left" data-key="ArrowLeft">◀</button><button class="gamepad-button dpad-right" data-key="ArrowRight">▶</button><button class="gamepad-button dpad-down" data-key="ArrowDown">▼</button></div><div class="gamepad-special">${p.buttons.filter(b=>["select","start","mode"].includes(b.id)).map(b=>`<button class="gamepad-button ${b.className}" data-key="${b.key}">${b.label}</button>`).join("")}</div><div class="gamepad-face">${p.buttons.filter(b=>["a","b","c","x","y","z"].includes(b.id)).map(b=>`<button class="gamepad-button ${b.className}" data-key="${b.key}">${b.label}</button>`).join("")}</div></div></div>`;
    container.querySelectorAll<HTMLButtonElement>(".gamepad-button").forEach(btn=>{
      const key=btn.dataset.key!;
      const down=(e:Event)=>{e.preventDefault();this.keyDown(key,btn)};
      const up=(e:Event)=>{e.preventDefault();this.keyUp(key,btn)};
      btn.addEventListener("pointerdown",down);btn.addEventListener("pointerup",up);btn.addEventListener("pointercancel",up);btn.addEventListener("pointerleave",e=>{if((e as PointerEvent).buttons===0)up(e)});
      btn.addEventListener("contextmenu",e=>e.preventDefault());
    });
  }
  private keyDown(key:string,button:HTMLElement){if(this.pressed.has(key))return;this.pressed.add(key);button.classList.add("pressed");this.send(key,"keydown")}
  private keyUp(key:string,button:HTMLElement){if(!this.pressed.has(key))return;this.pressed.delete(key);button.classList.remove("pressed");this.send(key,"keyup")}
  destroy():void{this.pressed.clear()}
}