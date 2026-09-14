import puppeteer from 'puppeteer-core'
import sharp from 'sharp'
const T='C:/Users/99192/AppData/Local/Temp'
const b=await puppeteer.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--no-sandbox']})
const page=await b.newPage(); page.setDefaultNavigationTimeout(90000)
await page.setViewport({width:1500,height:1000})
const cases=[['1998京全开','y=1998&mo=2&d=19&h=9&mi=50&cid=beijing&sys=placidus&bd=1.1.1.1.1'],['1985沪koch','y=1985&mo=6&d=15&h=3&mi=20&cid=shanghai&sys=koch&bd=1.1.1.1.1'],['2000穗全开','y=2000&mo=1&d=1&h=12&mi=0&cid=guangzhou&sys=placidus&bd=1.1.1.1.1'],['1998京10星','y=1998&mo=2&d=19&h=9&mi=50&cid=beijing&sys=placidus'],['整宫全开','y=1998&mo=2&d=19&h=9&mi=50&cid=beijing&sys=whole-sign&bd=1.1.1.1.1'],['等宫全开','y=2000&mo=1&d=1&h=12&mi=0&cid=guangzhou&sys=equal&bd=1.1.1.1.1']]
let bad=0
for(const [tag,q] of cases){
  await page.goto('http://localhost:3000/astrology/chart?'+q,{waitUntil:'domcontentloaded'})
  await page.evaluate(()=>localStorage.setItem('oracle-lang','zh'))
  await page.reload({waitUntil:'domcontentloaded'})
  await new Promise(r=>setTimeout(r,5200))
  await page.evaluate(()=>{[...document.querySelectorAll('button')].find(x=>(x.textContent||'').includes('经典'))?.click()})
  await new Promise(r=>setTimeout(r,1500))
  const d=await page.evaluate(()=>{
    const svg=[...document.querySelectorAll('svg')].reduce((a,x)=>a&&a.clientWidth>x.clientWidth?a:x)
    const C=+svg.viewBox.baseVal.width/2
    const items=[]
    for(const g of svg.querySelectorAll('g')){ if(g.style.cursor==='pointer'){
      for(const t of g.querySelectorAll('text')){ const r=t.getBoundingClientRect(); items.push({g,txt:t.textContent.slice(0,4),L:r.left,R:r.right,T:r.top,B:r.bottom}) } } }
    let ov=0,samp=[]
    for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
      if(items[i].g===items[j].g) continue
      const ox=Math.min(items[i].R,items[j].R)-Math.max(items[i].L,items[j].L)
      const oy=Math.min(items[i].B,items[j].B)-Math.max(items[i].T,items[j].T)
      if(ox>1&&oy>1){ov++;samp.push(items[i].txt+'×'+items[j].txt+' '+Math.round(ox)+'x'+Math.round(oy))}
    }
    const P=[],RS=[]
    for(const g of svg.querySelectorAll('g')){ if(g.style.cursor==='pointer'){ const t=g.querySelector('text:last-of-type'); const sym=g.querySelector('text')
      const x=+sym.getAttribute('x'),y=+sym.getAttribute('y')-7; P.push({x,y}); RS.push(Math.hypot(x-C,y-C)) } }
    let minD=1e9
    for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length;j++){const dd=Math.hypot(P[i].x-P[j].x,P[i].y-P[j].y);if(dd<minD)minD=dd}
    return {n:P.length,ov,minD,samp:samp.slice(0,3),rΔ:Math.max(...RS)-Math.min(...RS)}
  })
  if(d.ov) bad++
  console.log(`[${tag}] 星=${d.n} 重叠=${d.ov} ${d.samp.join(' ')} 最近距=${d.minD.toFixed(1)} 半径Δ=${d.rΔ.toFixed(2)}`)
  if(tag==='1998京全开'){
    const box=await page.evaluate(()=>{const svg=[...document.querySelectorAll('svg')].reduce((a,x)=>a&&a.clientWidth>x.clientWidth?a:x);const r=svg.getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)}})
    await page.screenshot({path:`${T}/c7.png`,clip:box})
    // 墨黑主题也拍一张
    await page.evaluate(()=>{[...document.querySelectorAll('button')].find(x=>(x.textContent||'').trim()==='墨黑')?.click()})
    await new Promise(r=>setTimeout(r,900))
    await page.screenshot({path:`${T}/c7d.png`,clip:box})
  }
}
await b.close()
await sharp(`${T}/c7.png`).resize(700).jpeg({quality:90}).toFile(`${T}/c7.jpg`)
await sharp(`${T}/c7d.png`).resize(700).jpeg({quality:90}).toFile(`${T}/c7d.jpg`)
console.log(bad?'NEEDS_MORE':'ALL CLEAN')
