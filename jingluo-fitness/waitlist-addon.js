/* Fictional waitlist layer over the existing three-role demo; no real notifications. */
(()=>{'use strict';
const W=window.JLDemoWaitlist,C=window.JLGymCore,O=window.JLOps;
if(!W||!C||!O)throw Error('waitlist_dependency_missing');
let bridge,committing=false;
const esc=x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label={queued:'排队中',offered:'待确认名额',claimed:'已确认',withdrawn:'已退出',expired:'已超时',closed:'已结束/停课'};
const action=(type,title,id)=>'<button type="button" class="btn small light" data-jlw="'+type+'" data-jlw-id="'+esc(id)+'">'+title+'</button>';
const baseConnect=O.connect,baseRefresh=O.refresh;
O.connect=function(b){bridge=b;return baseConnect.call(O,b)};
O.refresh=function(){const output=baseRefresh.apply(O,arguments);refresh();return output};
function refresh(){
 if(!bridge)return;const ctx=bridge.get();if(!['member','coach','admin'].includes(ctx.role))return;
 const next=JSON.parse(JSON.stringify(ctx.data));W.migrate(next);const changed=W.advance(next,Date.now());
 if((!ctx.data.waitlist||changed)&&!committing){try{committing=true;bridge.commit(next);return}catch(err){bridge.toast('候补状态无法写入浏览器存储')}finally{committing=false}}
 const data=ctx.data,mid=data.demoMembers.active;
 if(ctx.role==='member'){
  for(const b of document.querySelectorAll('button[data-a="reserve"]')){
   const s=data.slots.find(x=>x[0]===b.dataset.id);if(!s||C.classCancelled(data,s[0]))continue;
   if(data.bookings.some(x=>x.slot===s[0]&&x.status!=='cancel'&&(x.memberId||'m1')===mid))continue;
   const w=W.current(data,mid,s[0]),free=W.remaining(data,s,Date.now());
   if(!w&&free>0)continue;
   const kind=w?.status==='offered'?'claim':w?'queued':'join';
   b.removeAttribute('data-a');b.dataset.jlw=kind;b.dataset.jlwId=w?w.id:s[0];
   b.textContent=kind==='claim'?'确认候补名额':kind==='queued'?'已加入候补':'加入候补';
   b.disabled=kind==='queued'||C.interval(s)[0]-Date.now()<(data.gym?.policy?.bookingMinutes||30)*60000;
   const p=b.closest('.course')?.querySelector('p');if(p)p.textContent=p.textContent.replace(/剩余\s+\d+\s*\/\s*\d+\s+个名额/,'可预约 '+free+' / '+s[6]+' 个名额（含候补预留）');
  }
 }
 const main=document.querySelector('main.appbody');if(!main)return;
 let panel=document.getElementById('jl-waitlist');if(!panel){panel=document.createElement('section');panel.id='jl-waitlist';panel.className='panel jl-waitlist';(document.getElementById('jl-gym')||main.querySelector('.dashboard')||main).after(panel)}
 let list=W.list(data,ctx.role==='member'?mid:null);
 if(ctx.role==='coach')list=list.filter(e=>data.slots.find(s=>s[0]===e.slot)?.[3]===ctx.coach);
 const active=list.filter(e=>e.status==='queued'||e.status==='offered').length;
 const rows=list.slice(0,20).map(e=>{const s=data.slots.find(x=>x[0]===e.slot);if(!s)return '';
  const name=ctx.role==='member'?'':' · '+esc(data.demoMembers.accounts.find(x=>x.id===e.memberId)?.name||'未知演示会员');
  const detail=e.status==='queued'?' · 候补第'+W.position(data,e)+'位':e.status==='offered'?' · 剩余约'+Math.max(0,Math.ceil((e.expiresAt-Date.now())/60000))+'分钟':'';
  const buttons=ctx.role==='member'?(e.status==='offered'?action('claim','确认名额',e.id):'')+(['offered','queued'].includes(e.status)?action('leave','退出候补',e.id):''):'';
  return '<div class="jl-wait-row"><div><strong>'+esc(s[1])+'</strong><p>'+esc(s[4]+' '+s[5])+name+' · '+(label[e.status]||'未知状态')+detail+'</p></div><div class="jl-wait-actions">'+buttons+'</div></div>';
 }).join('');
 const title=ctx.role==='member'?'我的候补':ctx.role==='coach'?'教练候补概览':'门店候补概览';
 panel.innerHTML='<div class="jl-wait-head"><h2>'+title+'</h2><span class="badge">'+active+' 条进行中</span></div>'+(rows||'<p class="jl-wait-empty">暂无候补记录。会员可以在满员课程点击“加入候补”。</p>')+'<p class="jl-wait-note">按先来后到限时补位；只在此浏览器查看或操作，不发送真实通知。确认成功才扣1节模拟课时；网页关闭后没有后台推送。</p>';
}
function show(type,id){let d=document.getElementById('jl-wait-dialog');if(!d){d=document.createElement('dialog');d.id='jl-wait-dialog';d.className='gym-dialog';document.body.append(d)}
 const title=type==='join'?'加入候补':type==='claim'?'确认补位':'退出候补';
 const note=type==='join'?'不扣课时，出现名额后限时确认。':type==='claim'?'仅确认成功后扣1节模拟课时；再次检查余额、有效期和时间冲突。':'退出后将释放预留名额，不涉及课时扣除或返还。';
 d.innerHTML='<form><h2>'+title+'</h2><p class="gym-note">'+note+' 本操作不会发送微信消息。</p><p id="jl-wait-error" role="alert"></p><div class="gym-actions"><button type="button" data-jlw="close" class="btn light">返回</button><button class="btn" type="submit">确定</button></div></form>';
 d.querySelector('form').onsubmit=ev=>{ev.preventDefault();try{const ctx=bridge.get(),memberId=ctx.data.demoMembers.active;const next=W.execute(ctx.data,{role:ctx.role,memberId},type,type==='join'?{slot:id}:{entry:id});bridge.commit(next);d.close();bridge.toast(type==='claim'?'候补确认成功，扣除1节演示课时':'已更新演示候补状态')}catch(e){d.querySelector('#jl-wait-error').textContent=e.message}};d.showModal();
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-jlw]');if(!b)return;if(b.dataset.jlw==='queued')return;if(b.dataset.jlw==='close'){document.getElementById('jl-wait-dialog')?.close();return}show(b.dataset.jlw,b.dataset.jlwId)});
setInterval(refresh,15000);
})();
