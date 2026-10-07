// Story images (1080×1920) for sharing a retrospective slide.

export type ImageRef = { path: string } | { url: string }

export interface StoryCard {
  eyebrow: string
  big: string
  caption: string
  image: ImageRef | null
}

export function wrapLines(text: string, maxWidth: number, measure: (s: string) => number, maxLines = Infinity): string[] {
  const lines: string[] = []
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const last = lines.at(-1)
    if (last !== undefined && measure(`${last} ${word}`) <= maxWidth) lines[lines.length - 1] = `${last} ${word}`
    else lines.push(word)
  }
  if (lines.length <= maxLines) return lines
  return [...lines.slice(0, maxLines - 1), `${lines[maxLines - 1]}…`]
}

// Resolves null on error or timeout (no CORS, expired URL, offline): the story is then drawn without the image.
export function loadImage(src: string, timeout = 5000): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const done = (ok: boolean) => {
      clearTimeout(timer)
      resolve(ok ? img : null)
    }
    const timer = setTimeout(() => done(false), timeout)
    img.onload = () => done(true)
    img.onerror = () => done(false)
    img.src = src
  })
}

const W = 1080
const H = 1920
const PAPER = '#efeced'
const BLUSH = '#e3b4cf'
const BRAND = '#553548'

// Same star field on every story (fixed seed).
function drawStars(ctx: CanvasRenderingContext2D) {
  let seed = 7
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < 160; i++) {
    ctx.globalAlpha = 0.3 + rand() * 0.7
    ctx.fillStyle = rand() > 0.8 ? BLUSH : '#fff'
    ctx.beginPath()
    ctx.arc(rand() * W, rand() * H * 0.85, 1 + rand() * 2.5, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

// Canvas is not available in jsdom: this is verified by the PNG print in Task 5.
export async function drawStory(card: StoryCard, year: number, imageUrl: string | null): Promise<Blob> {
  await Promise.all(['700 150px Fredoka', '600 44px Fredoka', '800 40px Nunito', '600 46px Nunito'].map((f) => document.fonts.load(f)))
  const image = imageUrl ? await loadImage(imageUrl) : null
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const measure = (s: string) => ctx.measureText(s).width

  const sky = ctx.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, '#1a1115')
  sky.addColorStop(0.6, '#2c1b25')
  sky.addColorStop(1, BRAND)
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)
  drawStars(ctx)

  ctx.textAlign = 'center'
  ctx.fillStyle = BLUSH
  ctx.font = '800 40px Nunito'
  ctx.fillText(card.eyebrow.toUpperCase(), W / 2, 300)

  let y = 760
  if (image) {
    const size = 640
    const x = (W - size) / 2
    const crop = Math.min(image.naturalWidth, image.naturalHeight)
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(x, 360, size, size, 48)
    ctx.clip()
    ctx.drawImage(image, (image.naturalWidth - crop) / 2, (image.naturalHeight - crop) / 2, crop, crop, x, 360, size, size)
    ctx.restore()
    y = 1100
  }

  const bigSize = image ? 96 : 150
  ctx.fillStyle = '#fff'
  ctx.font = `700 ${bigSize}px Fredoka`
  for (const line of wrapLines(card.big, 920, measure, image ? 3 : 4)) {
    ctx.fillText(line, W / 2, y)
    y += bigSize * 1.1
  }
  y += 30
  ctx.fillStyle = 'rgb(255 255 255 / 0.8)'
  ctx.font = '600 46px Nunito'
  for (const line of wrapLines(card.caption, 900, measure, 3)) {
    ctx.fillText(line, W / 2, y)
    y += 62
  }

  ctx.fillStyle = PAPER
  ctx.beginPath()
  ctx.moveTo(0, H)
  ctx.lineTo(0, H - 170)
  ctx.quadraticCurveTo(W / 2, H - 290, W, H - 170)
  ctx.lineTo(W, H)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = BRAND
  ctx.font = '600 44px Fredoka'
  ctx.fillText(`Bubs2Do · ${year}`, W / 2, H - 80)

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar a imagem'))), 'image/png'),
  )
}

export async function shareOrDownload(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(blob)
  const link = Object.assign(document.createElement('a'), { href: url, download: filename })
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
