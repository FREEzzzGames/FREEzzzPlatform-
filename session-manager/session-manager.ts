import type { EmulatorComponents } from "../emulator/emulator";
import type { ControllerCore } from "../controller-core/controller-core";
import type { AudioCore } from "../audio-core/audio-core";
import type { SaveSystem } from "../save-system/save-system";
import type { GameCatalog } from "../game-catalog/game-catalog";
import { GameRuntime } from "../game-runtime/game-runtime";
import { GameExecutionSession, type GameExecutionManifest } from "../game-execution/game-execution";
export type GameSessionStatus = "created" | "running" | "paused" | "stopped" | "failed";
export interface GameSession { readonly id:string; readonly gameId:string; readonly createdAt:number; readonly execution:GameExecutionSession; getStatus():GameSessionStatus; }
export class GameSessionManager {
  private readonly sessions=new Map<string,GameSession>();
  constructor(private readonly runtime:GameRuntime){}
  create(catalog:GameCatalog,gameId:string,components:EmulatorComponents,services:{readonly controller:ControllerCore;readonly audio:AudioCore;readonly saves:SaveSystem},sessionId?:string,target:GameExecutionManifest["target"]="web"):GameSession{
    if(this.sessions.has(sessionId ?? "")) throw new Error(`Session already exists: ${sessionId}`);
    const entry=catalog.get(gameId); if(!entry) throw new Error(`Game is not available: ${gameId}`);
    const id=sessionId ?? `session-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const execution=this.runtime.create({id:entry.id,name:entry.name,version:entry.version,emulatorId:entry.emulatorId,target},components,services);
    const session={id,gameId,createdAt:Date.now(),execution,getStatus:()=>this.mapStatus(execution.getStatus())};
    this.sessions.set(id,session); return session;
  }
  start(id:string):void{this.require(id).execution.start();}
  pause(id:string):void{this.require(id).execution.pause();}
  resume(id:string):void{this.require(id).execution.resume();}
  stop(id:string):void{this.require(id).execution.stop();}
  destroy(id:string):boolean{const s=this.sessions.get(id);if(!s)return false;if(s.execution.getStatus()!=="stopped"&&s.execution.getStatus()!=="created")s.execution.stop();return this.sessions.delete(id);}
  get(id:string):GameSession|undefined{return this.sessions.get(id);}
  list():readonly GameSession[]{return [...this.sessions.values()];}
  snapshot(id:string):Uint8Array{ return this.require(id).execution.snapshotState(); }
  restore(id:string,snapshot:Uint8Array):void{ this.require(id).execution.restoreState(snapshot); }
  resumeExisting(id:string):GameSession{ const session=this.require(id); if(session.getStatus()==="paused") this.resume(id); return session; }
  private require(id:string):GameSession{const s=this.sessions.get(id);if(!s)throw new Error(`Game session not found: ${id}`);return s;}
  private mapStatus(status:ReturnType<GameExecutionSession["getStatus"]>):GameSessionStatus{if(status==="starting"||status==="running")return"running";if(status==="paused")return"paused";if(status==="stopping"||status==="stopped")return"stopped";if(status==="failed")return"failed";return"created";}
}
