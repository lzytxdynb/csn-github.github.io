const test=require('node:test');
const assert=require('node:assert/strict');
const G=require('./gym-core.js');
const Cal=require('./calendar-core.js');
const NOW=Date.parse('2030-01-01T10:00:00+08:00');
const A={role:'admin'},M={role:'member'},Coach={role:'coach',coach:'c1'};
const seed=()=>G.migrate({v:5,private:7,group:5,news:['演示欢迎'],logs:[],slots:[
 ['s1','体验私教','private','c1','2030-01-03','10:00',1,'A',60],
 ['s2','团课','group','c2','2030-01-04','09:00',3,'B',60],
 ['s3','替代课程','private','c3','2030-01-05','09:00',1,'C',60]],bookings:[
 {id:'b1',slot:'s1',status:'booked',code:'JL001',note:''},
 {id:'b2',slot:'s2',status:'booked',code:'JL002',note:''},
 {id:'b3',slot:'s2',status:'cancel',code:'JL003',note:''}],},NOW);
const stop=(d,p={slot:'s2',reason:'venue'},time=NOW)=>G.execute(d,A,'classCancel',p,time);
const err=(fn,code)=>assert.throws(fn,e=>e.message===code);

test('legacy migration creates empty cancellation record without changing original identities',()=>{
 const d=seed(); assert.deepEqual(d.gym.cancelledClasses,{});assert.equal(d.bookings[0].id,'b1');
 const snap=JSON.stringify(d);G.migrate(d,NOW+1000);assert.equal(JSON.stringify(d),snap);
});
test('merchant closure refunds booked once and preserves unrelated bookings',()=>{
 const d=seed(),before=JSON.stringify(d),x=stop(d);
 assert.equal(JSON.stringify(d),before,'atomic pure transition');
 assert.equal(x.group,6);assert.equal(x.private,7);
 assert.equal(x.bookings[1].status,'cancel');assert.equal(x.bookings[1].cancelReason,'merchant_class_cancel');assert.equal(x.bookings[1].refunded,true);
 assert.equal(x.bookings[2].refunded,undefined,'existing cancellation receives no extra refund');
 assert.equal(x.bookings[0].status,'booked');assert.equal(x.gym.cancelledClasses.s2.refunded,1);
});
test('closure logs structured reason, timestamp and browser-only notice',()=>{
 const x=stop(seed());assert.equal(x.gym.audit[0].actor,'admin');
 assert.match(x.gym.audit[0].event,/class_cancelled:s2:venue:refunded=1/);
 assert.equal(x.gym.cancelledClasses.s2.at,new Date(NOW).toISOString());
 assert.match(x.news[0],/演示停课通知/);assert.match(x.news[0],/此浏览器内返还/);
 assert.match(x.news[0],/未发送给真实会员/);
});
test('repeat closure cannot duplicate a balance refund',()=>{
 const x=stop(seed()),snapshot=JSON.stringify(x);err(()=>stop(x),'already_cancelled');assert.equal(JSON.stringify(x),snapshot);
});
test('member and coach cannot close class',()=>{
 for(const actor of [M,Coach])err(()=>G.execute(seed(),actor,'classCancel',{slot:'s2',reason:'venue'},NOW),'admin_only');
});
test('invalid reason and missing slot fail without state changes',()=>{
 const d=seed(),before=JSON.stringify(d);
 err(()=>stop(d,{slot:'s2',reason:'patient diagnosis'}),'invalid_reason');
 err(()=>stop(d,{slot:'not-here',reason:'venue'}),'missing_slot');
 assert.equal(JSON.stringify(d),before);
});
test('started course cannot be cancelled by merchant in this demo',()=>{
 const t=G.interval(seed().slots[1])[0];err(()=>stop(seed(),{slot:'s2',reason:'venue'},t),'class_started');
});
test('completed historical booking blocks closure and protects attendance history',()=>{
 const d=seed();d.bookings[1].status='done';err(()=>stop(d),'completed_bookings');assert.equal(d.bookings[1].status,'done');
});
test('closed class blocks future reservation and reschedule even when a free seat exists',()=>{
 const d=stop(seed());err(()=>G.guard(d,M,'reserve',{slot:'s2'},NOW),'class_cancelled');
 err(()=>G.guard(d,M,'change',{booking:'b1',slot:'s2'},NOW),'class_cancelled');
});
test('closed class gives up its instructor and room for a replacement schedule',()=>{
 const d=stop(seed()),s=['new','新体验课','group','c2','2030-01-04','09:00',5,'B',60];
 assert.equal(G.guard(d,A,'new',{session:s},NOW),true);
});
test('calendar marks closed session and its booking cancelled and omits ICS/reminders',()=>{
 const d=stop(seed()),one=Cal.events(d,'admin','c1').find(e=>e.sid==='s2');
 assert.equal(one.status,'cancel');
 const member=Cal.events(d,'member','c1').find(e=>e.bid==='b2');assert.equal(member.status,'cancel');
 const events=Cal.events(d,'admin','c1');const ics=Cal.ics(events,Cal.settings({leads:[30]}),'admin','演示商家',NOW);
 assert.doesNotMatch(ics,/团课/);assert(!Cal.active(one,NOW));
 assert.equal(Cal.due(events,Cal.settings({leads:[30]}),'admin',{},G.interval(d.slots[1])[0]-10*60000).some(x=>x.event.sid==='s2'),false);
});
test('member still sees cancellation history while active reservation is untouched',()=>{
 const d=stop(seed()),list=Cal.events(d,'member','c1');
 assert(list.some(e=>e.bid==='b2'&&e.status==='cancel'));
 assert(list.some(e=>e.bid==='b1'&&e.status==='booked'));
});
