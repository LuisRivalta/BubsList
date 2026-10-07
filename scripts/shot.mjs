// Dev tool: screenshot a page in headless Chrome with a real mobile/desktop viewport.
// Usage: node scripts/shot.mjs <url> <out.png> [width=390] [height=844] [waitMs=4000] [--reduce] [--bottom] [--offline] [--eval=<js>] [--click=<label>[*N][,<label>[*N]…]] [--downloads=<dir>]
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith('--')))
const [url, out, w = '390', h = '844', wait = '4000'] = args
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--remote-debugging-port=9333', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'shot-'))}`, 'about:blank',
])
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let target
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200)
  target = await fetch('http://127.0.0.1:9333/json').then((r) => r.json()).then((l) => l.find((t) => t.type === 'page')).catch(() => null)
}
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0
const call = (method, params = {}) =>
  new Promise((resolve) => {
    const my = ++id
    const onMsg = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.id !== my) return
      ws.removeEventListener('message', onMsg)
      resolve(msg.result)
    }
    ws.addEventListener('message', onMsg)
    ws.send(JSON.stringify({ id: my, method, params }))
  })
await call('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 2, mobile: +w < 768 })
if (flags.has('--reduce')) await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
const downloads = [...flags].find((f) => f.startsWith('--downloads='))?.slice(12)
if (downloads) await call('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads })
await call('Page.navigate', { url })
await sleep(+wait)
const evaluate = [...flags].find((f) => f.startsWith('--eval='))?.slice(7)
if (evaluate) await call('Runtime.evaluate', { expression: evaluate })
const click = [...flags].find((f) => f.startsWith('--click='))?.slice(8)
if (click) {
  for (const step of click.split(',')) {
    const [label, times = '1'] = step.split('*')
    for (let i = 0; i < +times; i++) {
      await call('Runtime.evaluate', {
        expression: `[...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === ${JSON.stringify(label)} || b.textContent.includes(${JSON.stringify(label)}))?.click()`,
      })
      await sleep(700)
    }
  }
  await sleep(1500)
}
if (flags.has('--offline')) {
  await call('Runtime.evaluate', { expression: "Object.defineProperty(navigator, 'onLine', { get: () => false }); dispatchEvent(new Event('offline'))" })
  await sleep(600)
}
if (flags.has('--bottom')) {
  await call('Runtime.evaluate', { expression: 'window.scrollTo(0, document.documentElement.scrollHeight)' })
  await sleep(1200)
}
const { data } = await call('Page.captureScreenshot', { format: 'png' })
writeFileSync(out, Buffer.from(data, 'base64'))
ws.close()
chrome.kill()
console.log('saved', out)
