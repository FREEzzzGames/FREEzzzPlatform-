import type { ContentBatchEntry, ContentBatchResult } from "../content-layer/content-batch";
import type { GameCatalog } from "../game-catalog/game-catalog";
import type { GameLibraryProjection } from "../game-library/game-library";
import type { ProductionContentPipeline } from "./content-pipeline";

export interface ProductionLibraryPipelineResult extends ContentBatchResult { readonly librarySynced:boolean; readonly registered:readonly string[]; readonly rejected:readonly string[]; }

export class ProductionLibraryPipeline {
  constructor(private readonly catalog:GameCatalog,private readonly content:ProductionContentPipeline,private readonly library:GameLibraryProjection){}
  ingest(entries:readonly ContentBatchEntry[]):ProductionLibraryPipelineResult{
    const result=this.content.validate(entries);
    this.library.sync();
    return Object.freeze({loaded:result.loaded,failed:result.failed,registered:result.registered,rejected:result.rejected,librarySynced:true});
  }
}
