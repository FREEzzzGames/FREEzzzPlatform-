import type { GameContentManifest } from "../content-layer/content-layer";

export interface GameCatalogMetadata { readonly description?: string; readonly genre?: string; readonly publisher?: string; readonly tags?: readonly string[]; readonly releaseYear?: number; }
export interface GameCatalogEntry {
  readonly id: string; readonly name: string; readonly version: string; readonly emulatorId: string;
  readonly content: GameContentManifest; readonly metadata?: GameCatalogMetadata;
}
export class GameCatalog {
  private readonly entries=new Map<string,GameCatalogEntry>();
  register(entry:GameCatalogEntry):void{
    if(!entry.id.trim()||!entry.name.trim()||!entry.version.trim()||!entry.emulatorId.trim()) throw new Error("Game catalog entry is incomplete.");
    if(entry.content.gameId!==entry.id) throw new Error("Game catalog id must match content gameId.");
    if(entry.content.emulatorId!==entry.emulatorId) throw new Error("Game catalog emulatorId must match content emulatorId.");
    if(entry.metadata?.releaseYear!==undefined && (!Number.isInteger(entry.metadata.releaseYear)||entry.metadata.releaseYear<1970)) throw new Error("Game catalog releaseYear is invalid.");
    if(this.entries.has(entry.id)) throw new Error(`Game catalog entry already registered: ${entry.id}`);
    this.entries.set(entry.id,Object.freeze({...entry,metadata:entry.metadata?Object.freeze({...entry.metadata,tags:entry.metadata.tags?[...entry.metadata.tags]:undefined}):undefined}));
  }
  unregister(id:string):boolean{return this.entries.delete(id);}
  get(id:string):GameCatalogEntry|undefined{return this.entries.get(id);}
  list():readonly GameCatalogEntry[]{return [...this.entries.values()];}
}
export interface GameCatalogSelection{readonly gameId:string;readonly selectedAt:number;}
export class GameCatalogSelector{
  private selection:GameCatalogSelection|null=null;
  select(catalog:GameCatalog,gameId:string,now=Date.now()):GameCatalogEntry{const entry=catalog.get(gameId);if(!entry)throw new Error(`Game is not available: ${gameId}`);this.selection=Object.freeze({gameId,selectedAt:now});return entry;}
  clear():void{this.selection=null;} getSelection():GameCatalogSelection|null{return this.selection;}
}
