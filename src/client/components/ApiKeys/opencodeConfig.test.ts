import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@config', () => ({
  FREE_MODEL: 'gpt-5-mini',
  PUBLIC_URL: '/chat',
  ModelProvider: { Vertex: 'vertex' },
  validModels: [
    { name: 'gpt-5-mini', displayName: 'GPT-5 mini', context: 128_000, outputLimit: 16_384 },
    { name: 'Mistral-Large-3-1', displayName: 'Mistral Large 3', context: 128_000, outputLimit: 8_192 },
    { name: 'gemini-3.8-flash', displayName: 'Gemini 3.8 Flash', context: 128_000, outputLimit: 16_384, provider: 'vertex' },
    { name: 'mock', displayName: 'Mock', context: 1024, outputLimit: 1024 },
  ],
}))

import { buildOpencodeConfig, downloadOpencodeConfig } from './opencodeConfig'

describe('downloadOpencodeConfig', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('downloads the config as opencode.json and revokes the url only after the click', async () => {
    vi.useFakeTimers()
    let blob: Blob | undefined
    vi.spyOn(URL, 'createObjectURL').mockImplementation((value) => {
      blob = value as Blob
      return 'blob:http://localhost/opencode'
    })
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    downloadOpencodeConfig('secret')

    expect(click).toHaveBeenCalledOnce()
    const clicked = click.mock.contexts[0] as HTMLAnchorElement
    expect(clicked.download).toBe('opencode.json')
    expect(clicked.href).toBe('blob:http://localhost/opencode')
    expect(revoke).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(revoke).toHaveBeenCalledWith('blob:http://localhost/opencode')

    expect(blob?.type).toBe('application/json')
    expect(JSON.parse(await blob!.text())).toEqual(buildOpencodeConfig(`${window.location.origin}/chat/api/external/v1`, 'secret'))
  })
})

describe('buildOpencodeConfig', () => {
  const config = buildOpencodeConfig('https://example.org/api/external/v1', 'secret')
  const provider = config.provider.currechat

  it('passes base url and api key through and defaults to the free model', () => {
    expect(provider.options).toEqual({ baseURL: 'https://example.org/api/external/v1', apiKey: 'secret' })
    expect(config.model).toBe('currechat/gpt-5-mini')
  })

  it('lists configured models except mock and Gemini with their limits', () => {
    expect(provider.models).toEqual({
      'gpt-5-mini': { name: 'GPT-5 mini', limit: { context: 128_000, output: 16_384 } },
      'Mistral-Large-3-1': { name: 'Mistral Large 3', limit: { context: 128_000, output: 8_192 } },
    })
  })
})
