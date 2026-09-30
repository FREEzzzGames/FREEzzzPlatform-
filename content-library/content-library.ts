import type { GameContentManifest, GameContentPackage, GameContentResolver } from "../content-layer/content-layer";
import type { GameCatalog } from "../game-catalog/game-catalog";

export interface ContentLibraryRecord { readonly gameId:string; readonly version:string; readonly emulatorId:string; readonly manifest:GameContentManifest; readonly package?:GameContentPackage; }
export class ProductionContentLibrary {
  private readonly records=new Map<string,ContentLibraryRecord>();
  register(catalog:GameCatalog,resolver:GameContentResolver,gameId:string):ContentLibraryRecord{
    const entry=catalog.get(gameId); if(!entry) throw new Error(`Game is not available: ${gameId}`);
    const resolved=resolver.resolve(gameId,entry.emulatorId);
    if(resolved.manifest.version!==entry.version) throw new Error("Catalog/content version mismatch.");
    const record=Object.freeze({gameId,version:resolved.manifest.version,emulatorId:resolved.manifest.emulatorId,manifest:resolved.manifest});
    this.records.set(gameId,record); return record;
  }
  get(gameId:string):ContentLibraryRecord|undefined{return this.records.get(gameId);}
  list():readonly ContentLibraryRecord[]{return [...this.records.values()];}
  remove(gameId:string):boolean{return this.records.delete(gameId);}
}
