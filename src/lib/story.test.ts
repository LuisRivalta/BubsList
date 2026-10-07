import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadImage, shareOrDownload, wrapLines } from './story'

const len = (s: string) => s.length

describe('wrapLines', () => {
  it('keeps short text on one line', () => {
    expect(wrapLines('Batata do Marechal', 100, len)).toEqual(['Batata do Marechal'])
  })

  it('breaks between words when the line gets too wide', () => {
    expect(wrapLines('Acampar na Serra da Mantiqueira', 12, len)).toEqual(['Acampar na', 'Serra da', 'Mantiqueira'])
  })

  it('a word longer than the line stays whole on its own line', () => {
    expect(wrapLines('Supercalifragilistico ok', 5, len)).toEqual(['Supercalifragilistico', 'ok'])
  })

  it('cuts to maxLines with an ellipsis', () => {
    expect(wrapLines('a b c d e f', 1, len, 3)).toEqual(['a', 'b', 'c…'])
  })
})

describe('loadImage', () => {
  afterEach(() => vi.useRealTimers())

  it('gives up after the timeout so the story is drawn without the image', async () => {
    vi.useFakeTimers()
    const result = loadImage('https://example.com/poster.jpg', 5000)
    vi.advanceTimersByTime(5000)
    await expect(result).resolves.toBeNull()
  })
})

describe('shareOrDownload', () => {
  const blob = new Blob(['png'], { type: 'image/png' })
  afterEach(() => vi.unstubAllGlobals())

  const downloads = () => {
    const names: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      names.push(this.download)
    })
    Object.assign(URL, { createObjectURL: () => 'blob:story', revokeObjectURL: () => {} }) // not implemented in jsdom
    return names
  }

  it('opens the native share sheet when the device can share files', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    vi.stubGlobal('navigator', { canShare: () => true, share })
    const names = downloads()
    await shareOrDownload(blob, 'bubs2do-2026-intro.png')
    expect(share.mock.calls[0][0].files[0].name).toBe('bubs2do-2026-intro.png')
    expect(names).toEqual([])
  })

  it('does nothing else when the person cancels the share sheet', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    vi.stubGlobal('navigator', { canShare: () => true, share: vi.fn().mockRejectedValue(new DOMException('cancel', 'AbortError')) })
    const names = downloads()
    await shareOrDownload(blob, 'x.png')
    expect(names).toEqual([])
  })

  it('downloads the file when sharing is not supported or fails', async () => {
    vi.stubGlobal('navigator', {})
    const names = downloads()
    await shareOrDownload(blob, 'bubs2do-2026-total.png')
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    vi.stubGlobal('navigator', { canShare: () => true, share: vi.fn().mockRejectedValue(new Error('NotAllowed')) })
    await shareOrDownload(blob, 'bubs2do-2026-best.png')
    expect(names).toEqual(['bubs2do-2026-total.png', 'bubs2do-2026-best.png'])
  })

  it('on a computer it downloads even when the browser offers a share dialog', async () => {
    const share = vi.fn()
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    vi.stubGlobal('navigator', { canShare: () => true, share })
    const names = downloads()
    await shareOrDownload(blob, 'bubs2do-2026-intro.png')
    expect(share).not.toHaveBeenCalled()
    expect(names).toEqual(['bubs2do-2026-intro.png'])
  })
})
