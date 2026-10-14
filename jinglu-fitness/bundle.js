/* Jingluo Fitness 0.2.0: self-contained public showcase.
 * The gzip package contains the original HTML UI logic, styles and a browser-only
 * mock adapter. It is not a server or production authentication system.
 * Reproducible readable sources are included in the supplied source archive.
 */
(async()=>{
try{
if(!window.DecompressionStream)throw new Error('请使用较新版的 Chrome、Edge、Safari 或 Firefox 浏览器。');
const raw=Uint8Array.from(atob(window.__JL_PACK.join('')),c=>c.charCodeAt(0));
const stream=new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'));
const parts=JSON.parse(await new Response(stream).text());
window.JINGLUO_LOGO=parts.logo;
const style=document.createElement('style');style.textContent=parts.css;document.head.appendChild(style);
document.querySelectorAll('[data-logo]').forEach(x=>x.src=parts.logo);
const favicon=document.createElement('link');favicon.rel='icon';favicon.href=parts.logo;document.head.appendChild(favicon);
const blob=URL.createObjectURL(new Blob([parts.runtime+'\n'+parts.app],{type:'text/javascript'}));
const script=document.createElement('script');script.type='module';script.src=blob;
script.onload=()=>URL.revokeObjectURL(blob);
script.onerror=()=>{document.getElementById('demo').hidden=false;document.getElementById('loading-message').textContent='载入失败，请刷新页面重试。';};
document.body.appendChild(script);
}catch(e){document.getElementById('demo').hidden=false;document.getElementById('loading-message').textContent=e.message;}
})();
