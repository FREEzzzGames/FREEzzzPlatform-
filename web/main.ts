import { PlatformHost } from "../platform-host/platform-host";
import { PlatformShell } from "../platform-shell/platform-shell";
import { PlatformWorkspace, type PlatformWorkspaceView } from "../platform-workspace/platform-workspace";
import { ChatModule } from "../chat-module/chat-module";
import { LiveModule } from "../live-module/live-module";
import { RadioModule } from "../radio-module/radio-module";
import { LibraryModule } from "../library-module/library-module";
import { installWebModuleAdapters } from "../module-adapters/module-adapters";
import { GameCatalog } from "../game-catalog/game-catalog";
import { GameContentRegistry, GameContentResolver, MemoryGameContentSource, sha256 } from "../content-layer/content-layer";
import { GameRuntime } from "../game-runtime/game-runtime";
import { WebGamePlayer } from "../web-game-player/web-game-player";
import { GameLibraryProjection } from "../game-library/game-library";
import "./styles.css";

const shell=new PlatformShell();
const host=new PlatformHost({id:"freezzz-web",name:"FREEzzz Web Host",version:"0.1.0",target:"web"},shell);
const workspace=new PlatformWorkspace(host);
const chat=new ChatModule(), live=new LiveModule(), radio=new RadioModule(), library=new LibraryModule();
for(const module of [chat,live,radio,library]){module.initialize({ownerCoreId:"freezzz-web"});module.start();}
let liveElement:HTMLVideoElement|undefined;
installWebModuleAdapters(chat,live,radio,library,element=>{liveElement=element;});
library.useStorage("web-library");
chat.addConversation({id:"general",participants:[{id:"user",displayName:"User"},{id:"system",displayName:"System"}]});
chat.receive({id:"welcome",conversationId:"general",senderId:"system",text:"CHAT adapter is online.",timestamp:Date.now()});
library.add({id:"platform-demo",title:"Platform Demo",type:"game",version:"1.0.0",source:"content://demo"});
live.registerChannel({id:"demo-channel",name:"Demo Channel",streamIds:[]});
live.registerStream({id:"demo-stream",channelId:"demo-channel",title:"Demo stream",source:"",protocol:"progressive",isLive:false});
radio.registerStation({id:"demo-radio",name:"Demo Radio",stream:"",format:"audio/mpeg"});
const mount=(()=>{const e=document.querySelector<HTMLDivElement>("#app");if(!e)throw new Error("Platform workspace mount point is missing.");return e;})();
const gameBytes=new Uint8Array([0xea,0xea,0x4c,0x00,0x80]);
const contentSource=new MemoryGameContentSource();
const contentRegistry=new GameContentRegistry();
contentSource.register({id:"platform-demo-rom",gameId:"platform-demo-game",kind:"rom",version:"1.0.0",size:gameBytes.length,checksum:sha256(gameBytes)},gameBytes);
contentRegistry.register({gameId:"platform-demo-game",version:"1.0.0",emulatorId:"nes",entryContentId:"platform-demo-rom",requiredContent:[]});
const gameCatalog=new GameCatalog();
gameCatalog.register({id:"platform-demo-game",name:"Platform Demo",version:"1.0.0",emulatorId:"nes",content:contentRegistry.get("platform-demo-game")!});
const gamePlayer=new WebGamePlayer(gameCatalog,new GameRuntime({content:new GameContentResolver(contentRegistry,contentSource)}));
const gameLibrary=new GameLibraryProjection(gameCatalog,library);
gameLibrary.sync();
const views:readonly PlatformWorkspaceView[]=["home","library","chat","live","radio","system"];
const labels:Record<PlatformWorkspaceView,string>={home:"Home",library:"Library",chat:"Chat",live:"Live",radio:"Radio",system:"System"};

function render(){const state=workspace.getState(),d=host.getDiagnostics();mount.innerHTML=`<main class="workspace"><header class="topbar"><div><span class="eyebrow">FREEzzz</span><h1>Platform</h1></div><span class="state state-${state.status}">${state.status.toUpperCase()}</span></header><nav class="nav">${views.map(v=>`<button class="${state.view===v?"active":""}" data-view="${v}" type="button">${labels[v]}</button>`).join("")}</nav>${state.lastError?`<div class="error" role="alert">${escapeHtml(state.lastError)} <button id="clear-error" type="button">Dismiss</button></div>`:""}${view(state.view)}<footer><span class="muted">Host ${d.manifest.target}</span><button id="restart" type="button">Restart host</button></footer></main>`;
document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach(b=>b.onclick=()=>{workspace.navigate(b.dataset.view as PlatformWorkspaceView);render();});
document.querySelector("#clear-error")?.addEventListener("click",()=>{workspace.clearError();render();});
document.querySelector("#restart")?.addEventListener("click",()=>{try{if(host.getStatus()==="ready")host.stop();workspace.start();}catch(e){workspace.reportError(e);}render();});bind(state.view);}

function view(v:PlatformWorkspaceView):string{
if(v==="home")return `<div class="panel"><span class="muted">Platform</span><h2>FREEzzz Platform</h2><p>Independent services through target adapters.</p><div class="metrics"><span>Host<strong>${host.getStatus()}</strong></span><span>Runtime<strong>${dStatus()}</strong></span><span>Modules<strong>4</strong></span></div></div>`;
if(v==="system")return `<div class="panel"><span class="muted">System</span><h2>System</h2><p>CHAT ${chat.status}</p><p>LIVE ${live.status}</p><p>RADIO ${radio.status}</p><p>LIBRARY ${library.status}</p></div>`;
if(v==="library")return `<div class="panel"><span class="muted">Library</span><h2>Games</h2>${gameCatalog.list().map(g=>`<div class="row"><div><strong>${escapeHtml(g.name)}</strong><span>${escapeHtml(g.emulatorId)} · ${escapeHtml(g.version)}</span></div><button data-game-launch="${escapeHtml(g.id)}" type="button">Launch</button></div>`).join("")}<div class="game-status"><span>Status: ${gamePlayer.getState().status}</span><span>Frames: ${gamePlayer.getState().frame}</span><button id="game-save" type="button">Save</button><button id="game-pause" type="button">Pause</button><button id="game-resume" type="button">Resume</button><button id="game-exit" type="button">Exit</button></div><canvas id="game-canvas" width="256" height="240" aria-label="Game display"></canvas></div>`;
if(v==="chat")return `<div class="panel"><span class="muted">Chat</span><h2>General</h2><div class="chat-log">${chat.store.listMessages("general").map(m=>`<div class="chat-message"><strong>${escapeHtml(m.senderId)}</strong><span>${escapeHtml(m.text)}</span></div>`).join("")}</div><form id="chat-form" class="inline-form"><input id="chat-input" maxlength="500" required placeholder="Message"><button type="submit">Send</button></form></div>`;
if(v==="live")return `<div class="panel"><span class="muted">Live</span><h2>Live</h2><div id="live-player"></div><div class="actions"><button id="live-load" type="button">Load</button><button id="live-play" type="button">Play</button><button id="live-pause" type="button">Pause</button><button id="live-stop" type="button">Stop</button></div></div>`;
return `<div class="panel"><span class="muted">Radio</span><h2>Radio</h2><p>Station: Demo Radio</p><div class="actions"><button id="radio-load" type="button">Load</button><button id="radio-play" type="button">Play</button><button id="radio-pause" type="button">Pause</button><button id="radio-stop" type="button">Stop</button></div></div>`;
}
function bind(v:PlatformWorkspaceView){
if(v==="library"){document.querySelectorAll<HTMLButtonElement>("[data-game-launch]").forEach(b=>b.addEventListener("click",()=>{try{gamePlayer.select(b.dataset.gameLaunch!);gamePlayer.launch();startGameLoop();render();}catch(e){workspace.reportError(e);render();}}));document.querySelector("#game-save")?.addEventListener("click",()=>{try{gamePlayer.save();}catch(e){workspace.reportError(e);}render();});document.querySelector("#game-pause")?.addEventListener("click",()=>{try{gamePlayer.pause();}catch(e){workspace.reportError(e);}render();});document.querySelector("#game-resume")?.addEventListener("click",()=>{try{gamePlayer.resume();}catch(e){workspace.reportError(e);}render();});document.querySelector("#game-exit")?.addEventListener("click",()=>{gamePlayer.exit();render();});drawGameFrame();}
if(v==="chat")document.querySelector<HTMLFormElement>("#chat-form")?.addEventListener("submit",e=>{e.preventDefault();const i=document.querySelector<HTMLInputElement>("#chat-input");if(!i?.value.trim())return;chat.receive({id:`m-${Date.now()}`,conversationId:"general",senderId:"user",text:i.value.trim(),timestamp:Date.now()});render();});
if(v==="live"){document.querySelector("#live-load")?.addEventListener("click",()=>{try{live.load("demo-stream","web");render();}catch(e){workspace.reportError(e);render();}});document.querySelector("#live-play")?.addEventListener("click",()=>{try{live.play();}catch(e){workspace.reportError(e);}});document.querySelector("#live-pause")?.addEventListener("click",()=>{try{live.pause();}catch(e){workspace.reportError(e);}});document.querySelector("#live-stop")?.addEventListener("click",()=>{try{live.stopPlayback();}catch(e){workspace.reportError(e);}});const target=document.querySelector("#live-player");if(target&&liveElement&&liveElement.parentElement!==target)target.append(liveElement);}
if(v==="radio"){document.querySelector("#radio-load")?.addEventListener("click",()=>{try{radio.load("demo-radio","web");}catch(e){workspace.reportError(e);} });document.querySelector("#radio-play")?.addEventListener("click",()=>{try{radio.play();}catch(e){workspace.reportError(e);} });document.querySelector("#radio-pause")?.addEventListener("click",()=>{try{radio.pause();}catch(e){workspace.reportError(e);} });document.querySelector("#radio-stop")?.addEventListener("click",()=>{try{radio.stopPlayback();}catch(e){workspace.reportError(e);} });}}
function drawGameFrame(){const canvas=document.querySelector<HTMLCanvasElement>("#game-canvas");if(!canvas)return;const ctx=canvas.getContext("2d");if(!ctx)return;const frame=gamePlayer.getVideoFrame();if(frame.length!==256*240)return;const image=ctx.createImageData(256,240);for(let i=0;i<frame.length;i++){const v=frame[i];const p=i*4;image.data[p]=v;image.data[p+1]=v;image.data[p+2]=v;image.data[p+3]=255;}ctx.putImageData(image,0,0);}
let gameLoop:number|undefined;
function startGameLoop(){if(gameLoop!==undefined)return;const tick=()=>{if(gamePlayer.getState().status==="playing"){try{gamePlayer.frame();drawGameFrame();}catch(e){workspace.reportError(e);}}else{gameLoop=undefined;return;}gameLoop=requestAnimationFrame(tick);};gameLoop=requestAnimationFrame(tick);}
function dStatus(){return host.getDiagnostics().shellStatus;}
function escapeHtml(v:string){return v.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
try{workspace.start();}catch(e){workspace.reportError(e);}
render();
