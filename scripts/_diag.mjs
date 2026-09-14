import puppeteer from 'puppeteer-core'
const b=await puppeteer.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--no-sandbox']})
const page=await b.newPage(); page.setDefaultNavigationTimeout(90000)
await page.setViewport({width:1620,height:900})
await page.goto('http://localhost:3000/astrology/chart?y=1995&mo=6&d=15&h=14&mi=30&cid=beijing&sys=placidus&bd=1.1.1.1.1',{waitUntil:'domcontentloaded'})
await page.evaluate(()=>localStorage.setItem('oracle-lang','zh'))
await page.reload({waitUntil:'domcontentloaded'})
await new Promise(r=>setTimeout(r,8000))
await page.evaluate(()=>{[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='黄道状态-2')?.click()})
await new Promise(r=>setTimeout(r,900))
// 1) DOM 颜色
const domColors=await page.evaluate(()=>{
  const panels=[...document.querySelectorAll('section')]
  const last=panels[panels.length-1]
  const spans=[...last.querySelectorAll('span')].filter(x=>/^[♈♉♊♋♌♍♎♏♐♑♒♓]$/.test(x.textContent.trim()))
  return spans.slice(0,6).map(x=>({s:x.textContent.trim(), c:getComputedStyle(x).color, r:x.getBoundingClientRect()}))
})
console.log('DOM 颜色:')
domColors.forEach(x=>console.log('  ', x.s, x.c, 'x='+Math.round(x.r.left), 'y='+Math.round(x.r.top)))
// 2) 用 CDP 截该 span 的局部图
if(domColors.length){
  const r=domColors[0].r
  await page.screenshot({path:'C:/Users/99192/AppData/Local/Temp/sym_zoom.png', clip:{x:r.left-10,y:r.top-6,width:60,height:26}})
  console.log('局部截图: sym_zoom.png')
}
await b.close()
