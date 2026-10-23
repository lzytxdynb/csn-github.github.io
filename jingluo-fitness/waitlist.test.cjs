const test=require('node:test'),assert=require('node:assert/strict');
const W=require('./waitlist-core.js'),C=require('./gym-core.js'),M=require('./members-core.js');
globalThis.JLGymCore=C;globalThis.JLDemoMembers=M;globalThis.JLDemoWaitlist=W;
const now=Date.parse('2030-01-01T08:00:00+08:00');
const actor=d=>({role:'member',memberId:d.demoMembers.active});
function seed(){
 const d={v:5,private:9,group:8,logs:[],news:[],slots:[['s1','演示私教','private','c1','2030-01-02','09:30',1,'A',60]],bookings:[{id:'b1',slot:'s1',memberId:'m1',status:'booked'}]};
 C.migrate(d,now);M.migrate(d);M.select(d,'m2');W.migrate(d);return d;
}
const join=d=>W.execute(d,actor(d),'join',{slot:'s1'},now);
const release=d=>{d.bookings[0].status='cancel';W.advance(d,now);return d;};
const fail=(fn,code)=>assert.throws(fn,e=>e.message===code);
test('legacy migration and join preserve credits',()=>{const d=seed(),before=d.private;const x=join(d);assert.equal(x.private,before);assert.equal(x.waitlist.entries[0].status,'queued');assert.equal(d.waitlist.entries.length,0);});
test('duplicate queue and existing booking forbidden',()=>{let d=join(seed());fail(()=>join(d),'waitlist_duplicate');M.select(d,'m1');fail(()=>join(d),'duplicate_booking');});
test('FIFO offer after cancellation reserves the seat',()=>{
 let d=join(seed());M.select(d,'m3');d=join(d);release(d);
 assert.deepEqual(d.waitlist.entries.map(e=>e.status),['offered','queued']);
 assert.equal(W.remaining(d,d.slots[0],now),0);
 fail(()=>C.guard(d,{role:'member'},'reserve',{slot:'s1'},now),'full');
});
test('claim exactly once; member owns new booking',()=>{
 let d=release(join(seed()));const start=d.private;d=W.execute(d,actor(d),'claim',{entry:'wl-1'},now);
 assert.equal(d.private,start-1);assert.equal(d.bookings[0].memberId,'m2');
 fail(()=>W.execute(d,actor(d),'claim',{entry:'wl-1'},now),'offer_expired');
});
test('wrong member cannot claim or withdraw',()=>{
 let d=release(join(seed()));M.select(d,'m3');
 fail(()=>W.execute(d,actor(d),'claim',{entry:'wl-1'},now),'not_owner');
 fail(()=>W.execute(d,actor(d),'leave',{entry:'wl-1'},now),'not_owner');
});
test('declined offer promotes next member without changing credits',()=>{
 let d=join(seed());M.select(d,'m3');d=join(d);release(d);M.select(d,'m2');const balance=d.private;
 d=W.execute(d,actor(d),'leave',{entry:'wl-1'},now);
 assert.equal(d.private,balance);assert.equal(d.waitlist.entries[1].status,'offered');
});
test('expired offer promotes next person and blocks replay',()=>{
 let d=join(seed());M.select(d,'m3');d=join(d);release(d);
 W.advance(d,now+31*60000);
 assert.deepEqual(d.waitlist.entries.map(e=>e.status),['expired','offered']);
});
test('failed claim is atomic on low balance',()=>{
 let d=release(join(seed()));d.private=0;const before=JSON.stringify(d);
 fail(()=>W.execute(d,actor(d),'claim',{entry:'wl-1'},now),'insufficient_credit');
 assert.equal(JSON.stringify(d),before);
});
test('stopped classes close waitlists without charges',()=>{
 const d=join(seed());d.gym.cancelledClasses.s1={reason:'venue'};W.advance(d,now);
 assert.equal(d.waitlist.entries[0].status,'closed');assert.equal(d.bookings.length,1);
});
test('no new offers at class booking cutoff',()=>{
 const d=join(seed());d.bookings[0].status='cancel';
 const close=C.interval(d.slots[0])[0]-d.gym.policy.bookingMinutes*C.MIN;
 W.advance(d,close);assert.equal(d.waitlist.entries[0].status,'closed');
});
