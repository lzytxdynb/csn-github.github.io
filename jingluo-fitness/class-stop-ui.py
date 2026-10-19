"""Isolated DOM/interaction regression; not public-web or Service Worker acceptance."""
import json, os, shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
checks=[]
def check(label,condition):
    assert condition,label
    checks.append(label)
    print('PASS',label)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=os.getenv('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':1280,'height':960},timezone_id='Asia/Shanghai')
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div><div id="toast"></div><dialog id="modal"></dialog></body></html>')
    page.evaluate("""()=>{let d={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>d[k]??null,setItem:(k,v)=>d[k]=String(v),removeItem:k=>delete d[k]},configurable:true});location.hash='admin';}""")
    for css in ['app.css','calendar.css','gym.css']:page.add_style_tag(content=(ROOT/css).read_text())
    for js in ['calendar-core.js','calendar.js','gym-core.js','gym.js','app.js']:page.add_script_tag(content=(ROOT/js).read_text())
    data=lambda:page.evaluate('JSON.parse(localStorage.getItem("jingluo-demo-v5"))')
    check('merchant has cancellation section and six scheduled classes',page.locator('[data-gym="classCancel"]').count()==6)
    old=data();check('initial reservation is booked with stable balance',old['bookings'][0]['status']=='booked' and old['private']==9)
    page.locator('[data-gym="classCancel"][data-gym-id="s1"]').click()
    check('confirmation contains user-visible refund and non-delivery warnings','返还1节演示课时' in page.locator('#gym-modal').inner_text() and '不会发送真实消息' in page.locator('#gym-modal').inner_text())
    page.locator('#gym-modal [name="reason"]').select_option('venue')
    page.locator('#gym-modal button[type="submit"]').click()
    d=data();check('admin closure persists cancellation and returns 1 credit',d['private']==10 and d['bookings'][0]['status']=='cancel' and d['gym']['cancelledClasses']['s1']['refunded']==1)
    check('audit reason persisted',d['gym']['audit'][0]['event'].startswith('class_cancelled:s1:venue'))
    check('cancelled class cannot be cancelled again',page.locator('[data-gym="classCancel"][data-gym-id="s1"]').count()==0)
    check('admin calendar hides stopped class by default',page.locator('#jl-calendar').count()==1 and 's1' not in page.locator('#jl-calendar').inner_text())
    page.locator('[data-route="member"]').click();page.wait_for_timeout(100)
    check('member sees explanation and refund in historical record','门店停课' in page.locator('.appointment').first.inner_text() and '课时已返还' in page.locator('.appointment').first.inner_text())
    check('member cannot book cancelled course',page.locator('[data-a="reserve"][data-id="s1"]').count()==0)
    check('other member course remains bookable',page.locator('[data-a="reserve"][data-id="s3"]').count()==1)
    page.locator('[data-a="reserve"][data-id="s3"]').click();page.locator('#action-form button[type="submit"]').click()
    check('unrelated booking still works',len(data()['bookings'])==2 and data()['bookings'][0]['status']=='booked')
    page.locator('[data-route="coach"]').click();page.wait_for_timeout(100)
    check('coach has cancelled class labelled but cannot check-in old booking','门店已停课' in page.locator('.course').first.inner_text() and page.locator('[data-a="checkin"][data-id="b1"]').count()==0)
    for role in ['member','coach','admin']:
        page.locator('[data-route="'+role+'"]').click();page.wait_for_timeout(80)
        page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(60)
        dimension=page.evaluate('({viewport:innerWidth,scroll:document.documentElement.scrollWidth})')
        check(role+' mobile does not overflow',dimension['scroll']<=dimension['viewport']+1)
    check('no uncaught browser exceptions',not errors)
    browser.close()
(ROOT/'class-stop-ui-report.json').write_text(json.dumps({'status':'passed','count':len(checks),'checks':checks,'limitations':'isolated HTML with memory localStorage, not GitHub Pages, system notification or native WeChat verification'},ensure_ascii=False,indent=2))
