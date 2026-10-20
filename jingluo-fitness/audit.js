/* Read-only local audit viewer for the merchant demonstration role. */
(()=>{"use strict";
const C=window.JLAuditCore;let bridge,filter="all";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function refresh(){
 document.getElementById("jl-audit")?.remove();if(!bridge)return;
 const {data,role}=bridge.get();if(role!=="admin")return;
 const main=document.querySelector("main.appbody");if(!main)return;
 const all=C.list(data),types=[...new Set(all.map(e=>e.type))];
 if(filter!=="all"&&!types.includes(filter))filter="all";
 const rows=C.list(data,{type:filter,limit:25});
 const panel=document.createElement("section");panel.id="jl-audit";panel.className="audit-panel";
 panel.innerHTML='<details><summary><strong>操作审计记录</strong><span>新版结构化记录 '+all.length+' 条 · 最多保留 '+C.MAX+' 条</span></summary><div class="audit-tools"><label>类型筛选 <select data-audit-filter><option value="all">全部操作</option>'+types.map(t=>'<option value="'+esc(t)+'" '+(filter===t?'selected':'')+'>'+esc(C.TYPES[t]||t)+'</option>').join("")+'</select></label><button type="button" class="btn small" data-audit-export>导出筛选结果 CSV</button></div><div class="audit-rows">'+(rows.length?rows.map(e=>'<div class="audit-row"><time datetime="'+esc(e.at)+'">'+esc(new Date(e.at).toLocaleString("zh-CN",{timeZone:"Asia/Shanghai"}))+'</time><span class="audit-badge">'+esc(C.NAMES[e.role]||e.role)+'</span><div><b>'+esc(C.TYPES[e.type]||e.type)+'</b><p>'+esc(e.description)+'</p></div></div>').join(""):'<p class="audit-empty">暂无符合条件的新结构化记录。既有文字流水仍保留在商家后台上方。</p>')+'</div><p class="audit-disclaimer">仅当前浏览器保存的虚构演示操作；可以修改或重置，不是不可篡改审计，也不代表真实会员操作。导出只下载到本机，不发送资料。</p></details>';
 main.append(panel);
}
function exportCsv(){
 const {data,role}=bridge.get();if(role!=="admin")return;
 const csv=C.csv(data,{type:filter});const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="jingluo-audit-"+new Date().toISOString().slice(0,10)+".csv";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
 bridge.toast("审计 CSV 已生成（仅当前浏览器虚构数据）");
}
document.addEventListener("change",e=>{if(e.target.matches("[data-audit-filter]")){filter=e.target.value;refresh();const d=document.querySelector("#jl-audit details");if(d)d.open=true;}});
document.addEventListener("click",e=>{if(e.target.closest("[data-audit-export]"))try{exportCsv()}catch(err){bridge?.toast("导出失败："+String(err.message||err))}});
window.JLAudit={connect(b){bridge=b;},refresh};
})();