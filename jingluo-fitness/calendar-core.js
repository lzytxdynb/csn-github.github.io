/* Jingluo calendar domain / RFC 5545 export. All data are fictional.
 * Times are interpreted in Asia/Shanghai, not the visitor's device zone.
 * Existing courses without a duration use 60 minutes in this demo.
 */
(function(g){
"use strict";
const MIN=60000,DAY=86400000,TZ="Asia/Shanghai",LEADS=[15,30,60,1440];
const fmt=new Intl.DateTimeFormat("en-CA",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"});
function day(ms=Date.now()){const p=Object.fromEntries(fmt.formatToParts(new Date(ms)).map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`;}
function parse(d,t="00:00"){if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(t))return NaN;const n=Date.parse(d+"T"+t+":00+08:00");return Number.isFinite(n)&&day(n)===d?n:NaN;}
function shift(d,n){return new Date(Date.parse(d+"T12:00:00Z")+n*DAY).toISOString().slice(0,10);}
function month(d,n){const [y,m]=d.split("-").map(Number);return new Date(Date.UTC(y,m-1+n,1)).toISOString().slice(0,10);}
function week(d){return shift(d,-((new Date(d+"T12:00:00Z").getUTCDay()+6)%7));}
function range(d,mode){return mode==="month"?[month(d,0),shift(month(d,1),-1)]:mode==="day"?[d,d]:[week(d),shift(week(d),6)];}
function cells(d,mode){const start=mode==="month"?week(month(d,0)):mode==="day"?d:week(d);return Array.from({length:mode==="month"?42:mode==="day"?1:7},(_,i)=>shift(start,i));}
function scope(role,coach){return role==="coach"?"coach:"+coach:role;}
function settings(p={}){if(!p||typeof p!=="object")p={};return {enabled:p.enabled!==false,browser:p.browser===true,leads:Array.isArray(p.leads)?[...new Set(p.leads.filter(n=>LEADS.includes(n)))].sort((a,b)=>a-b):[30]};}
function events(data,role,coach){
 if(!["member","coach","admin"].includes(role))return [];
 const ss=new Map((data.slots||[]).filter(s=>Array.isArray(s)).map(s=>[s[0],s]));
 const bs=(data.bookings||[]).filter(b=>b&&ss.has(b.slot));
 const make=(s,b)=>{
  const start=parse(s[4],s[5]);if(!Number.isFinite(start))return null;
  const duration=Number.isInteger(s[8])&&s[8]>=15&&s[8]<=240?s[8]:60;
  const bookings=bs.filter(x=>x.slot===s[0]&&x.status!=="cancel");
  return {id:b?"booking:"+b.id:"session:"+s[0],sid:s[0],bid:b?.id,title:String(s[1]),kind:s[2],coach:s[3],date:s[4],time:s[5],duration,start,end:start+duration*MIN,location:String(s[7]||"演示训练区"),capacity:s[6],count:bookings.length,status:b?b.status:bookings.length&&bookings.every(x=>x.status==="done")?"done":bookings.length?"booked":"open"};
 };
 const list=role==="member"?bs.map(b=>make(ss.get(b.slot),b)):[...ss.values()].filter(s=>role==="admin"||s[3]===coach).map(s=>make(s));
 return list.filter(Boolean).sort((a,b)=>a.start-b.start||a.id.localeCompare(b.id));
}
function active(e,now){return e.status!=="cancel"&&e.status!=="done"&&e.start>now;}
function fingerprint(scope,e,lead){return `${scope}|${e.id}|${e.start}|${lead}`;}
// On return from sleep: send at most one current reminder per event.
// Missed earlier thresholds are consumed, not burst-delivered.
function due(list,p,scope,seen,now=Date.now()){
 const out=[],prefs=settings(p);if(!prefs.enabled)return out;
 for(const e of list){if(!active(e,now))continue;const reached=prefs.leads.filter(n=>now>=e.start-n*MIN).sort((a,b)=>a-b);if(!reached.length)continue;
 const lead=reached[0],id=fingerprint(scope,e,lead);if(!seen[id])out.push({event:e,id,lead,consume:reached.map(n=>fingerprint(scope,e,n))});
 }return out;
}
function text(s){return String(s??"").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,"").replace(/\\/g,"\\\\").replace(/\r\n|\r|\n/g,"\\n").replace(/;/g,"\\;").replace(/,/g,"\\,");}
function fold(s){let out="",count=0;const enc=new TextEncoder();for(const ch of s){const n=enc.encode(ch).length;if(count+n>75){out+="\r\n ";count=1;}out+=ch;count+=n;}return out;}
const stamp=n=>new Date(n).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
function ics(list,p,scope,name,now=Date.now()){
 const prefs=settings(p),lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Jingluo Fitness//Calendar Demo 1.0//ZH","CALSCALE:GREGORIAN","METHOD:PUBLISH","X-WR-CALNAME:"+text("鲸落健身 · "+name),"X-WR-TIMEZONE:"+TZ];
 for(const e of list.filter(e=>e.status!=="cancel")){
  lines.push("BEGIN:VEVENT","UID:"+encodeURIComponent(scope+"-"+e.id)+"@jingluo.demo.invalid","DTSTAMP:"+stamp(now),"DTSTART:"+stamp(e.start),"DTEND:"+stamp(e.end),"SUMMARY:"+text("【演示】"+e.title),"LOCATION:"+text(e.location),"DESCRIPTION:"+text(`鲸落健身虚构课程；${name}；北京时间 ${e.date} ${e.time}。${e.duration} 分钟。此文件不是订阅：改约或取消后，请手动更新/删除设备日历中的旧日程。`),"STATUS:CONFIRMED","TRANSP:OPAQUE");
  if(prefs.enabled&&active(e,now))for(const n of prefs.leads)lines.push("BEGIN:VALARM","ACTION:DISPLAY","TRIGGER:-PT"+n+"M","DESCRIPTION:"+text("鲸落健身课前提醒："+e.title),"END:VALARM");
  lines.push("END:VEVENT");
 }lines.push("END:VCALENDAR");return lines.map(fold).join("\r\n")+"\r\n";
}
const api={TZ,LEADS,MIN,DAY,day,parse,shift,month,week,range,cells,scope,settings,events,active,fingerprint,due,text,fold,ics};
g.JLCalendarCore=Object.freeze(api);if(typeof module!=="undefined")module.exports=api;
})(typeof globalThis!=="undefined"?globalThis:this);
