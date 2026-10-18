/* Membership operations UI. All identities and records are local demonstrations. */
(()=>{'use strict';
const C=window.JLGymCore;let bridge;
const T={
 private:'私教课卡',group:'团课课卡',active:'可使用',frozen:'冻结中',expired:'已过期',
 pending:'待审批',approved:'已批准',rejected:'已拒绝',withdrawn:'已撤回',travel:'行程冲突',rest:'暂停训练',other:'其他',
 admin_only:'请切换到商家端操作',member_only:'请切换到会员端操作',coach_only:'请切换到教练端操作',
 wrong_coach:'只能处理本人的课程',member_overlap:'与你已预约的课程时间冲突',coach_overlap:'教练在此时段已有课程',room_overlap:'场地在此时段已被占用',
 booking_cutoff:'课程已开始或距开课时间不足门店预约提前量',cancel_cutoff:'已超过自助退改时限，请联系门店处理',
 card_frozen:'该课卡正在冻结，暂不可预约',card_expired:'该课卡已过期',course_after_expiry:'上课日期超出课卡有效期',
 card_unavailable:'课卡已冻结或过期，请先处理课卡',freeze_has_bookings:'冻结期内仍有待上课预约，请先取消或改约后再审批',
 pending_exists:'该课卡已有待审批申请',not_pending:'申请已处理，请刷新后查看',not_booked:'预约状态已变更',
 checkin_window:'核销仅在开课前15分钟至结束后48小时开放',not_completed:'完成核销后才能写课后记录',
 invalid_extension:'新有效期必须晚于原日期且在未来3年内',invalid_days:'冻结天数必须为1至30的整数',
 invalid_rules:'预约提前5至1440分钟；退改提前5至10080分钟',duplicate_booking:'不能重复预约同一节课',insufficient_credit:'课时不足',full:'课程名额已满',different_kind:'只能改约同类课程',past_slot:'新课程必须晚于当前时间'
};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const translate=e=>T[e.message]||'操作未完成，请检查输入或本地存储权限（'+e.message+'）';
const button=(a,t,id='')=>`<button type="button" class="btn small light" data-gym="${a}" data-gym-id="${esc(id)}">${t}</button>`;
const actor=()=>({role:bridge.get().role,coach:bridge.get().coach});
function refresh(){
 if(!bridge)return;const {data,role}=bridge.get(),main=document.querySelector('main.appbody');document.getElementById('jl-gym')?.remove();if(!main)return;
 C.migrate(data);const panel=document.createElement('section');panel.id='jl-gym';panel.className='gym-panel';
 let html=`<div class="gym-head"><h2>课卡与预约规则</h2><span class="badge">0.4 演示版</span></div>`;
 const p=data.gym.policy;
 html+=`<p class="gym-rule">预约至少提前 <b>${p.bookingMinutes}</b> 分钟；自助取消或改约至少提前 <b>${p.cancelMinutes}</b> 分钟。全部时间按北京时间。</p>`;
 if(role!=='coach'){
 html+='<div class="gym-card-grid">';
 for(const k of ['private','group']){const c=C.cardStatus(data,k),pending=data.gym.requests.some(r=>r.kind===k&&r.status==='pending');
 html+=`<article class="gym-card"><div class="gym-head"><b>${T[k]}</b><span class="badge ${c.state==='active'?'':'orange'}">${T[c.state]}</span></div><strong>${c.balance}<small> 可用课时</small></strong><p>有效期至 ${esc(c.expires)} 当日结束</p>${c.days<=7?'<p class="gym-alert">课卡即将到期或已过期，请联系门店。</p>':''}${c.state==='frozen'?'<p>自动恢复：'+new Date(c.resume).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})+'</p>':''}<div>${role==='member'?(c.state==='active'&&!pending?button('request','申请冻结',k):pending?'<span class="hint">冻结申请审批中</span>':''):button('extend','登记延长有效期',k)}</div></article>`;
 }
 html+='</div><p class="gym-note">示例课卡首次载入有效期90天；冻结获批后立即生效，同步顺延有效期，不改变课时余额。本轮不支持提前解冻。</p>';
 const requests=data.gym.requests;
 html+=`<details class="gym-requests" ${requests.some(r=>r.status==='pending')?'open':''}><summary>冻结申请与审批（${requests.filter(r=>r.status==='pending').length}条待处理）</summary>`;
 html+=requests.length?requests.slice(0,20).map(r=>`<div class="gym-request"><div><b>${T[r.kind]} / ${r.days}天</b><p>${T[r.reason]} · ${T[r.status]}</p></div><div class="gym-actions">${r.status==='pending'?(role==='member'?button('withdraw','撤回',r.id):button('approve','批准',r.id)+button('reject','拒绝',r.id)):''}</div></div>`).join(''):'<p>暂无申请。</p>';
 html+='</details>';
 if(role==='admin')html+='<div class="gym-actions">'+button('rules','设置门店预约规则')+'</div><p class="gym-note">只登记演示课卡权益，不代表收款或退款。审批不会自动取消预约。</p>';
 }else html+='<p class="gym-note">核销窗口：开课前15分钟至结束后48小时。只能处理当前演示教练的预约；不显示会员冻结原因。</p>';
 panel.innerHTML=html;const anchor=main.querySelector('.dashboard');if(anchor)anchor.after(panel);else main.append(panel);
}
function dialog(title,body,submit){
 let d=document.getElementById('gym-modal');if(!d){d=document.createElement('dialog');d.id='gym-modal';d.className='gym-dialog';document.body.append(d);}
 d.setAttribute('aria-label',title);d.innerHTML=`<form><h2>${esc(title)}</h2>${body}<p id="gym-error" role="alert"></p><div class="gym-actions"><button type="button" class="btn light" data-gym="close">取消</button><button type="submit" class="btn">确认保存</button></div></form>`;
 d.querySelector('form').onsubmit=e=>{e.preventDefault();try{submit(new FormData(e.target));d.close();}catch(err){d.querySelector('#gym-error').textContent=translate(err);}};d.showModal();
}
function execute(action,p){const next=C.execute(bridge.get().data,actor(),action,p);bridge.commit(next);bridge.toast('已保存本浏览器演示记录');}
function action(a,id){
 if(a==='close'){document.getElementById('gym-modal')?.close();return;}
 const d=bridge.get().data;
 if(a==='request')dialog('申请冻结 '+T[id],'<p class="gym-note">审批通过后生效。有未完成预约时，先取消或改约，不自动退课。</p><label class="form-field">冻结天数<input name="days" type="number" min="1" max="30" value="7" required></label><label class="form-field">原因<select name="reason"><option value="travel">行程冲突</option><option value="rest">暂停训练</option><option value="other">其他</option></select></label>',f=>execute('request',{kind:id,days:Number(f.get('days')),reason:f.get('reason')}));
 if(a==='approve'||a==='reject'||a==='withdraw')dialog(a==='approve'?'批准冻结':a==='reject'?'拒绝申请':'撤回申请','<p>此操作会留下演示操作记录。</p>',()=>execute(a==='withdraw'?'withdraw':'review',{id,decision:a==='approve'?'approve':'reject'}));
 if(a==='extend')dialog('登记延长有效期','<p class="gym-note">只修改演示权益日期，不追加课时或真实收款。</p><label class="form-field">新有效期<input name="expires" type="date" value="'+esc(C.day(C.midnight(d.gym.cards[id].expires)+30*C.DAY))+'" required></label>',f=>execute('extend',{kind:id,expires:f.get('expires')}));
 if(a==='rules')dialog('门店预约规则','<p class="gym-note">新规则应用于此后的预约与退改操作，包括已有预约的退改。</p><label class="form-field">预约至少提前（分钟）<input name="bookingMinutes" type="number" min="5" max="1440" value="'+d.gym.policy.bookingMinutes+'" required></label><label class="form-field">退改至少提前（分钟）<input name="cancelMinutes" type="number" min="5" max="10080" value="'+d.gym.policy.cancelMinutes+'" required></label>',f=>execute('rules',{bookingMinutes:Number(f.get('bookingMinutes')),cancelMinutes:Number(f.get('cancelMinutes'))}));
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-gym]');if(!b)return;try{action(b.dataset.gym,b.dataset.gymId);}catch(err){bridge?.toast(translate(err));}});
window.JLOps={connect(b){bridge=b;},refresh,assert(a,p){try{C.guard(bridge.get().data,actor(),a,p);}catch(e){throw new Error(translate(e));}}};
})();
