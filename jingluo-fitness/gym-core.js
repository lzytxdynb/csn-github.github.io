/* Pure business rules for FICTIONAL single-browser data. NOT server authorization. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.JLGymCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const DAY=86400000,MIN=60000,KINDS=['private','group'];
const clone=x=>JSON.parse(JSON.stringify(x));
const day=t=>new Date(t+8*3600000).toISOString().slice(0,10);
const fail=code=>{throw new Error(code);};
function midnight(d){if(!/^\d{4}-\d{2}-\d{2}$/.test(d))fail('invalid_date');const t=Date.parse(d+'T00:00:00+08:00');if(!Number.isFinite(t)||day(t)!==d)fail('invalid_date');return t;}
function interval(s){if(!Array.isArray(s)||!KINDS.includes(s[2])||!/^([01]\d|2[0-3]):[0-5]\d$/.test(s[5]))fail('invalid_slot');const start=midnight(s[4])+(Number(s[5].slice(0,2))*60+Number(s[5].slice(3)))*MIN;const duration=s[8]==null?60:Number(s[8]);if(!Number.isInteger(duration)||duration<15||duration>240)fail('invalid_duration');return [start,start+duration*MIN];}
const overlap=(a,b)=>a[0]<b[1]&&b[0]<a[1];
const byId=(d,id)=>d.slots.find(s=>s[0]===id);
const balance=(d,k)=>Number.isFinite(d[k])?d[k]:0;
function migrate(d,now=Date.now()){
 if(!d||!Array.isArray(d.slots)||!Array.isArray(d.bookings))fail('invalid_data');
 if(!d.gym){d.gym={v:1,cards:{private:{expires:day(now+90*DAY),freeze:null},group:{expires:day(now+90*DAY),freeze:null}},requests:[],policy:{bookingMinutes:30,cancelMinutes:120},audit:[]};}
 if(d.gym.v!==1||!d.gym.cards||!Array.isArray(d.gym.requests)||!Array.isArray(d.gym.audit))fail('invalid_data');
 return d;
}
function cardStatus(d,kind,now=Date.now()){
 migrate(d,now);if(!KINDS.includes(kind))fail('invalid_kind');const c=d.gym.cards[kind];
 const expired=midnight(c.expires)+DAY<=now,frozen=!!(c.freeze&&c.freeze.from<=now&&now<c.freeze.until);
 return {state:expired?'expired':frozen?'frozen':'active',expires:c.expires,balance:balance(d,kind),days:Math.ceil((midnight(c.expires)+DAY-now)/DAY),resume:c.freeze?.until||null};
}
function guard(d,actor,action,p={},now=Date.now()){
 migrate(d,now);const r=actor?.role,coach=actor?.coach;
 if(['issue','news','new','rules','review','extend'].includes(action)&&r!=='admin')fail('admin_only');
 if(['reserve','change','cancel','request','withdraw','ticket'].includes(action)&&r!=='member')fail('member_only');
 if(['checkin','note'].includes(action)&&r!=='coach')fail('coach_only');
 if(action==='reserve'||action==='change'){
  const old=action==='change'?d.bookings.find(b=>b.id===p.booking):null;
  if(action==='change'){if(!old||old.status!=='booked')fail('not_booked');guard(d,actor,'cancel',{booking:old.id},now);}
  const s=byId(d,p.slot);if(!s)fail('missing_slot');const t=interval(s);
  if(t[0]-now<Math.max(1,d.gym.policy.bookingMinutes)*MIN)fail('booking_cutoff');
  const c=cardStatus(d,s[2],now);if(c.state!=='active')fail('card_'+c.state);if(t[0]>=midnight(c.expires)+DAY)fail('course_after_expiry');
  if(old&&byId(d,old.slot)?.[2]!==s[2])fail('different_kind');
  if(!old&&balance(d,s[2])<1)fail('insufficient_credit');
  const active=d.bookings.filter(b=>b.id!==old?.id&&b.status!=='cancel');
  if(active.some(b=>b.slot===s[0]))fail('duplicate_booking');
  if(active.filter(b=>b.slot===s[0]).length>=s[6])fail('full');
  if(active.some(b=>{const o=byId(d,b.slot);return o&&overlap(t,interval(o));}))fail('member_overlap');
 }
 if(action==='cancel'){
  const b=d.bookings.find(b=>b.id===p.booking);if(!b||b.status!=='booked')fail('not_booked');const s=byId(d,b.slot);if(!s)fail('missing_slot');
  if(interval(s)[0]-now<Math.max(1,d.gym.policy.cancelMinutes)*MIN)fail('cancel_cutoff');
 }
 if(action==='checkin'||action==='note'){
  const b=d.bookings.find(b=>b.id===p.booking),s=b&&byId(d,b.slot);if(!s||s[3]!==coach)fail('wrong_coach');
  if(action==='note'&&b.status!=='done')fail('not_completed');
  if(action==='checkin'){
   if(b.status!=='booked')fail('not_booked');const t=interval(s);if(now<t[0]-15*MIN||now>t[1]+48*3600000)fail('checkin_window');
  }
 }
 if(action==='new'){
  const s=p.session,t=interval(s);if(t[0]<=now)fail('past_slot');if(!['c1','c2','c3'].includes(s[3]))fail('invalid_coach');
  if(!Number.isInteger(s[6])||s[6]<1||s[6]>30||(s[2]==='private'&&s[6]!==1))fail('invalid_capacity');
  for(const other of d.slots){if(overlap(t,interval(other))){if(other[3]===s[3])fail('coach_overlap');if(other[7]===s[7])fail('room_overlap');}}
 }
 return true;
}
function audit(d,actor,event,now){d.gym.audit.unshift({at:new Date(now).toISOString(),actor:actor.role,event});d.gym.audit=d.gym.audit.slice(0,200);d.logs.unshift(new Date(now).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})+' [DEMO] '+event);}
function execute(input,actor,action,p={},now=Date.now()){
 const d=migrate(clone(input),now);guard(d,actor,action,p,now);
 if(action==='request'){
  if(!KINDS.includes(p.kind))fail('invalid_kind');if(!Number.isInteger(p.days)||p.days<1||p.days>30)fail('invalid_days');if(!['travel','rest','other'].includes(p.reason))fail('invalid_reason');
  if(cardStatus(d,p.kind,now).state!=='active')fail('card_unavailable');if(d.gym.requests.some(x=>x.kind===p.kind&&x.status==='pending'))fail('pending_exists');
  d.gym.requests.unshift({id:'freeze-'+now+'-'+d.gym.requests.length,kind:p.kind,days:p.days,reason:p.reason,status:'pending',created:new Date(now).toISOString()});
  audit(d,actor,'freeze_requested:'+p.kind,now);
 }else if(action==='withdraw'||action==='review'){
  const req=d.gym.requests.find(x=>x.id===p.id);if(!req||req.status!=='pending')fail('not_pending');
  if(action==='withdraw'){req.status='withdrawn';}
  else{
   if(!['approve','reject'].includes(p.decision))fail('invalid_decision');
   if(p.decision==='approve'){
    if(cardStatus(d,req.kind,now).state!=='active')fail('card_unavailable');const until=now+req.days*DAY;
    if(d.bookings.some(b=>{const s=byId(d,b.slot);return b.status==='booked'&&s?.[2]===req.kind&&overlap(interval(s),[now,until]);}))fail('freeze_has_bookings');
    const c=d.gym.cards[req.kind];c.freeze={from:now,until};c.expires=day(midnight(c.expires)+req.days*DAY);req.status='approved';req.until=until;
   }else req.status='rejected';
  }
  req.resolved=new Date(now).toISOString();audit(d,actor,'freeze_'+req.status+':'+req.kind,now);
 }else if(action==='extend'){
  if(!KINDS.includes(p.kind))fail('invalid_kind');const t=midnight(p.expires),c=d.gym.cards[p.kind];
  if(t<=midnight(c.expires)||t<midnight(day(now))||t>now+3*366*DAY)fail('invalid_extension');c.expires=p.expires;audit(d,actor,'expiry_extended:'+p.kind+':'+p.expires,now);
 }else if(action==='rules'){
  if(!Number.isInteger(p.bookingMinutes)||p.bookingMinutes<5||p.bookingMinutes>1440||!Number.isInteger(p.cancelMinutes)||p.cancelMinutes<5||p.cancelMinutes>10080)fail('invalid_rules');
  d.gym.policy={bookingMinutes:p.bookingMinutes,cancelMinutes:p.cancelMinutes};audit(d,actor,'booking_policy_updated',now);
 }else fail('unsupported_action');
 return d;
}
return {DAY,MIN,day,midnight,interval,overlap,migrate,cardStatus,guard,execute,clone};
});
