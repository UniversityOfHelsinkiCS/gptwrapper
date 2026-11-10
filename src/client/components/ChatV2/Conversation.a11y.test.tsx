import { cleanup, render, screen } from '@testing-library/react'
import i18next from 'i18next'
import { createRef, StrictMode } from 'react'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'

vi.mock('../../../config', () => ({ ValidModelNameSchema: { parse: (v: unknown) => v } }))
vi.mock('react-syntax-highlighter', () => ({ PrismAsync: () => null }))
vi.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({ oneDark: {} }))

import type { AssistantPart } from '../../../shared/agentChat'
import { type ClientChatMessage, migrateMessages } from './messages'
import { oldFormatMessages } from './__fixtures__/oldFormatMessages'
import en from '../../locales/en.json'
import Conversation from './Conversation'

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

const RESPONSE_TEXT = 'The capital of Finland is Helsinki.'

type Props = { messages: ClientChatMessage[]; completion: string; isStreaming: boolean; endState?: 'none' | 'canceled' | 'error' }

// Stable references: Conversation memoizes on `parts`
const partsCache = new Map<string, AssistantPart[]>()
const textParts = (text: string): AssistantPart[] => {
  if (!text) return []
  if (!partsCache.has(text)) partsCache.set(text, [{ type: 'text', text }])
  return partsCache.get(text)!
}

const renderConversation = ({ completion, ...props }: Props) =>
  render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <Conversation
          endState="none"
          {...props}
          streamingParts={textParts(completion)}
          isMobile={false}
          latestResponseIndex={props.messages.length - 1}
          latestResponseRef={createRef<HTMLDivElement>()}
        />
      </I18nextProvider>
    </StrictMode>,
  )

const conversationProps = ({ completion, ...props }: Props) => (
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <Conversation
        endState="none"
        {...props}
        streamingParts={textParts(completion)}
        isMobile={false}
        latestResponseIndex={props.messages.length - 1}
        latestResponseRef={createRef<HTMLDivElement>()}
      />
    </I18nextProvider>
  </StrictMode>
)

const userTurn: ClientChatMessage[] = [{ role: 'user', content: 'What is the capital of Finland?' }]

describe('Conversation streaming accessibility', () => {
  test('marks the streaming assistant message as aria-busy', () => {
    renderConversation({ messages: userTurn, completion: RESPONSE_TEXT, isStreaming: true })

    expect(screen.getByTestId('assistant-message').getAttribute('aria-busy')).toBe('true')
  })

  test('a completed assistant message is no longer aria-busy', () => {
    renderConversation({
      messages: [...userTurn, { role: 'assistant', parts: textParts(RESPONSE_TEXT) }],
      completion: '',
      isStreaming: false,
    })

    expect(screen.getByTestId('assistant-message').getAttribute('aria-busy')).not.toBe('true')
  })

  test('the live region announces state, never the response content', () => {
    const { rerender } = renderConversation({ messages: userTurn, completion: '', isStreaming: true })
    const region = () => screen.getByTestId('stream-status-announcer')

    expect(region().textContent).toBe('Processing the request.')

    rerender(conversationProps({ messages: userTurn, completion: RESPONSE_TEXT, isStreaming: true }))
    expect(region().textContent).toBe('Generating a response.')
    expect(region().textContent).not.toContain('The capital of Finland is Helsinki.')

    // The response is rendered on the page, but outside the live region.
    expect(screen.getByTestId('assistant-message').textContent).toContain('The capital of Finland is Helsinki.')

    rerender(
      conversationProps({
        messages: [...userTurn, { role: 'assistant', parts: textParts(RESPONSE_TEXT) }],
        completion: '',
        isStreaming: false,
      }),
    )
    expect(region().textContent).toBe('The response is ready.')
    expect(region().textContent).not.toContain('The capital of Finland is Helsinki.')
  })

  test('token-by-token completion updates do not change the live region text', () => {
    const { rerender } = renderConversation({ messages: userTurn, completion: 'The', isStreaming: true })
    const region = () => screen.getByTestId('stream-status-announcer')

    const seen = new Set<string>()
    for (const partial of ['The capital', 'The capital of', 'The capital of Finland', RESPONSE_TEXT]) {
      rerender(conversationProps({ messages: userTurn, completion: partial, isStreaming: true }))
      seen.add(region().textContent ?? '')
    }

    expect([...seen]).toEqual(['Generating a response.'])
  })

  test('does not announce anything for an idle conversation', () => {
    renderConversation({ messages: [], completion: '', isStreaming: false })

    expect(screen.getByTestId('stream-status-announcer').textContent).toBe('')
  })

  test('announces that generation was canceled when the user stops it', () => {
    const { rerender } = renderConversation({ messages: userTurn, completion: RESPONSE_TEXT, isStreaming: true })

    rerender(conversationProps({ messages: userTurn, completion: '', isStreaming: false, endState: 'canceled' }))

    expect(screen.getByTestId('stream-status-announcer').textContent).toBe('Response generation was canceled.')
  })

  test('announces that generation failed when the request errors out', () => {
    const { rerender } = renderConversation({ messages: userTurn, completion: RESPONSE_TEXT, isStreaming: true })

    rerender(conversationProps({ messages: userTurn, completion: '', isStreaming: false, endState: 'error' }))

    expect(screen.getByTestId('stream-status-announcer').textContent).toBe('Generating a response failed.')
  })
})

describe('old saved conversations', () => {
  test('a migrated message with RAG tool calls shows its Sources button', () => {
    const messages = migrateMessages(oldFormatMessages)
    renderConversation({ messages, completion: '', isStreaming: false })

    expect(screen.getAllByTestId('file-search-sources')).toHaveLength(1)
    expect(screen.getByText('Found it in the lecture notes.')).toBeTruthy()
  })
})
