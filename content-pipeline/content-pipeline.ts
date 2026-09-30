import type { GameContentBatchLoader, ContentBatchEntry, ContentBatchResult } from "../content-layer/content-batch";
import type { GameCatalog } from "../game-catalog/game-catalog";

export interface ContentPipelineResult extends ContentBatchResult { readonly registered:readonly string[]; readonly rejected:readonly string[]; }

export class ProductionContentPipeline {
  constructor(private readonly catalog:GameCatalog,private readonly loader:GameContentBatchLoader){}
  validate(entries:readonly ContentBatchEntry[]):ContentPipelineResult{
    const valid=entries.filter(e=>this.catalog.get(e.gameId)?.emulatorId===e.emulatorId);
    const rejected=entries.filter(e=>!valid.includes(e)).map(e=>e.gameId);
    const result=this.loader.load(valid);
    return Object.freeze({loaded:result.loaded,failed:result.failed,registered:Object.freeze([...result.loaded]),rejected:Object.freeze(rejected)});
  }
}
