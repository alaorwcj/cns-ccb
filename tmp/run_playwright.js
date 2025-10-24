const fs=require('fs');
(async()=>{
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext();
  const routes=['/','/orders','/products','/users','/churches','/stock'];
  const results = [];
  for(const r of routes){
    const page = await context.newPage();
    for(const vp of [{name:'desktop',w:1280,h:800},{name:'mobile',w:375,h:812}]){
      try{
        await page.setViewportSize({width:vp.w,height:vp.h});
        const url='http://localhost:5173'+r;
        let resp=null;
        try{ resp = await page.goto(url,{waitUntil:'networkidle',timeout:20000}); } catch(e){ console.error('goto error',r,vp.name,e.message); }
        await page.waitForTimeout(400);
        const safe = (r.replace(/\//g,'_')||'home').replace(/^_+/,'');
        const shotPath = '/work/tmp/snapshots/' + safe + '_' + vp.name + '.png';
        await page.screenshot({path:shotPath,fullPage:true});
        const overflow = await page.evaluate(()=>{
          const doc = document.documentElement;
          const docOverflow = doc.scrollWidth>doc.clientWidth;
          const elems = Array.from(document.querySelectorAll('*')).filter(el=>el.scrollWidth>el.clientWidth+1);
          const count = elems.length;
          const sampleElems = elems.slice(0,5).map(e=>({tag:e.tagName,className:e.className,inner:e.innerText?e.innerText.slice(0,200):''}));
          const longWords = Array.from(document.body.querySelectorAll('*')).map(el=>el.textContent||'').join(' ').split(/\s+/).filter(w=>w.length>40).slice(0,10);
          return {docOverflow,count,sampleElems,longWords};
        });
        results.push({route:r,vp:vp.name,status:resp?resp.status():null,overflow});
      } catch(e){ console.error('route error',r,vp.name,e.message); }
    }
    await page.close();
  }
  await browser.close();
  fs.writeFileSync('/work/tmp/snapshots/results.json',JSON.stringify(results,null,2));
  console.log('WROTE /work/tmp/snapshots/results.json');
})();
