import type { GameContentManifest, GameContentPackage, GameContentResolver } from "./content-layer";
export interface ContentBatchEntry { readonly gameId:string; readonly emulatorId:string; readonly package?:GameContentPackage; }
export interface ContentBatchResult { readonly loaded:readonly string[]; readonly failed:readonly {id:string;error:string}[]; }
export class GameContentBatchLoader {
  constructor(private readonly resolver:GameContentResolver){}
  load(entries:readonly ContentBatchEntry[]):ContentBatchResult{
    const loaded:string[]=[];const failed:{id:string;error:string}[]=[];
    for(const entry of entries){try{
      const resolved=this.resolver.resolve(entry.gameId,entry.emulatorId);
      const manifest:GameContentManifest=entry.package?.manifest??resolved.manifest;
      if(manifest.gameId!==resolved.manifest.gameId||manifest.version!==resolved.manifest.version)throw new Error("Game content package identity/version mismatch.");
      if(manifest.emulatorId!==entry.emulatorId)throw new Error("Game content package emulator mismatch.");
      loaded.push(entry.gameId);
    }catch(error){failed.push({id:entry.gameId,error:error instanceof Error?error.message:String(error)});}
    }
    return Object.freeze({loaded:Object.freeze(loaded),failed:Object.freeze(failed)});
  }
}
