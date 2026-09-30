import { PlatformHost } from "../platform-host/platform-host";
import { PlatformShell } from "../platform-shell/platform-shell";
import { PlatformWorkspace, type PlatformWorkspaceView } from "../platform-workspace/platform-workspace";
import { ChatModule } from "../chat-module/chat-module";
import { LiveModule } from "../live-module/live-module";
import { RadioModule } from "../radio-module/radio-module";
import { LibraryModule } from "../library-module/library-module";
import { installWebModuleAdapters } from "../module-adapters/module-adapters";
import "./styles.css";

const shell=new PlatformShell();
const host=new PlatformHost({id:"freezzz-web",name:"FREEzzz Web Host",version:"0.1.0",target:"web"},shell);
const workspace=new PlatformWorkspace(host);
const chat=new ChatModule(), live=new LiveModule(), radio=new RadioModule(), library=new LibraryModule();
for(const module of [chat,live,radio,library]){module.initialize({ownerCoreId:"freezzz-web"});module.start();}
let liveElement:HTMLVideoElement|undefined;
installWebModuleAdapters(chat,live,radio,library);
chat.addConversation({id:"general",participants:[{id:"user",displayName:"User"},{id:"system",displayName:"System"}]});
chat.receive({id:"welcome",conversationId:"general",senderId:"system",text:"CHAT adapter is online.",timestamp:Date.now()});
library.add({id:"platform-demo",title:"Platform Demo",type:"game",version:"1.0.0",source:"content://demo"});
live.registerChannel({id:"demo-channel",name:"Demo Channel",streamIds:[]});
live.registerStream({id:"demo-stream",channelId:"demo-channel",title:"Demo stream",source:"",protocol:"progressive",isLive:false});
radio.registerStation({id:"demo-radio",name:"Demo Radio",stream:"",format:"audio/mpeg"});
const mount=(()=>{const e=document.querySelector<HTMLDivElement>("#app");if(!e)throw new Error("Platform workspace mount point is missing.");return e;})();
const views:readonly PlatformWorkspaceView[]=["home","library","chat","live","radio","system"];
const labels:Record<PlatformWorkspaceView,string>={home:"Home",library:"Library",chat:"Chat",live:"Live",radio:"Radio",system:"System"};

function render(){const state=workspace.getState(),d=host.getDiagnostics();mount.innerHTML=`<main class="workspace"><header class="topbar"><div><span class="eyebrow">FREEzzz</span><h1>Platform</h1></div><span class="state state-${state.status}">${state.status.toUpperCase()}</span></header><nav class="nav">${views.map(v=>`<button class="${state.view===v?"active":""}" data-view="${v}" type="button">${labels[v]}</button>`).join("")}</nav>${state.lastError?`<div class="error" role="alert">${escapeHtml(state.lastError)} <button id="clear-error" type="button">Dismiss</button></div>`:""}${view(state.view)}<footer><span class="muted">Host ${d.manifest.target}</span><button id="restart" type="button">Restart host</button></footer></main>`;
document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach(b=>b.onclick=()=>{workspace.navigate(b.dataset.view as PlatformWorkspaceView);render();});
document.querySelector("#clear-error")?.addEventListener("click",()=>{workspace.clearError();render();});
document.querySelector("#restart")?.addEventListener("click",()=>{try{if(host.getStatus()==="ready")host.stop();workspace.start();}catch(e){workspace.reportError(e);}render();});bind(state.view);}

function view(v:PlatformWorkspaceView):string{
if(v==="home")return `<div class="panel"><span class="muted">Platform</span><h2>FREEzzz Platform</h2><p>Independent services through target adapters.</p><div class="metrics"><span>Host<strong>${host.getStatus()}</strong></span><span>Runtime<strong>${dStatus()}</strong></span><span>Modules<strong>4</strong></span></div></div>`;
if(v==="system")return `<div class="panel"><span class="muted">System</span><h2>System</h2><p>CHAT ${chat.status}</p><p>LIVE ${live.status}</p><p>RADIO ${radio.status}</p><p>LIBRARY ${library.status}</p></div>`;
if(v==="library")return `<div class="panel"><span class="muted">Library</span><h2>Library</h2>${library.query().map(i=>`<div class="row"><strong>${escapeHtml(i.title)}</strong><span>${escapeHtml(i.type)} · ${escapeHtml(i.version)}</span></div>`).join("")}</div>`;
if(v==="chat")return `<div class="panel"><span class="muted">Chat</span><h2>General</h2><div class="chat-log">${chat.store.listMessages("general").map(m=>`<div class="chat-message"><strong>${escapeHtml(m.senderId)}</strong><span>${escapeHtml(m.text)}</span></div>`).join("")}</div><form id="chat-form" class="inline-form"><input id="chat-input" maxlength="500" required placeholder="Message"><button type="submit">Send</button></form></div>`;
if(v==="live")return `<div class="panel"><span class="muted">Live</span><h2>Live</h2><div id="live-player"></div><div class="actions"><button id="live-load" type="button">Load</button><button id="live-play" type="button">Play</button><button id="live-pause" type="button">Pause</button><button id="live-stop" type="button">Stop</button></div></div>`;
return `<div class="panel"><span class="muted">Radio</span><h2>Radio</h2><p>Station: Demo Radio</p><div class="actions"><button id="radio-load" type="button">Load</button><button id="radio-play" type="button">Play</button><button id="radio-pause" type="button">Pause</button><button id="radio-stop" type="button">Stop</button></div></div>`;
}
function bind(v:PlatformWorkspaceView){
if(v==="chat")document.querySelector<HTMLFormElement>("#chat-form")?.addEventListener("submit",e=>{e.preventDefault();const i=document.querySelector<HTMLInputElement>("#chat-input");if(!i?.value.trim())return;chat.receive({id:`m-${Date.now()}`,conversationId:"general",senderId:"user",text:i.value.trim(),timestamp:Date.now()});render();});
if(v==="live"){document.querySelector("#live-load")?.addEventListener("click",()=>{try{live.load("demo-stream","web");render();}catch(e){workspace.reportError(e);render();}});document.querySelector("#live-play")?.addEventListener("click",()=>{try{live.play();}catch(e){workspace.reportError(e);} });document.querySelector("#live-pause")?.addEventListener("click",()=>{try{live.pause();}catch(e){workspace.reportError(e);} });document.querySelector("#live-stop")?.addEventListener("click",()=>{try{live.stopPlayback();}catch(e){workspace.reportError(e);} });const target=document.querySelector("#live-player");if(target&&liveElement)target.append(liveElement);}
if(v==="radio"){document.querySelector("#radio-load")?.addEventListener("click",()=>{try{radio.load("demo-radio","web");}catch(e){workspace.reportError(e);} });document.querySelector("#radio-play")?.addEventListener("click",()=>{try{radio.play();}catch(e){workspace.reportError(e);} });document.querySelector("#radio-pause")?.addEventListener("click",()=>{try{radio.pause();}catch(e){workspace.reportError(e);} });document.querySelector("#radio-stop")?.addEventListener("click",()=>{try{radio.stopPlayback();}catch(e){workspace.reportError(e);} });}}
function dStatus(){return host.getDiagnostics().shellStatus;}
function escapeHtml(v:string){return v.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
try{workspace.start();}catch(e){workspace.reportError(e);}
render();
