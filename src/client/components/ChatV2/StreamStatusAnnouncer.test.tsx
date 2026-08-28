import { cleanup, render, screen } from '@testing-library/react'
import i18next from 'i18next'
import { StrictMode } from 'react'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeAll, describe, expect, test } from 'vitest'
import en from '../../locales/en.json'
import { StreamStatusAnnouncer, resolveAnnouncementState } from './StreamStatusAnnouncer'

const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    resources: { en },
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
  })
})

afterEach(cleanup)

const renderAnnouncer = (props: { isStreaming: boolean; hasCompletion: boolean; endState?: 'none' | 'canceled' | 'error' }) =>
  render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <StreamStatusAnnouncer endState="none" {...props} />
      </I18nextProvider>
    </StrictMode>,
  )

const rerenderAnnouncer = (
  rerender: (ui: React.ReactElement) => void,
  props: { isStreaming: boolean; hasCompletion: boolean; endState?: 'none' | 'canceled' | 'error' },
) =>
  rerender(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <StreamStatusAnnouncer endState="none" {...props} />
      </I18nextProvider>
    </StrictMode>,
  )

const liveRegion = () => screen.getByTestId('stream-status-announcer')

describe('resolveAnnouncementState', () => {
  test('is silent before anything has streamed', () => {
    expect(resolveAnnouncementState({ isStreaming: false, hasCompletion: false, hasStreamed: false, endState: 'none' })).toBe('idle')
  })

  test('reports processing while streaming with no completion yet', () => {
    expect(resolveAnnouncementState({ isStreaming: true, hasCompletion: false, hasStreamed: true, endState: 'none' })).toBe('processing')
  })

  test('reports writing once completion text exists', () => {
    expect(resolveAnnouncementState({ isStreaming: true, hasCompletion: true, hasStreamed: true, endState: 'none' })).toBe('writing')
  })

  test('reports ready after streaming stops', () => {
    expect(resolveAnnouncementState({ isStreaming: false, hasCompletion: true, hasStreamed: true, endState: 'none' })).toBe('ready')
  })

  test('reports canceled after streaming stops because the user canceled it', () => {
    expect(resolveAnnouncementState({ isStreaming: false, hasCompletion: false, hasStreamed: true, endState: 'canceled' })).toBe('canceled')
  })

  test('canceled takes priority over ready', () => {
    expect(resolveAnnouncementState({ isStreaming: false, hasCompletion: true, hasStreamed: true, endState: 'canceled' })).toBe('canceled')
  })

  test('reports error after streaming stops because the request failed', () => {
    expect(resolveAnnouncementState({ isStreaming: false, hasCompletion: false, hasStreamed: true, endState: 'error' })).toBe('error')
  })

  test('error takes priority over ready', () => {
    expect(resolveAnnouncementState({ isStreaming: false, hasCompletion: true, hasStreamed: true, endState: 'error' })).toBe('error')
  })
})

describe('StreamStatusAnnouncer', () => {
  test('exposes a polite, atomic status live region', () => {
    renderAnnouncer({ isStreaming: false, hasCompletion: false })

    const region = liveRegion()
    expect(region.getAttribute('role')).toBe('status')
    expect(region.getAttribute('aria-live')).toBe('polite')
    expect(region.getAttribute('aria-atomic')).toBe('true')
  })

  test('announces nothing until a stream has started', () => {
    renderAnnouncer({ isStreaming: false, hasCompletion: false })

    expect(liveRegion().textContent).toBe('')
  })

  test('announces that the model is processing when streaming starts with no completion', () => {
    renderAnnouncer({ isStreaming: true, hasCompletion: false })

    expect(liveRegion().textContent).toBe('Processing the request.')
  })

  test('announces once that the model is writing when the first tokens arrive', () => {
    const { rerender } = renderAnnouncer({ isStreaming: true, hasCompletion: false })

    rerenderAnnouncer(rerender, { isStreaming: true, hasCompletion: true })

    expect(liveRegion().textContent).toBe('Generating a response.')
  })

  test('does not re-announce when the completion keeps changing while streaming', () => {
    const { rerender } = renderAnnouncer({ isStreaming: true, hasCompletion: true })
    expect(liveRegion().textContent).toBe('Generating a response.')

    // Simulate many tokens arriving: `hasCompletion` stays true – an unchanged live region produces no new announcement.
    const seen = new Set<string>()
    for (let i = 0; i < 10; i += 1) {
      rerenderAnnouncer(rerender, { isStreaming: true, hasCompletion: true })
      seen.add(liveRegion().textContent ?? '')
    }

    expect([...seen]).toEqual(['Generating a response.'])
  })

  test('announces that the response is ready when streaming ends', () => {
    const { rerender } = renderAnnouncer({ isStreaming: true, hasCompletion: true })

    rerenderAnnouncer(rerender, { isStreaming: false, hasCompletion: false })

    expect(liveRegion().textContent).toBe('The response is ready.')
  })

  test('announces that generation was canceled when the user stops it', () => {
    const { rerender } = renderAnnouncer({ isStreaming: true, hasCompletion: true })

    rerenderAnnouncer(rerender, { isStreaming: false, hasCompletion: false, endState: 'canceled' })

    expect(liveRegion().textContent).toBe('Response generation was canceled.')
  })

  test('announces that generation failed when the request errors out', () => {
    const { rerender } = renderAnnouncer({ isStreaming: true, hasCompletion: true })

    rerenderAnnouncer(rerender, { isStreaming: false, hasCompletion: false, endState: 'error' })

    expect(liveRegion().textContent).toBe('Generating a response failed.')
  })

  test('never contains the response content itself', () => {
    const { rerender } = renderAnnouncer({ isStreaming: true, hasCompletion: false })

    const announcements: string[] = [liveRegion().textContent ?? '']
    for (const props of [
      { isStreaming: true, hasCompletion: true },
      { isStreaming: false, hasCompletion: false },
    ]) {
      rerenderAnnouncer(rerender, props)
      announcements.push(liveRegion().textContent ?? '')
    }
    expect(announcements).toEqual(['Processing the request.', 'Generating a response.', 'The response is ready.'])
  })
})
