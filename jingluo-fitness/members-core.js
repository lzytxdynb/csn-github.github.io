/* Fictional multi-member demo; no real accounts. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.JLDemoMembers=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const NAMES=[['m1','小鲸同学'],['m2','海风同学'],['m3','星湾同学']];
const balance=(x,k)=>Number.isSafeInteger(x[k])&&x[k]>=0?x[k]:0;
function migrate(d){
 if(!d||!d.gym||!Array.isArray(d.bookings))throw Error('invalid_member_data');
 if(!d.demoMembers){
  const cards=clone(d.gym.cards),requests=clone(d.gym.requests);
  d.demoMembers={v:1,active:'m1',accounts:NAMES.map(([id,name],i)=>({id,name,private:i===0?balance(d,'private'):i===1?3:2,group:i===0?balance(d,'group'):i===1?5:4,cards:i===0?clone(cards):Object.fromEntries(Object.entries(cards).map(([k,c])=>[k,{...clone(c),freeze:null}])),requests:i===0?requests:[]}))};
  for(const b of d.bookings)if(!b.memberId)b.memberId='m1';
 }
 const state=d.demoMembers;
 if(state.v!==1||!Array.isArray(state.accounts)||state.accounts.length!==3||!NAMES.every(([id])=>state.accounts.some(a=>a.id===id&&a.cards&&Array.isArray(a.requests)&&Number.isSafeInteger(a.private)&&a.private>=0&&Number.isSafeInteger(a.group)&&a.group>=0))||!state.accounts.some(a=>a.id===state.active))throw Error('invalid_member_data');
 return d;
}
const list=d=>(migrate(d),d.demoMembers.accounts.map(({id,name})=>({id,name})));
const id=d=>(migrate(d),d.demoMembers.active);
const active=d=>(migrate(d),d.demoMembers.accounts.find(a=>a.id===d.demoMembers.active));
const owns=(d,b)=>(b?.memberId||'m1')===id(d);
const name=(d,b)=>(migrate(d),d.demoMembers.accounts.find(a=>a.id===(b?.memberId||'m1'))?.name||'未知演示会员');
function sync(d){const a=active(d);a.private=balance(d,'private');a.group=balance(d,'group');a.cards=clone(d.gym.cards);a.requests=clone(d.gym.requests);return d;}
function select(d,next){migrate(d);const a=d.demoMembers.accounts.find(x=>x.id===next);if(!a)throw Error('unknown_member');sync(d);d.demoMembers.active=next;d.private=a.private;d.group=a.group;d.gym.cards=clone(a.cards);d.gym.requests=clone(a.requests);return d;}
function refund(d,memberId,kind){migrate(d);if(!['private','group'].includes(kind))throw Error('invalid_kind');const a=d.demoMembers.accounts.find(x=>x.id===memberId);if(!a)throw Error('unknown_member');if(memberId===id(d)){d[kind]++;}else{a[kind]++;}return d;}
return Object.freeze({migrate,list,id,active,owns,name,sync,select,refund});
});