import type {GameContentPackage,GameContentResolver} from "./content-layer";
export interface ContentBatchEntry{readonly package:GameContentPackage;readonly emulatorId:string;}
export interface ContentBatchResult{readonly loaded:readonly string[];readonly failed:readonly {id:string;error:string}[];}
export class GameContentBatchLoader{
 constructor(private readonly resolver:GameContentResolver){}
 load(entries:readonly ContentBatchEntry[]):ContentBatchResult{
  const loaded:string[]=[];const failed:{id:string;error:string}[]=[];
  for(const e of entries){try{this.resolver.resolve(e.package.manifest.id,e.emulatorId);loaded.push(e.package.manifest.id);}catch(err){failed.push({id:e.package.manifest.id,error:err instanceof Error?err.message:String(err)});}}
  return Object.freeze({loaded:Object.freeze(loaded),failed:Object.freeze(failed)});
 }
}
