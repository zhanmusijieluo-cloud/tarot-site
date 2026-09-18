import puppeteer from 'puppeteer-core'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dir = mkdtempSync(join(tmpdir(), 'dump-'))
const b = await puppeteer.launch({
  executablePath: 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe',
  headless: true, userDataDir: dir, args: ['--no-sandbox', '--no-proxy-server'],
})
const p = await b.newPage()
await p.goto('https://mustar.vip/', { waitUntil: 'domcontentloaded', timeout: 90000 })
await new Promise((r) => setTimeout(r, 14000))
const info = await p.evaluate(() => ({
  url: location.href,
  aCount: document.querySelectorAll('a').length,
  btnCount: document.querySelectorAll('button').length,
  text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 400),
  btns: [...document.querySelectorAll('button')].map((x) => (x.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 24)).filter(Boolean),
}))
console.log(JSON.stringify(info, null, 1))
await b.close()
rmSync(dir, { recursive: true, force: true })
