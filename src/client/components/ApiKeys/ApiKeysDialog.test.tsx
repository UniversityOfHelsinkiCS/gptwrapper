import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import i18next from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { MAX_API_KEYS, type ApiKey } from '../../../shared/apiKey'

vi.mock('../../util/queryClient', async () => {
  const { QueryClient } = await import('@tanstack/react-query')
  return { default: new QueryClient() }
})
vi.mock('@config', () => ({ PUBLIC_URL: '/chat', FREE_MODEL: 'gpt-5-mini' }))
vi.mock('../common/Snackbar', () => ({ enqueueSnackbar: vi.fn() }))
vi.mock('../common/accessibility/SnackbarAnnouncer', () => ({ announceToScreenReader: vi.fn() }))
vi.mock('../../util/apiClient', () => ({ default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }))

import en from '../../locales/en.json'
import apiClient from '../../util/apiClient'
import queryClient from '../../util/queryClient'
import { enqueueSnackbar } from '../common/Snackbar'
import { ApiKeysDialog } from './ApiKeysDialog'

const i18n = i18next.createInstance()

// In-memory stand-in for src/server/routes/apiKey.ts
let keys: ApiKey[] = []
let nextKey = 0

const storedKey = (id: string, name: string, apiKey: string, createdAt: Date): ApiKey => ({ id, name, apiKey, createdAt: createdAt.toISOString() })

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    resources: { en },
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
  })
})
beforeEach(() => {
  keys = []
  queryClient.clear()
  vi.mocked(apiClient.get).mockImplementation(async () => ({ data: [...keys].reverse().map((k) => ({ ...k, apiKey: `••••••••${k.apiKey.slice(-4)}` })) }))
  vi.mocked(apiClient.post).mockImplementation(async (_url, body) => {
    if (keys.length >= MAX_API_KEYS) throw Object.assign(new Error('Conflict'), { response: { status: 409 } })
    nextKey += 1
    const created = storedKey(`id-${nextKey}`, (body as { name: string }).name, `secret-${String(nextKey).padStart(4, '0')}`, new Date(2026, 9, nextKey))
    keys.push(created)
    return { data: created }
  })
  vi.mocked(apiClient.delete).mockImplementation(async (url: string) => {
    keys = keys.filter((k) => url !== `/apikeys/${k.id}`)
    return { data: undefined }
  })
})
afterEach(() => {
  cleanup()
  vi.mocked(enqueueSnackbar).mockClear()
})

const renderDialog = async () => {
  render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <ApiKeysDialog open setOpen={() => {}} />
      </I18nextProvider>
    </QueryClientProvider>,
  )
  return screen.findByRole('dialog', { name: 'API keys' })
}

const createKey = async (dialog: HTMLElement, name = 'My script') => {
  const count = within(dialog).queryAllByRole('button', { name: /^Delete key/ }).length
  fireEvent.change(within(dialog).getByLabelText('Key name'), { target: { value: name } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create new key' }))
  await waitFor(() => expect(within(dialog).getAllByRole('button', { name: /^Delete key/ })).toHaveLength(count + 1))
}

describe('ApiKeysDialog', () => {
  test('creates and deletes a key', async () => {
    const dialog = await renderDialog()
    expect(await within(dialog).findByText(en.apiKeys.empty)).toBeTruthy()

    expect(within(dialog).getByRole('button', { name: 'Create new key' }).hasAttribute('disabled')).toBe(true)

    await createKey(dialog, '  My script  ')
    expect(apiClient.post).toHaveBeenCalledWith('/apikeys', { name: 'My script' })
    expect(within(dialog).getByTestId('created-api-key').textContent).toBe(keys[0].apiKey)
    expect(within(dialog).getByText('••••••••0001')).toBeTruthy()
    expect((within(dialog).getByLabelText('Key name') as HTMLInputElement).value).toBe('')
    expect(within(dialog).getByText('New')).toBeTruthy()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete key My script' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Delete key My script' }))

    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete key My script' }))
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Cancel' }))
    fireEvent.click(within(dialog).getByTestId('confirm-delete-api-key'))
    expect(await within(dialog).findByText(en.apiKeys.empty)).toBeTruthy()
    expect(within(dialog).queryByTestId('created-api-key')).toBeNull()
    expect(apiClient.delete).toHaveBeenCalledWith('/apikeys/id-1')
  })

  const oldKeys = (count: number) => Array.from({ length: count }, (_, i) => storedKey(`old-${i}`, '', `old-secret-${i}`, new Date(2026, 0, i + 1)))

  test('disables creating at the key limit', async () => {
    keys = oldKeys(MAX_API_KEYS)
    const dialog = await renderDialog()
    await waitFor(() => expect(within(dialog).getAllByRole('button', { name: /^Delete key/ })).toHaveLength(MAX_API_KEYS))
    expect(within(dialog).getByText(`Your keys · ${MAX_API_KEYS}/${MAX_API_KEYS}`)).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: 'Create new key' }).hasAttribute('disabled')).toBe(true)
  })

  test('shows the limit message when the server rejects a new key', async () => {
    keys = oldKeys(MAX_API_KEYS - 1)
    const dialog = await renderDialog()
    await waitFor(() => expect(within(dialog).getAllByRole('button', { name: /^Delete key/ })).toHaveLength(MAX_API_KEYS - 1))
    // Another session created a key, so the server is at the limit before this list refreshes
    keys = oldKeys(MAX_API_KEYS)

    fireEvent.change(within(dialog).getByLabelText('Key name'), { target: { value: 'My script' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create new key' }))
    await waitFor(() => expect(enqueueSnackbar).toHaveBeenCalledWith(en.apiKeys.limitReached, { variant: 'error' }))
    expect(within(dialog).queryByTestId('created-api-key')).toBeNull()
  })

  test('reports copy success and failure', async () => {
    const dialog = await renderDialog()
    await createKey(dialog)

    const setClipboard = (writeText: () => Promise<void>) => Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    setClipboard(() => Promise.resolve())
    fireEvent.click(within(dialog).getByRole('button', { name: 'Copy' }))
    await waitFor(() => expect(enqueueSnackbar).toHaveBeenCalledWith('Copied to clipboard', { variant: 'success' }))
    expect(within(dialog).getByRole('button', { name: 'Copied' })).toBeTruthy()

    setClipboard(() => Promise.reject(new Error('denied')))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Copied' }))
    await waitFor(() => expect(enqueueSnackbar).toHaveBeenCalledWith(en.apiKeys.copyError, { variant: 'error' }))
  })

  test('shows integration instructions', async () => {
    const dialog = await renderDialog()
    expect(within(dialog).queryByText('Base URL')).toBeNull()

    fireEvent.click(within(dialog).getByRole('button', { name: en.apiKeys.howToUse }))
    const baseUrl = `${window.location.origin}/chat/api/external/v1`
    expect(within(dialog).getByText(baseUrl)).toBeTruthy()
    expect(within(dialog).getByTestId('api-curl-example').textContent).toContain(`curl ${baseUrl}/chat/completions`)
    expect(within(dialog).getByText(/gpt-5-mini gets 1 million extra tokens a week/)).toBeTruthy()

    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Copy Base URL to clipboard' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(baseUrl))
  })
})
