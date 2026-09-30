import type { GameCatalog } from "../game-catalog/game-catalog";
import type { LibraryModule, LibraryItem } from "../library-module/library-module";

export class GameLibraryProjection {
  constructor(private readonly catalog:GameCatalog, private readonly library:LibraryModule){}
  sync():void{
    for(const game of this.catalog.list()){
      const item:LibraryItem={id:`game:${game.id}`,title:game.name,type:"game",version:game.version,source:`content://${game.id}`,metadata:{gameId:game.id,emulatorId:game.emulatorId}};
      if(!this.library.get(item.id)) this.library.add(item);
    }
  }
  get(gameId:string):LibraryItem|undefined{return this.library.get('game:'+gameId);}
  removeMissing():void{
    const ids=new Set(this.catalog.list().map(game=>`game:${game.id}`));
    for(const item of this.library.query({type:"game"})) if(item.metadata?.gameId && !ids.has(item.id)) this.library.remove(item.id);
  }
}
