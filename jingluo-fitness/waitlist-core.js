/* Fictional, single-browser waitlist. Offers reserve seats; credits are only debited on claim. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.JLDemoWaitlist=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const MIN=60000,clone=x=>JSON.parse(JSON.stringify(x));
const fail=code=>{throw Error(code);};
const core=()=>globalThis.JLGymCore||(typeof require==='function'?require('./gym-core.js'):null);
function migrate(d){
 if(!d||!Array.isArray(d.slots)||!Array.isArray(d.bookings)||!d.demoMembers?.accounts)fail('invalid_waitlist_data');
 if(!d.waitlist)d.waitlist={v:1,seq:0,offerMinutes:30,entries:[]};
 const w=d.waitlist;
 if(w.v!==1||!Number.isSafeInteger(w.seq)||w.seq<0||!Number.isSafeInteger(w.offerMinutes)||w.offerMinutes<5||w.offerMinutes>120||!Array.isArray(w.entries))fail('invalid_waitlist_data');
 return d;
}
function activeBookingCount(d,slot){return d.bookings.filter(b=>b.slot===slot&&b.status!=='cancel').length;}
function cutoff(d,s){return core().interval(s)[0]-Math.max(1,Number(d.gym?.policy?.bookingMinutes)||30)*MIN;}
function reservedCount(d,slot,now=Date.now()){
 const s=d.slots.find(x=>x[0]===slot);
 if(!s||!d.waitlist?.entries||core().classCancelled(d,slot)||now>=cutoff(d,s))return 0;
 return d.waitlist.entries.filter(e=>e.slot===slot&&e.status==='offered'&&Number.isFinite(e.expiresAt)&&e.expiresAt>now).length;
}
function remaining(d,s,now=Date.now()){
 return Math.max(0,Number(s[6])-activeBookingCount(d,s[0])-reservedCount(d,s[0],now));
}
function current(d,member,slot){
 return (d.waitlist?.entries||[]).find(e=>e.memberId===member&&e.slot===slot&&(e.status==='queued'||e.status==='offered'))||null;
}
function log(d,s){if(Array.isArray(d.logs)){d.logs.unshift(new Date().toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})+' [DEMO] '+s);d.logs=d.logs.slice(0,250);}}
function advance(d,now=Date.now()){
 migrate(d);let changed=false;const w=d.waitlist;
 for(const e of w.entries){
  if(e.status!=='queued'&&e.status!=='offered')continue;
  const s=d.slots.find(x=>x[0]===e.slot);
  if(!s||core().classCancelled(d,e.slot)||now>=cutoff(d,s)){
   e.status='closed';e.closedAt=now;changed=true;continue;
  }
  if(e.status==='offered'&&(!Number.isFinite(e.expiresAt)||e.expiresAt<=now)){
   e.status='expired';e.closedAt=now;changed=true;log(d,'候补确认超时：'+s[1]);
  }
 }
 for(const s of d.slots){
  if(core().classCancelled(d,s[0])||now>=cutoff(d,s))continue;
  let available=remaining(d,s,now);
  if(available<=0)continue;
  const queued=w.entries.filter(e=>e.slot===s[0]&&e.status==='queued').sort((a,b)=>a.seq-b.seq);
  for(const e of queued){
   if(available<=0)break;
   if(d.bookings.some(b=>b.slot===s[0]&&b.status!=='cancel'&&(b.memberId||'m1')===e.memberId)){
    e.status='closed';e.closedAt=now;changed=true;continue;
   }
   const until=Math.min(now+w.offerMinutes*MIN,cutoff(d,s));
   if(until<=now)break;
   e.status='offered';e.offeredAt=now;e.expiresAt=until;changed=true;available--;
   log(d,'已向演示会员开放候补确认：'+s[1]+'（只在本浏览器显示，未发送消息）');
  }
 }
 if(w.entries.length>500){
  const retained=w.entries.filter(e=>e.status==='queued'||e.status==='offered');
  const past=w.entries.filter(e=>e.status!=='queued'&&e.status!=='offered').slice(-Math.max(0,500-retained.length));
  w.entries=[...past,...retained];changed=true;
 }
 return changed;
}
function list(d,member){migrate(d);return d.waitlist.entries.filter(e=>!member||e.memberId===member).slice().sort((a,b)=>b.seq-a.seq);}
function position(d,e){migrate(d);if(e.status!=='queued')return null;return d.waitlist.entries.filter(x=>x.slot===e.slot&&x.status==='queued'&&x.seq<=e.seq).length;}
function execute(input,actor,action,p={},now=Date.now()){
 const d=migrate(clone(input));advance(d,now);
 if(actor?.role!=='member'||actor.memberId!==d.demoMembers.active)fail('member_only');
 const member=actor.memberId;if(!d.demoMembers.accounts.some(x=>x.id===member))fail('unknown_member');
 if(action==='join'){
  const s=d.slots.find(x=>x[0]===p.slot);if(!s)fail('missing_slot');
  if(core().classCancelled(d,s[0]))fail('class_cancelled');
  if(now>=cutoff(d,s))fail('booking_cutoff');
  const desired=core().interval(s);
  if(d.bookings.some(b=>b.status!=='cancel'&&b.slot===s[0]&&(b.memberId||'m1')===member))fail('duplicate_booking');
  if(d.bookings.some(b=>{if(b.status==='cancel'||(b.memberId||'m1')!==member)return false;const other=d.slots.find(x=>x[0]===b.slot);if(!other)return false;const old=core().interval(other);return desired[0]<old[1]&&old[0]<desired[1];}))fail('member_overlap');
  if(current(d,member,s[0]))fail('waitlist_duplicate');
  let full=false;
  try{core().guard(d,{role:'member'},'reserve',{slot:s[0]},now);}catch(e){if(e.message!=='full')throw e;full=true;}
  if(!full)fail('seat_available');
  const n=++d.waitlist.seq;
  d.waitlist.entries.push({id:'wl-'+n,seq:n,slot:s[0],memberId:member,status:'queued',joinedAt:now});
  log(d,'演示会员候补登记：'+s[1]+'（尚未扣除课时）');
 }else if(action==='claim'||action==='leave'){
  const e=d.waitlist.entries.find(x=>x.id===p.entry);
  if(!e||e.memberId!==member)fail('not_owner');
  const s=d.slots.find(x=>x[0]===e.slot);if(!s)fail('missing_slot');
  if(action==='leave'){
   if(e.status!=='queued'&&e.status!=='offered')fail('waitlist_inactive');
   e.status='withdrawn';e.closedAt=now;log(d,'演示会员退出候补：'+s[1]);
  }else{
   if(e.status!=='offered'||!Number.isFinite(e.expiresAt)||e.expiresAt<=now)fail('offer_expired');
   e.status='claimed'; // Frees this member's held seat only in the cloned transaction.
   core().guard(d,{role:'member'},'reserve',{slot:e.slot},now);
   if(!Number.isSafeInteger(d[s[2]])||d[s[2]]<1)fail('insufficient_credit');
   d[s[2]]--;
   const bid='b-wl-'+e.seq;
   if(d.bookings.some(b=>b.id===bid))fail('duplicate_booking');
   d.bookings.unshift({id:bid,slot:e.slot,memberId:member,status:'booked',code:'JLW'+String(e.seq).padStart(5,'0'),note:''});
   e.bookingId=bid;e.claimedAt=now;
   log(d,'演示会员确认候补：'+s[1]+'，已扣除1节模拟课时');
  }
 }else fail('unsupported_action');
 advance(d,now);
 return d;
}
return Object.freeze({migrate,advance,execute,remaining,reservedCount,current,list,position});
});