/* Role-scoped calendar and foreground reminder UI. No server, no external messages.
 * System notifications require an explicit click and permission. The worker does
 * not schedule reminders or provide push; closed/suspended pages cannot dispatch.
 */
(()=>{
"use strict";
const C=window.JLCalendarCore,STORE="jingluo-calendar-v1",esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let bridge,scopeNow="",memory={v:1,prefs:{},seen:{},notices:[]},writable=true,busy=false,reg,dialog;
const views=new Map(),names={member:"会员",coach:"教练",admin:"商家"},weekdays=["一","二","三","四","五","六","日"];
const read=()=>{try{const x=JSON.parse(localStorage.getItem(STORE));if(x?.v===1&&x.prefs&&x.seen&&Array.isArray(x.notices))memory=x;}catch{}return memory;};
function write(s){s.notices=s.notices.slice(0,100);memory=s;try{localStorage.setItem(STORE,JSON.stringify(s));writable=true;}catch{writable=false;}}
const context=()=>bridge?.get();
const scopeOf=x=>C.scope(x.role,x.coach);
const coachName=id=>context().coaches.find(c=>c[0]===id)?.[1]||"教练";
const getEvents=()=>{const x=context();return C.events(x.data,x.role,x.coach);};
const prefs=()=>C.settings(read().prefs[scopeNow]);
const label=n=>n===1440?"前一天":`课前 ${n} 分钟`;
const time=ms=>new Intl.DateTimeFormat("zh-CN",{timeZone:C.TZ,hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(ms);
const short=d=>`${Number(d.slice(5,7))}月${Number(d.slice(8))}日`;
const button=(t,a,id="",extra="")=>`<button type="button" class="jl-btn" data-jl="${a}" data-jl-id="${esc(id)}" ${extra}>${t}</button>`;
function view(){if(!views.has(scopeNow)){const next=getEvents().find(e=>C.active(e,Date.now())),d=next&&next.date<=C.shift(C.day(),7)?next.date:C.day();views.set(scopeNow,{mode:"week",date:d,selected:d,kind:"all",coach:"all",cancel:false});}return views.get(scopeNow);}
function filtered(){const u=view();return getEvents().filter(e=>(u.cancel||e.status!=="cancel")&&(u.kind==="all"||e.kind===u.kind)&&(context().role!=="admin"||u.coach==="all"||e.coach===u.coach));}
function stateText(e){return e.status==="cancel"?"已取消":e.status==="done"?"已核销":e.end<=Date.now()?"已结束":e.start<=Date.now()?"进行中":e.status==="open"?"待预约":"待上课";}
function setupDialog(){
 if(dialog)return;dialog=document.createElement("dialog");dialog.id="jl-dialog";dialog.className="jl-dialog";dialog.setAttribute("aria-labelledby","jl-dialog-title");document.body.append(dialog);
 dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close();});
}
function openDialog(title,body){setupDialog();if(dialog.open)dialog.close();dialog.innerHTML=`<div class="jl-modal"><div class="jl-dialog-head"><h2 id="jl-dialog-title">${esc(title)}</h2>${button("关闭 ×","close")}</div>${body}</div>`;dialog.showModal();}
function noticeHTML(n){return `<article class="jl-notice ${n.read?"":"unread"}"><div><strong>${esc(n.title)}</strong><p>${esc(n.body)}</p><small>${short(C.day(n.at))} ${time(n.at)} · ${n.read?"已读":"未读"}${n.test?" · 演示测试":""}</small></div>${n.read?"":button("标为已读","read",n.id)}</article>`;}
function paintInbox(){
 const box=document.getElementById("jl-inbox");if(!box)return;
 const list=read().notices.filter(n=>n.scope===scopeNow),unread=list.filter(n=>!n.read).length;
 box.innerHTML=list.slice(0,10).map(noticeHTML).join("")||'<p class="jl-empty">暂无提醒。到达提醒时间后，这里会出现消息；也可点击“测试提醒”体验。</p>';
 document.getElementById("jl-unread").textContent=String(unread);
 const hint=document.getElementById("jl-save-hint");if(hint)hint.textContent=writable?"设置与消息仅保存在当前浏览器。":"浏览器禁止本地存储：当前更改仅本次有效，刷新后可能丢失。";
}
function eventCard(e){
 return `<article class="jl-event ${e.status==="cancel"?"cancel":e.kind}" data-jl-event="${esc(e.id)}"><div class="jl-time"><b>${e.time}</b><span>${C.day(e.end)!==e.date?"次日 ":""}${time(e.end)}</span></div><div class="jl-event-main"><div class="jl-row"><strong>${esc(e.title)}</strong><span class="jl-tag">${stateText(e)}</span></div><p>${esc(coachName(e.coach))} · ${esc(e.location)}</p><small>${e.kind==="private"?"私教":"团课"} · ${e.duration} 分钟${context().role==="member"?"":` · 已约 ${e.count}/${e.capacity}`}</small><div class="jl-event-actions">${button("课程详情","detail",e.id)}${e.status==="cancel"?"":button("加入日历","one",e.id)}</div></div></article>`;
}
function refresh(){
 const x=context();if(!x)return;if(scopeNow!==scopeOf(x)&&dialog?.open)dialog.close();scopeNow=scopeOf(x);
 if(!["member","coach","admin"].includes(x.role)){if(dialog?.open)dialog.close();return;}
 let panel=document.getElementById("jl-calendar");
 if(!panel){panel=document.createElement("section");panel.id="jl-calendar";panel.className="panel jl-calendar";panel.setAttribute("aria-label","课表日历与提醒");document.querySelector(".appbody > .dashboard").after(panel);}
 const focused=document.activeElement,restore=focused?.closest("#jl-calendar")?{id:focused.id,action:focused.dataset.jl,value:focused.dataset.jlId}:null;
 const u=view(),list=filtered(),[from,to]=C.range(u.date,u.mode),next=getEvents().find(e=>C.active(e,Date.now())),p=prefs();
 const title=x.role==="member"?"我的预约日历":x.role==="coach"?`${coachName(x.coach)}的授课日历`:"全店排课日历";
 const rangeTitle=u.mode==="month"?`${u.date.slice(0,4)}年${Number(u.date.slice(5,7))}月`:u.mode==="day"?u.date:`${from.slice(0,4)}年 ${short(from)} — ${short(to)}`;
 const days=C.cells(u.date,u.mode);
 const grid=days.map(d=>{const es=list.filter(e=>e.date===d);return `<button class="jl-day ${d===u.selected?"selected":""} ${d===C.day()?"today":""} ${u.mode==="month"&&d.slice(0,7)!==u.date.slice(0,7)?"outside":""}" data-jl="day" data-jl-id="${d}" aria-pressed="${d===u.selected}" aria-label="${d}，${es.length}节课${d===C.day()?"，今天":""}"><b>${Number(d.slice(8))}</b><span class="jl-dots">${es.slice(0,3).map(e=>`<i class="${e.status==="cancel"?"cancel":e.kind}"></i>`).join("")}</span><small>${es.length?es.length+"节":"—"}</small></button>`;}).join("");
 const daily=list.filter(e=>e.date===u.selected);
 panel.innerHTML=`<div class="jl-header"><div><div class="jl-kicker">YOUR TRAINING CALENDAR</div><h2>${esc(title)}</h2><p>北京时间 UTC+8 · 预约、改约后自动更新本浏览器课表</p></div><div class="jl-actions">${button("提醒设置","settings")}${button("导出当前课表","export")}</div></div>
 <div class="jl-next"><div><span>下一节课</span><strong>${next?esc(next.title):"暂无待上课程"}</strong><small>${next?`${short(next.date)} ${next.time} · ${esc(coachName(next.coach))}`:"选择其他日期查看历史，或先预约 / 发布课程"}</small></div>${next?button("定位课程 →","locate",next.date):""}<span class="jl-remind-state">${p.enabled?"页面提醒已开启":"页面提醒已关闭"}${p.enabled?" · "+p.leads.map(label).join(" / "):""}</span></div>
 <div class="jl-toolbar"><div class="jl-controls">${button("‹","prev","","aria-label='上一时段'")}<strong>${rangeTitle}</strong>${button("›","next","","aria-label='下一时段'")}${button("今天","today")}</div><div class="jl-segments" role="group" aria-label="日历视图">${[["day","日"],["week","周"],["month","月"]].map(([m,t])=>button(t+"视图","mode",m,`aria-pressed="${u.mode===m}"`)).join("")}</div></div>
 <div class="jl-filters"><label>跳转日期<input id="jl-date" type="date" value="${u.selected}" min="2000-01-01" max="2100-12-31"></label><label>课程类型<select id="jl-kind">${[["all","全部课程"],["private","私教"],["group","团课"]].map(([v,t])=>`<option value="${v}" ${u.kind===v?"selected":""}>${t}</option>`).join("")}</select></label>${x.role==="admin"?`<label>筛选教练<select id="jl-coach"><option value="all">全部教练</option>${x.coaches.map(c=>`<option value="${c[0]}" ${u.coach===c[0]?"selected":""}>${esc(c[1])}</option>`).join("")}</select></label>`:""}${x.role==="member"?`<label class="jl-check"><input id="jl-cancel" type="checkbox" ${u.cancel?"checked":""}>显示已取消预约</label>`:""}<span class="jl-legend"><i class="private"></i>私教 <i class="group"></i>团课</span></div>
 <div class="jl-layout ${u.mode==="day"?"day-view":""}">${u.mode==="day"?"":`<div><div class="jl-weekdays">${weekdays.map(w=>`<span>周${w}</span>`).join("")}</div><div class="jl-days ${u.mode}" role="group" aria-label="选择课表日期">${grid}</div><p class="jl-caption">点击日期查看当天课程 · 当前范围 ${list.filter(e=>e.date>=from&&e.date<=to&&e.status!=="cancel").length} 节</p></div>`}<div class="jl-agenda"><div class="jl-agenda-title"><h3>${short(u.selected)}的课表</h3><span>${daily.length} 节</span></div>${daily.map(eventCard).join("")||'<div class="jl-empty"><b>这一天，留一点自由时间。</b><p>当前筛选下没有课程，试试其他日期。</p></div>'}</div></div>
 <details class="jl-reminder-center"><summary>提醒中心 <span id="jl-unread">0</span></summary><p class="jl-caption">只提醒当前角色${x.role==="coach"?"及所选教练":""}的课程，不会给其他人发送消息。日期 / 类型筛选不改变提醒范围。</p><div class="jl-actions">${button("测试提醒","test")}${button("全部已读","allread")}${button("清空已读","clear")}</div><div id="jl-inbox"></div></details>
 <div class="jl-boundary"><b>提醒使用说明</b>：网页保持打开且设备未休眠时检查课前提醒；关闭网页后不保证提醒。需要离线提醒，请导出 .ics 并在设备日历中确认导入及提醒设置。改约 / 取消不会自动更新已导入的日历。</div><p id="jl-save-hint" class="jl-caption"></p>`;
 paintInbox();
 if(restore){const target=restore.id?document.getElementById(restore.id):restore.action?panel.querySelector(`[data-jl="${CSS.escape(restore.action)}"][data-jl-id="${CSS.escape(restore.value||"")}"]`):null;target?.focus({preventScroll:true});}
 void tick();
}
function showSettings(){
 const p=prefs(),name=names[context().role]+(context().role==="coach"?" · "+coachName(context().coach):"");
 openDialog("提醒设置 · "+name,`<form id="jl-settings"><label class="jl-check"><input name="enabled" type="checkbox" ${p.enabled?"checked":""}>开启当前角色的课前提醒</label><fieldset><legend>提前多久提醒（可多选）</legend>${C.LEADS.map(n=>`<label class="jl-check"><input type="checkbox" name="lead" value="${n}" ${p.leads.includes(n)?"checked":""}>${label(n)}</label>`).join("")}</fieldset><p class="jl-caption">网页提醒与日历导出使用相同提前时间；每个角色、每位教练分别保存设置。</p><div class="jl-system"><strong>系统通知（可选）</strong><p id="jl-permission">${p.browser?"已启用；还需系统允许通知。":"未启用，默认只在网页内提醒。"}</p>${button(p.browser?"关闭系统通知":"开启系统通知","permission")}<p class="jl-caption">需要浏览器授权，部分手机浏览器不支持。即使开启，关闭网页后也不会自动推送。</p></div><div class="jl-actions"><button class="jl-btn primary" type="submit">保存提醒设置</button>${button("取消","close")}</div></form>`);
 document.getElementById("jl-settings").onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),leads=f.getAll("lead").map(Number),enabled=f.has("enabled");if(enabled&&!leads.length){bridge.toast("至少选择一个提醒时间");return;}const s=read();s.prefs[scopeNow]={...prefs(),enabled,leads};write(s);dialog.close();refresh();bridge.toast(writable?"提醒设置已保存":"仅本次会话保存：浏览器阻止了本地存储");};
}
async function worker(){
 if(reg?.active)return reg;
 const r=await navigator.serviceWorker.register("./calendar-sw.js?v=20261015-calendar-2",{scope:"./"});
 if(r.active){reg=r;return r;}const w=r.installing||r.waiting;
 if(!w)throw Error("通知组件尚未就绪");
 await new Promise((ok,fail)=>{const timer=setTimeout(()=>fail(Error("通知组件启动超时")),12000);w.addEventListener("statechange",()=>{if(w.state==="activated"){clearTimeout(timer);ok();}else if(w.state==="redundant"){clearTimeout(timer);fail(Error("通知组件不可用"));}});});
 reg=r;return r;
}
async function permission(){
 const s=read(),p=prefs();if(p.browser){s.prefs[scopeNow]={...p,browser:false};write(s);document.getElementById("jl-permission").textContent="已关闭本演示的系统通知。网页内提醒保留。";dialog.querySelector('[data-jl="permission"]').textContent="开启系统通知";return;}
 const who=scopeNow;
 try{
  if(!("Notification" in window)||!isSecureContext)throw Error("当前环境不支持系统通知，请使用网页内提醒或导出日历");
  const allowed=await Notification.requestPermission();if(allowed!=="granted")throw Error("未获得授权，继续使用网页内提醒或日历导出");
  if("serviceWorker" in navigator)await worker();
  const latest=read();latest.prefs[who]={...C.settings(latest.prefs[who]),browser:true};write(latest);
  const el=document.getElementById("jl-permission");if(el){el.textContent="已开启系统通知，可关闭此窗口后点击“测试提醒”。";dialog.querySelector('[data-jl="permission"]').textContent="关闭系统通知";}
 }catch(e){bridge.toast(e.message);const el=document.getElementById("jl-permission");if(el)el.textContent=e.message;}
}
async function systemNotice(n,role){
 if(!prefs().browser||!("Notification" in window)||Notification.permission!=="granted")return;
 const options={body:n.body,tag:n.id,data:{role}};
 try{if("serviceWorker" in navigator){await (await worker()).showNotification(n.title,options);}else{const item=new Notification(n.title,options);item.onclick=()=>{window.focus();item.close();};}}
 catch{bridge.toast("系统通知未能显示，提醒已保存在网页提醒中心");}
}
async function tick(){
 if(busy||!bridge)return;const x=context();if(!["member","coach","admin"].includes(x.role))return;busy=true;
 const run=async()=>{
  const current=context();if(!["member","coach","admin"].includes(current.role))return;
  const who=scopeOf(current),now=Date.now(),s=read(),ev=getEvents(),p=C.settings(s.prefs[who]),sent=[];
  const allowed=new Set(ev.filter(e=>C.active(e,now)).map(e=>e.id+"|"+e.start));
  s.notices=s.notices.filter(n=>n.scope!==who||n.test||allowed.has(n.eventId+"|"+n.start));
  for(const item of C.due(ev,p,who,s.seen,now)){
   for(const k of item.consume)s.seen[k]=now;
   const e=item.event,n={id:item.id,eventId:e.id,start:e.start,scope:who,at:now,read:false,title:"课前提醒 · "+names[current.role],body:`${e.title}，${short(e.date)} ${e.time}，${coachName(e.coach)}教练，距开始约 ${Math.max(1,Math.ceil((e.start-now)/C.MIN))} 分钟。`};
   s.notices.unshift(n);sent.push(n);
  }
  s.seen=Object.fromEntries(Object.entries(s.seen).filter(([,at])=>at>now-32*C.DAY).slice(-5000));write(s);paintInbox();
  if(sent.length){bridge.toast(sent.length===1?sent[0].body:`有 ${sent.length} 条课前提醒，请查看提醒中心`);for(const n of sent)await systemNotice(n,current.role);}
 };
 try{if(navigator.locks)await navigator.locks.request("jingluo-calendar-dispatch",run);else await run();}catch(e){console.warn("Calendar reminder check:",e.message);}finally{busy=false;}
}
function exportEvents(list){
 list=list.filter(e=>e.status!=="cancel");if(!list.length){bridge.toast("当前范围没有可导出的课程");return;}
 const name=names[context().role]+(context().role==="coach"?"-"+coachName(context().coach):""),content=C.ics(list,prefs(),scopeNow,name);
 const url=URL.createObjectURL(new Blob([content],{type:"text/calendar;charset=utf-8"})),a=document.createElement("a");a.href=url;a.download=`鲸落健身-${name}-${C.day()}.ics`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
 openDialog("日历文件已准备",`<p>已发起下载，包含 <b>${list.length}</b> 节课。请在手机 / 电脑的日历应用中打开 .ics 文件，并确认保存。</p><p>文件${prefs().enabled?"包含 "+prefs().leads.map(label).join("、")+" 的提醒设置":"未附加提醒（当前已关闭）"}。是否保留提醒由日历应用决定，导入后请检查。</p><div class="jl-boundary">这不是自动订阅。再次导入可能产生重复项目；改约或取消后，请手动更新 / 删除设备日历中的旧课程。不要将演示课表用于真实训练安排。</div>`);
}
function detail(id){const e=getEvents().find(e=>e.id===id);if(!e){bridge.toast("课程已变化，请刷新课表");return;}
 const role=context().role,actions=role==="member"&&e.status==="booked"?button("查看凭证","original","ticket:"+e.bid)+button("改约","original","change:"+e.bid)+button("取消预约","original","cancel:"+e.bid):role==="coach"&&e.bid?"":"";
 openDialog(e.title,`<div class="jl-detail"><p><b>日期时间</b>${e.date} ${e.time} — ${time(e.end)}（北京时间）</p><p><b>教练 / 场地</b>${esc(coachName(e.coach))} · ${esc(e.location)}</p><p><b>课程</b>${e.kind==="private"?"私教":"团课"} · ${e.duration} 分钟 · ${stateText(e)}</p>${role==="member"?"":`<p><b>预约人数</b>${e.count} / ${e.capacity}</p>`}</div><div class="jl-actions">${actions}${e.status==="cancel"?"":button("加入设备日历","one",e.id)}</div><p class="jl-caption">原有课程未配置时长时按 60 分钟演示；新增课程可设置时长。所有内容为虚构。</p>`);
}
document.addEventListener("click",e=>{
 const b=e.target.closest("[data-jl]");if(!b||!bridge)return;const a=b.dataset.jl,id=b.dataset.jlId,u=view();
 if(a==="close"){dialog?.close();return;}
 if(a==="settings"){showSettings();return;}
 if(a==="permission"){void permission();return;}
 if(a==="detail"){detail(id);return;}
 if(a==="one"){exportEvents(getEvents().filter(e=>e.id===id));return;}
 if(a==="export"){const [f,t]=C.range(u.date,u.mode);exportEvents(filtered().filter(e=>e.date>=f&&e.date<=t));return;}
 if(a==="original"){dialog.close();const cut=id.indexOf(":");bridge.act(id.slice(0,cut),id.slice(cut+1));return;}
 if(a==="test"){const s=read(),n={id:"test:"+Date.now(),scope:scopeNow,at:Date.now(),test:true,read:false,title:"演示提醒 · "+names[context().role],body:"这是一条测试提醒。没有新增预约，也没有向其他人发送消息。"};s.notices.unshift(n);write(s);paintInbox();bridge.toast(n.body);void systemNotice(n,context().role);return;}
 if(["read","allread","clear"].includes(a)){const s=read();if(a==="clear")s.notices=s.notices.filter(n=>n.scope!==scopeNow||!n.read);else for(const n of s.notices)if(n.scope===scopeNow&&(a==="allread"||n.id===id))n.read=true;write(s);paintInbox();return;}
 if(a==="mode"&&["day","week","month"].includes(id)){u.mode=id;u.date=u.selected;}
 if(["day","locate"].includes(a)&&Number.isFinite(C.parse(id))){u.selected=id;if(a==="locate"||u.mode==="day"||id.slice(0,7)!==u.date.slice(0,7))u.date=id;}
 if(a==="today")u.date=u.selected=C.day();
 if(a==="prev"||a==="next"){const n=a==="prev"?-1:1;u.date=u.mode==="month"?C.month(u.date,n):C.shift(u.date,n*(u.mode==="week"?7:1));u.selected=u.date;}
 refresh();
});
document.addEventListener("change",e=>{if(!bridge)return;const u=view(),v=e.target.value;
 if(e.target.id==="jl-date"&&Number.isFinite(C.parse(v))){u.date=u.selected=v;refresh();}
 if(e.target.id==="jl-kind"){u.kind=v;refresh();}
 if(e.target.id==="jl-coach"){u.coach=v;refresh();}
 if(e.target.id==="jl-cancel"){u.cancel=e.target.checked;refresh();}
});
addEventListener("storage",e=>{if(e.key===STORE){read();paintInbox();}});
document.addEventListener("visibilitychange",()=>{if(!document.hidden)void tick();});
addEventListener("focus",()=>void tick());
window.JLCalendar={connect(b){bridge=b;setInterval(()=>void tick(),15000);},refresh,check:tick,reset(){write({v:1,prefs:{},seen:{},notices:[]});views.clear();if(dialog?.open)dialog.close();}};
})();
