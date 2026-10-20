/* Connect legacy local logs to the read-only merchant viewer. */
(()=>{"use strict";
const KEY="jingluo-demo-v5",A=window.JLAudit;
function get(){let data={};try{data=JSON.parse(localStorage.getItem(KEY)||"{}")||{}}catch{}
 return {data,role:location.hash.slice(1)};}
function adapt(){
 const box=document.getElementById("jl-audit");if(!box)return;
 box.querySelectorAll("time").forEach(el=>{if(/Invalid Date|无效日期/.test(el.textContent||""))el.textContent="旧版时间见原始记录";});
 const title=box.querySelector("summary strong");if(title)title.textContent="操作流水 · 筛选与 CSV 导出";
 const count=box.querySelector("summary span");if(count)count.textContent=count.textContent.replace("新版结构化记录","浏览器历史记录（含文字流水）");
 const note=box.querySelector(".audit-disclaimer");if(note)note.textContent="仅本浏览器的虚构演示数据。旧版记录的角色可能由文字推断，记录可以修改或重置，不可用于正式审计。CSV只下载到本机，不会发送资料。";
}
function refresh(){A.refresh();adapt();}
A.connect({get,toast:()=>{}});
const root=document.getElementById("app");if(root)new MutationObserver(refresh).observe(root,{childList:true});
document.addEventListener("change",e=>{if(e.target.matches("[data-audit-filter]"))queueMicrotask(adapt);});
addEventListener("storage",e=>{if(e.key===KEY)refresh();});
refresh();
})();