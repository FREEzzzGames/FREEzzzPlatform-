import type { EmulatorComponents, CPU, Memory, Video, Audio, Input, Timing } from "../emulator/emulator";
import { GameRuntime } from "../game-runtime/game-runtime";
import { GameSessionManager, type GameSession } from "../session-manager/session-manager";
import type { GameCatalog } from "../game-catalog/game-catalog";
import { DefaultControllerCore, type ControllerCore } from "../controller-core/controller-core";
import { DefaultAudioCore, type AudioCore } from "../audio-core/audio-core";
import { DefaultSaveSystem, StorageSaveProvider } from "../save-system/save-system";
import { MemoryStorage } from "../storage/storage";
import { SessionPersistence } from "../session-persistence/session-persistence";

class NoopCPU implements CPU { reset(): void {} step(): void {} }
class NoopMemory implements Memory { readonly size=0x10000; private readonly data=new Uint8Array(this.size); read(a:number,l:number){return this.data.slice(a,a+l);} write(a:number,d:Uint8Array){this.data.set(d,a);} }
class NoopVideo implements Video { readonly width=256; readonly height=240; private frame=new Uint8Array(this.width*this.height); present(frame:Uint8Array){if(frame.length!==this.frame.length)throw new Error("Video frame size mismatch.");this.frame.set(frame);} }
class NoopAudio implements Audio { readonly sampleRate=44100; push(_samples:Float32Array):void{} }
class NoopInput implements Input { poll():readonly number[]{return [];} }
class BrowserTiming implements Timing { now(){return typeof performance==="undefined"?Date.now():performance.now();} wait(_milliseconds:number){} }
class BrowserComponents implements EmulatorComponents {
 readonly cpu=new NoopCPU(); readonly memory=new NoopMemory(); readonly video=new NoopVideo(); readonly audio=new NoopAudio(); readonly input=new NoopInput(); readonly timing=new BrowserTiming(); readonly storage=new MemoryStorage();
}

export interface WebGamePlayerState { readonly status:"idle"|"ready"|"playing"|"paused"|"error"; readonly gameId:string|null; readonly sessionId:string|null; readonly frame:number; readonly error:string|null; }

export class WebGamePlayer {
 readonly controller:ControllerCore=new DefaultControllerCore();
 readonly audio:AudioCore=new DefaultAudioCore();
 readonly saves=new DefaultSaveSystem(new StorageSaveProvider(new MemoryStorage()));
 readonly runtime:GameRuntime;
 readonly sessions:GameSessionManager;
 readonly persistence:SessionPersistence;
 readonly components:EmulatorComponents=new BrowserComponents();
 private gameId:string|null=null; private sessionId:string|null=null; private status:WebGamePlayerState["status"]="idle"; private frameCount=0; private error:string|null=null;
 constructor(readonly catalog:GameCatalog,runtime:GameRuntime=new GameRuntime()){this.runtime=runtime;this.sessions=new GameSessionManager(runtime);this.persistence=new SessionPersistence(this.saves);this.controller.initialize();this.audio.initialize();}
 listGames(){return this.catalog.list();}
 select(gameId:string){if(!this.catalog.get(gameId))throw new Error("Game is not available: "+gameId);this.gameId=gameId;this.status="ready";this.error=null;}
 launch():GameSession{if(!this.gameId)throw new Error("Select a game before launching.");try{const s=this.sessions.create(this.catalog,this.gameId,this.components,{controller:this.controller,audio:this.audio,saves:this.saves});this.sessions.start(s.id);this.sessionId=s.id;this.frameCount=0;this.status="playing";this.error=null;return s;}catch(cause){this.status="error";this.error=cause instanceof Error?cause.message:String(cause);throw cause;}}
 frame(){if(!this.sessionId)throw new Error("No active game session.");this.sessions.get(this.sessionId)?.execution.stepFrame();this.frameCount++;}
 pause(){if(!this.sessionId)throw new Error("No active game session.");this.sessions.pause(this.sessionId);this.status="paused";}
 resume(){if(!this.sessionId)throw new Error("No active game session.");this.sessions.resume(this.sessionId);this.status="playing";}
 save(){if(!this.sessionId)throw new Error("No active game session.");this.persistence.saveSession(this.sessions.get(this.sessionId)!);}
 exit(){if(this.sessionId)this.sessions.stop(this.sessionId);this.sessionId=null;this.status=this.gameId?"ready":"idle";}
 getSession(){return this.sessionId?this.sessions.get(this.sessionId):undefined;}
 getState():WebGamePlayerState{return Object.freeze({status:this.status,gameId:this.gameId,sessionId:this.sessionId,frame:this.frameCount,error:this.error});}
 getVideoFrame(){const execution=this.getSession()?.execution as (typeof this.getSession extends never?never:unknown);const video=(execution as {getVideoFrame?:()=>Uint8Array}|undefined)?.getVideoFrame?.();return video?video.slice():new Uint8Array(256*240);}
}