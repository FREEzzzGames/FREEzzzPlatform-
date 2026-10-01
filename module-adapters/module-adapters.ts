import type { ChatMessage, ChatModule, ChatTransport, ChatTransportAdapter } from "../chat-module/chat-module";
import type { LibraryItem, LibraryModule, LibraryStorage, LibraryStorageAdapter } from "../library-module/library-module";
import type { LiveModule, LivePlayer, LivePlayerAdapter, LiveStream } from "../live-module/live-module";
import type { RadioModule, RadioPlayer, RadioPlayerAdapter, RadioStation } from "../radio-module/radio-module";

export interface WebModuleAdapters {
  readonly chat: ChatTransportAdapter;
  readonly live: LivePlayerAdapter;
  readonly radio: RadioPlayerAdapter;
  readonly library: LibraryStorageAdapter;
}

class WebChatTransport implements ChatTransport {
  readonly id="web-local"; readonly version="1.0.0"; readonly target="web" as const;
  private statusValue:"disconnected"|"connected"|"failed"="disconnected";
  constructor(private readonly onSend:(message:ChatMessage)=>void){}
  connect(){this.statusValue="connected";}
  disconnect(){this.statusValue="disconnected";}
  send(message:ChatMessage){if(this.statusValue!=="connected")throw new Error("Web chat transport is not connected.");this.onSend(message);}
  getStatus(){return this.statusValue;}
}

export class WebChatAdapter implements ChatTransportAdapter {
  readonly id="web-chat"; readonly version="1.0.0"; readonly target="web" as const;
  constructor(private readonly chat:ChatModule){}
  supports(transportId:string){return transportId==="web-local";}
  createTransport(){return new WebChatTransport(message=>this.chat.receive(message));}
}

class WebLivePlayer implements LivePlayer {
  readonly id="web-media"; readonly version="1.0.0"; readonly target="web" as const;
  private element?:HTMLVideoElement; private streamId=""; private status:"idle"|"loading"|"playing"|"paused"|"stopped"|"failed"="idle"; private updatedAt=Date.now();
  initialize(){this.element=document.createElement("video");this.element.controls=true;this.element.playsInline=true;this.element.preload="metadata";this.element.addEventListener("play",()=>{this.status="playing";this.updatedAt=Date.now();});this.element.addEventListener("pause",()=>{if(this.status==="playing")this.status="paused";this.updatedAt=Date.now();});}
  load(stream:LiveStream){if(!this.element)throw new Error("LIVE player is not initialized.");this.streamId=stream.id;this.status="loading";this.updatedAt=Date.now();this.element.src=stream.source;}
  play(){if(!this.element)throw new Error("LIVE player is not initialized.");void this.element.play().catch(()=>{this.status="failed";this.updatedAt=Date.now();});}
  pause(){this.element?.pause();this.status="paused";this.updatedAt=Date.now();}
  stop(){this.element?.pause();if(this.element)this.element.currentTime=0;this.status="stopped";this.updatedAt=Date.now();}
  getState(){return Object.freeze({streamId:this.streamId,status:this.status,positionMs:Math.round((this.element?.currentTime??0)*1000),updatedAt:this.updatedAt});}
  createElement(){if(!this.element)this.initialize();return this.element!;}
}

export class WebLiveAdapter implements LivePlayerAdapter {
  readonly id="web-media"; readonly version="1.0.0"; readonly target="web" as const;
  constructor(private readonly sink:(element:HTMLVideoElement)=>void=()=>{}){}
  supports(protocol:LiveStream["protocol"]){return protocol==="hls"||protocol==="dash"||protocol==="progressive"||protocol==="custom";}
  createPlayer(){const player=new WebLivePlayer();const created=player.createElement();this.sink(created);return player;}
}

class WebRadioPlayer implements RadioPlayer {
  readonly id="web-audio"; readonly version="1.1.0"; readonly target="web" as const;
  private audio?:HTMLAudioElement;
  private stationId?:string;
  private status:"idle"|"loading"|"playing"|"paused"|"stopped"|"failed"="idle";
  private updatedAt=Date.now();

  initialize(){
    this.audio=new Audio();
    this.audio.controls=true;
    this.audio.preload="none";
    this.audio.setAttribute("aria-label","Radio player");

    this.audio.addEventListener("loadstart",()=>this.setStatus("loading"));
    this.audio.addEventListener("canplay",()=>{ if(this.status==="loading") this.updatedAt=Date.now(); });
    this.audio.addEventListener("playing",()=>this.setStatus("playing"));
    this.audio.addEventListener("pause",()=>{
      if(this.status==="playing"||this.status==="loading") this.setStatus("paused");
      else this.updatedAt=Date.now();
    });
    this.audio.addEventListener("ended",()=>this.setStatus("stopped"));
    this.audio.addEventListener("error",()=>this.setStatus("failed"));

    const host=document.querySelector<HTMLElement>("#radio-audio-host");
    if(host) host.append(this.audio);
  }

  load(station:RadioStation){
    if(!this.audio) throw new Error("RADIO player is not initialized.");
    this.audio.pause();
    this.audio.removeAttribute("src");
    this.audio.load();
    this.stationId=station.id;
    this.status="loading";
    this.updatedAt=Date.now();
    this.audio.src=station.stream;
    this.audio.load();
  }

  play(){
    if(!this.audio) throw new Error("RADIO player is not initialized.");
    this.status="loading";
    this.updatedAt=Date.now();
    void this.audio.play().catch(()=>{
      this.setStatus("failed");
    });
  }

  pause(){
    if(!this.audio) throw new Error("RADIO player is not initialized.");
    this.audio.pause();
    this.setStatus("paused");
  }

  stop(){
    if(!this.audio) throw new Error("RADIO player is not initialized.");
    this.audio.pause();
    this.audio.currentTime=0;
    this.setStatus("stopped");
  }

  getState(){
    return Object.freeze({
      stationId:this.stationId,
      status:this.status,
      positionMs:Math.round((this.audio?.currentTime??0)*1000),
      updatedAt:this.updatedAt
    });
  }

  private setStatus(status:RadioPlaybackState["status"]){
    this.status=status;
    this.updatedAt=Date.now();
  }
}

export class WebRadioAdapter implements RadioPlayerAdapter {
  readonly id="web-audio"; readonly version="1.1.0"; readonly target="web" as const;
  supports(format:string){return /^(audio\/|mp3$|aac$|ogg$|opus$|wav$)/i.test(format);}
  createPlayer(){return new WebRadioPlayer();}
}

class WebLibraryStorage implements LibraryStorage {
  readonly id="web-local-storage";readonly version="1.0.0";
  constructor(private readonly key:string){}
  list():readonly LibraryItem[]{const raw=localStorage.getItem(this.key);return raw?JSON.parse(raw) as LibraryItem[]:[];}
  add(item:LibraryItem){const items=[...this.list().filter(existing=>existing.id!==item.id),item];localStorage.setItem(this.key,JSON.stringify(items));}
  remove(id:string){const items=this.list();const next=items.filter(item=>item.id!==id);if(next.length===items.length)return false;localStorage.setItem(this.key,JSON.stringify(next));return true;}
  get(id:string){return this.list().find(item=>item.id===id);}
  clear(){localStorage.removeItem(this.key);}
}

export class WebLibraryAdapter implements LibraryStorageAdapter {
  readonly id="web-library";readonly version="1.0.0";readonly target="web" as const;
  createStorage(){return new WebLibraryStorage("freezzz.library");}
}

export function installWebModuleAdapters(chat:ChatModule,live:LiveModule,radio:RadioModule,library:LibraryModule,onLivePlayer:(element:HTMLVideoElement)=>void=()=>{}):WebModuleAdapters{
  const adapters={chat:new WebChatAdapter(chat),live:new WebLiveAdapter(onLivePlayer),radio:new WebRadioAdapter(),library:new WebLibraryAdapter()};
  chat.transports.register(adapters.chat);live.players.register(adapters.live);radio.players.register(adapters.radio);library.storage.register(adapters.library);
  return adapters;
}
