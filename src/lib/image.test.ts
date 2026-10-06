import { afterEach, expect, it, vi } from 'vitest'
import { UnsupportedImageError, compressImage, fitWithin } from './image'

afterEach(() => vi.unstubAllGlobals())

it('keeps small images as they are', () => expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 }))

it('scales the longest side down to 1600', () => {
  expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 })
  expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: 1600 })
})

it('rejects images the browser cannot decode (e.g. HEIC on desktop Chrome)', async () => {
  vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('decode')))
  await expect(compressImage(new Blob(['x']))).rejects.toBeInstanceOf(UnsupportedImageError)
})
