/* No fetch interception, caching, background scheduling, or push subscription. */
self.addEventListener("install",e=>e.waitUntil(self.skipWaiting()));
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("notificationclick",e=>{
 e.notification.close();
 const role=["member","coach","admin"].includes(e.notification.data?.role)?e.notification.data.role:"member";
 const url=self.registration.scope+"#"+role;
 e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(async list=>{
  const current=list.find(c=>c.url.startsWith(self.registration.scope));
  if(current){await current.navigate(url);await current.focus();}else await self.clients.openWindow(url);
 }));
});
