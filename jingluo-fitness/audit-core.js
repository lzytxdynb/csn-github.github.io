/* Read/derive a local-only audit view. No production authorization or tamper resistance. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.JLAuditCore=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const MAX=200,ROLES=["member","coach","admin","unknown"];
const NAMES={member:"演示会员",coach:"演示教练",admin:"演示商家",unknown:"未记录角色"};
const TYPES={reserve:"预约课程",change:"改约课程",cancel:"取消预约",checkin:"到课核销",note:"课后记录",issue:"演示课卡登记",news:"发布公告",new:"新增课程",freeze_requested:"申请冻结",freeze_withdrawn:"撤回冻结",freeze_approved:"批准冻结",freeze_rejected:"拒绝冻结",expiry_extended:"延长有效期",booking_policy_updated:"预约规则修改",class_cancelled:"门店停课",other:"其他操作"};
function ensure(d){if(!d||typeof d!=="object")throw Error("invalid_data");if(!Array.isArray(d.auditTrail))d.auditTrail=[];if(!Number.isSafeInteger(d.auditSeq)||d.auditSeq<0)d.auditSeq=0;return d;}
function record(d,actor,type,summary,now=Date.now()){
 if(!actor||!ROLES.slice(0,3).includes(actor.role))throw Error("invalid_actor");
 if(typeof type!=="string"||!/^[a-z_]{2,40}$/.test(type))throw Error("invalid_type");
 if(!Number.isFinite(now))throw Error("invalid_time");
 const description=String(summary??"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,180);
 if(!description)throw Error("invalid_summary");
 ensure(d);if(d.auditSeq>=Number.MAX_SAFE_INTEGER)throw Error("audit_seq_overflow");
 const entry={id:"jl-audit-"+(++d.auditSeq),at:new Date(now).toISOString(),role:actor.role,coach:actor.role==="coach"?String(actor.coach||"").slice(0,12):"",type,description,source:"new"};
 d.auditTrail.unshift(entry);if(d.auditTrail.length>MAX)d.auditTrail.length=MAX;return entry;
}
function oldRows(d){
 const logs=Array.isArray(d?.logs)?d.logs.slice(0,MAX):[];
 const structured=Array.isArray(d?.gym?.audit)?d.gym.audit:[];
 return logs.filter(x=>typeof x==="string").map((line,i)=>{
  const atPos=line.indexOf(" [DEMO] "),sep=line.indexOf(" · ");
  let role="unknown",type="other",timestamp="",source="旧版文字流水";
  if(atPos>=0){
   const event=line.slice(atPos+8).trim();
   type=event.split(":")[0];const match=structured.find(x=>x?.event===event&&ROLES.includes(x.actor));
   if(match){role=match.actor;timestamp=String(match.at||"");source="旧版结构化记录";}
  }else if(sep>=0){
   const content=line.slice(sep+3);
   if(content.startsWith("会员预约 "))type="reserve";
   else if(content.startsWith("会员取消预约 "))type="cancel";
   else if(content.startsWith("会员改约至 "))type="change";
   else if(content.includes(" 完成到课核销"))type="checkin";
   else if(content.includes(" 留下课后建议"))type="note";
   else if(content.startsWith("商家登记 "))type="issue";
   else if(content.startsWith("商家发布公告"))type="news";
   else if(content.startsWith("商家发布课程 "))type="new";
   if(["reserve","cancel","change"].includes(type)){role="member";source="旧版文字推断角色";}
   if(["checkin","note"].includes(type)){role="coach";source="旧版文字推断角色";}
   if(["issue","news","new"].includes(type)){role="admin";source="旧版文字推断角色";}
  }
  return {id:"old-"+i,at:timestamp,role,type,description:line.slice(0,220),coach:"",source};
 });
}
function list(d,options={}){
 ensure(d);let rows=[...d.auditTrail,...oldRows(d)].filter(x=>x&&typeof x==="object"&&ROLES.includes(x.role)&&typeof x.type==="string"&&typeof x.description==="string");
 if(options.role&&ROLES.includes(options.role))rows=rows.filter(x=>x.role===options.role);
 if(options.type&&options.type!=="all")rows=rows.filter(x=>x.type===options.type);
 if(options.search){const q=String(options.search).toLowerCase();rows=rows.filter(x=>x.description.toLowerCase().includes(q));}
 const max=Math.min(MAX,Math.max(0,Number.isFinite(options.limit)?Math.floor(options.limit):MAX));return rows.slice(0,max);
}
function csv(d,options={}){
 const cell=v=>{let s=String(v??"");if(/^\s*[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
 const lines=[["记录来源","时间（若有）","角色（或文字推断）","操作类型","内容"]];
 for(const e of list(d,options))lines.push([e.source||"新增",e.at,NAMES[e.role]||e.role,TYPES[e.type]||e.type,e.description]);
 return "\uFEFF"+lines.map(a=>a.map(cell).join(",")).join("\r\n")+"\r\n";
}
return {MAX,NAMES,TYPES,ensure,record,oldRows,list,csv};
});