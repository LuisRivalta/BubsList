import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import * as api from '../data/api'
import { photo } from '../test/fixtures'
import PhotoPicker from './PhotoPicker'

vi.mock('../data/api')
afterEach(() => vi.unstubAllGlobals())

const renderPicker = (existing = [] as ReturnType<typeof photo>[], onChange = vi.fn()) => {
  vi.mocked(api.signedUrls).mockResolvedValue({})
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PhotoPicker existing={existing} pending={[]} onChange={onChange} />
    </QueryClientProvider>,
  )
  return onChange
}

it('shows a friendly error for images the browser cannot read', async () => {
  vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('decode')))
  const onChange = renderPicker()
  await userEvent.upload(screen.getByLabelText(/Adicionar fotos/), new File(['x'], 'foto.heic', { type: 'image/heic' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Formato de imagem não suportado')
  expect(onChange).not.toHaveBeenCalled()
})

it('refuses to go over 15 photos', async () => {
  const onChange = renderPicker(Array.from({ length: 15 }, () => photo()))
  await userEvent.upload(screen.getByLabelText(/Adicionar fotos/), new File(['x'], 'a.jpg', { type: 'image/jpeg' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Máximo de 15 fotos.')
  expect(onChange).not.toHaveBeenCalled()
})
