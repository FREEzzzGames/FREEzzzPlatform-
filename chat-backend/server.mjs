import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const PORT=Number(process.env.PORT||8787);
const TOKEN=String(process.env.TELEGRAM_BOT_TOKEN||"").trim();
const CONFIG_CHAT=String(process.env.TELEGRAM_CHAT_ID||"").trim();
const ORIGIN=String(process.env.ALLOWED_ORIGIN||"*").trim();
const LIMIT=Math.min(5000,Math.max(100,Number(process.env.CHAT_HISTORY_LIMIT||1000)));
const DATA=path.resolve(process.env.CHAT_DATA_DIR||"./data/messages.json");
let chatId=CONFIG_CHAT, offset=0, bot=null, polling=false, messages=[];
const clients=new Set();

function cors(res){res.setHeader("Access-Control-Allow-Origin",ORIGIN);res.setHeader("Access-Control-Allow-Headers","Content-Type");res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");}
function send(res,status,data){cors(res);res.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"});res.end(JSON.stringify(data));}
async function body(req){const chunks=[];for await(const chunk of req)chunks.push(chunk);const raw=Buffer.concat(chunks).toString("utf8");return raw?JSON.parse(raw):{};}
async function save(){await fs.mkdir(path.dirname(DATA),{recursive:true});await fs.writeFile(DATA,JSON.stringify(messages.slice(-LIMIT)),"utf8");}
async function load(){try{const raw=await fs.readFile(DATA,"utf8");const data=JSON.parse(raw);if(Array.isArray(data))messages=data.slice(-LIMIT);}catch{}}
function emit(event){const line="data: "+JSON.stringify(event)+"\\n\\n";for(const res of clients){try{res.write(line);}catch{clients.delete(res);}}}
function normalize(m){
  if(!m||!m.chat)return null;
  const from=m.from||m.sender_chat||{};
  let kind="text",text=m.text||m.caption||"";
  if(m.photo)kind="photo";else if(m.video)kind="video";else if(m.animation)kind="animation";else if(m.voice)kind="voice";else if(m.audio)kind="audio";else if(m.document)kind="document";else if(m.sticker)kind="sticker";else if(m.location)kind="location";else if(m.contact)kind="contact";else if(m.poll)kind="poll";
  if(!text&&kind!=="text")text="["+kind+"]";
  return {id:"tg-"+m.chat.id+"-"+m.message_id,telegramMessageId:Number(m.message_id),chatId:String(m.chat.id),senderId:String(from.id??m.chat.id),senderName:[from.first_name,from.last_name].filter(Boolean).join(" ")||from.title||from.username||"Telegram",username:from.username?"@"+from.username:"",text:String(text).slice(0,4096),kind,timestamp:Number(m.date||Math.floor(Date.now()/1000))*1000,replyTo:m.reply_to_message?Number(m.reply_to_message.message_id):undefined,outgoing:Boolean(from.is_bot&&bot&&String(from.id)===String(bot.id))};
}
function remember(m,broadcast=true){if(!m||messages.some(x=>x.id===m.id))return false;messages.push(m);if(messages.length>LIMIT)messages=messages.slice(-LIMIT);void save();if(broadcast)emit({type:"message",message:m});return true;}
async function tg(method,payload={}){
  if(!TOKEN)throw new Error("Telegram bot token is not configured.");
  const r=await fetch("https://api.telegram.org/bot"+TOKEN+"/"+method,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
  const data=await r.json();if(!data.ok)throw new Error(data.description||"Telegram API error");return data.result;
}
async function processUpdate(u){
  offset=Math.max(offset,Number(u.update_id||0)+1);
  const m=u.message||u.edited_message||u.channel_post||u.edited_channel_post;
  if(!m||!m.chat)return;
  if(!chatId&&m.chat.type!=="private")chatId=String(m.chat.id);
  if(chatId&&String(m.chat.id)!==chatId)return;
  const n=normalize(m);if(!n)return;
  const old=messages.find(x=>x.id===n.id);
  if(old){Object.assign(old,n);emit({type:"message.updated",message:old});void save();}else remember(n);
}
async function poll(){
  if(polling||!TOKEN)return;
  polling=true;
  try{
    await tg("deleteWebhook",{drop_pending_updates:false}).catch(()=>{});
    bot=await tg("getMe").catch(()=>null);
    while(polling){
      try{
        const updates=await tg("getUpdates",{offset,limit:100,timeout:25,allowed_updates:["message","edited_message","channel_post","edited_channel_post"]});
        for(const u of updates||[])await processUpdate(u);
      }catch(e){console.error("Telegram polling:",e instanceof Error?e.message:e);await new Promise(r=>setTimeout(r,3000));}
    }
  }finally{polling=false;}
}
async function route(req,res){
  cors(res);
  if(req.method==="OPTIONS"){res.writeHead(204);return res.end();}
  const u=new URL(req.url||"/","http://localhost");
  if(req.method==="GET"&&u.pathname==="/health")return send(res,200,{ok:true,telegramConfigured:Boolean(TOKEN),telegramConnected:Boolean(bot),chatId:chatId||null,historySize:messages.length});
  if(req.method==="GET"&&u.pathname==="/api/chat/config")return send(res,200,{ok:true,telegramConfigured:Boolean(TOKEN),telegramConnected:Boolean(bot),chatId:chatId||null,bot:bot?{id:String(bot.id),username:bot.username||"",name:bot.first_name||""}:null});
  if(req.method==="GET"&&u.pathname==="/api/chat/messages"){const limit=Math.min(200,Math.max(1,Number(u.searchParams.get("limit")||100)));return send(res,200,{ok:true,messages:messages.slice(-limit)});}
  if(req.method==="GET"&&u.pathname==="/api/chat/events"){
    res.writeHead(200,{"Content-Type":"text/event-stream; charset=utf-8","Cache-Control":"no-cache, no-transform","Connection":"keep-alive","Access-Control-Allow-Origin":ORIGIN});
    res.write("data: "+JSON.stringify({type:"ready"})+"\\n\\n");clients.add(res);req.on("close",()=>clients.delete(res));return;
  }
  if(req.method==="POST"&&u.pathname==="/api/chat/messages"){
    if(!TOKEN)return send(res,503,{ok:false,error:"Telegram bridge is not configured."});
    const b=await body(req),text=String(b.text||"").trim().slice(0,4096);if(!text)return send(res,400,{ok:false,error:"Message is empty."});
    if(!chatId)return send(res,503,{ok:false,error:"Target Telegram chat is not discovered yet."});
    const replyTo=Number(b.replyTo||0);
    const sent=await tg("sendMessage",{chat_id:chatId,text,...(replyTo>0?{reply_parameters:{message_id:replyTo}}:{})});
    const n=normalize(sent);if(n)remember({...n,outgoing:true});
    return send(res,201,{ok:true,message:n});
  }
  return send(res,404,{ok:false,error:"Not found"});
}
await load();
http.createServer((req,res)=>route(req,res).catch(e=>{console.error(e);send(res,500,{ok:false,error:"Server error."});})).listen(PORT,()=>{console.log("FREEzzz CHAT bridge on "+PORT);void poll();});
process.on("SIGTERM",()=>{polling=false;for(const r of clients)r.end();});
process.on("SIGINT",()=>{polling=false;for(const r of clients)r.end();});
