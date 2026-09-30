import { describe, expect, it } from "vitest";
import { ChatModule } from "../../chat-module/chat-module";
import { LiveModule } from "../../live-module/live-module";
import { RadioModule } from "../../radio-module/radio-module";
import { LibraryModule } from "../../library-module/library-module";
import { installWebModuleAdapters } from "../../module-adapters/module-adapters";

describe("web module adapters",()=>{
  it("connects all four independent modules through target adapters",()=>{
    const chat=new ChatModule();const live=new LiveModule();const radio=new RadioModule();const library=new LibraryModule();
    for(const module of [chat,live,radio,library]){module.initialize({ownerCoreId:"platform"});module.start();}
    const adapters=installWebModuleAdapters(chat,live,radio,library);
    expect(adapters.chat.target).toBe("web");
    expect(adapters.live.target).toBe("web");
    expect(adapters.radio.target).toBe("web");
    expect(adapters.library.target).toBe("web");
    chat.addConversation({id:"general",participants:[{id:"user",displayName:"User"}]});
    chat.receive({id:"m1",conversationId:"general",senderId:"user",text:"hello",timestamp:1});
    expect(chat.store.listMessages("general")).toHaveLength(1);
    library.add({id:"game-1",title:"Demo",type:"game",version:"1.0.0",source:"content://demo"});
    expect(library.query()).toHaveLength(1);
  });
});
