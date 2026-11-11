import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import i18next from 'i18next'
import { createRef, StrictMode } from 'react'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'

vi.mock('../../../config', () => ({ ValidModelNameSchema: { parse: (v: unknown) => v } }))
vi.mock('react-syntax-highlighter', () => ({ PrismAsync: () => null }))
vi.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({ oneDark: {} }))

import type { AssistantPart } from '../../../shared/agentChat'
import { type ClientChatMessage, migrateMessages, parseStoredMessages, serializeMessages } from './messages'
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

describe('tool parts', () => {
  const answer: ClientChatMessage = {
    role: 'assistant',
    parts: [
      { type: 'tool', callId: 'c1', name: 'document_search', input: { query: 'exam date' }, status: 'ok', result: { files: [{ fileName: 'syllabus.pdf' }] } },
      { type: 'tool', callId: 'c2', name: 'document_search', input: { query: 'exam hall' }, status: 'ok', result: { files: [] } },
      { type: 'text', text: 'The exam is on 12 December.' },
    ],
  }

  test('render in their place in the answer, as labelled groups, followed by one Sources button', () => {
    renderConversation({ messages: [...userTurn, answer], completion: '', isStreaming: false })

    const message = screen.getByTestId('assistant-message')
    const groups = screen.getAllByRole('group', { name: 'Source material search' })
    expect(groups.map((group) => group.textContent)).toEqual([
      'Searched the source material for “exam date”',
      'Nothing found in the source material for “exam hall”',
    ])
    // Tool parts come before the text that followed them
    const text = screen.getByText('The exam is on 12 December.')
    expect(groups.every((group) => group.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
    expect(message.querySelectorAll('[data-testid="file-search-sources"]')).toHaveLength(1)
  })

  test('a running search says so, and an unknown tool gets a generic label', () => {
    const parts: AssistantPart[] = [
      { type: 'tool', callId: 'c1', name: 'document_search', input: { query: 'exam' }, status: 'running' },
      { type: 'tool', callId: 'c2', name: 'some_new_tool', input: {}, status: 'error', result: 'boom' },
    ]
    render(
      <I18nextProvider i18n={i18n}>
        <Conversation
          endState="none"
          messages={userTurn}
          streamingParts={parts}
          isStreaming
          isMobile={false}
          latestResponseIndex={null}
          latestResponseRef={createRef<HTMLDivElement>()}
        />
      </I18nextProvider>,
    )

    expect(screen.getByRole('group', { name: 'Source material search' }).textContent).toBe('Searching the source material for “exam”…')
    expect(screen.getByRole('group', { name: 'Tool some_new_tool' }).textContent).toBe('The tool some_new_tool failed')
  })
})

describe('subagent parts', () => {
  const answer: ClientChatMessage = {
    role: 'assistant',
    parts: [
      {
        type: 'subagent',
        callId: 's1',
        name: 'mock_subagent',
        task: 'Find the mock facts',
        status: 'ok',
        parts: [
          { type: 'text', text: 'Let me look that up.' },
          { type: 'tool', callId: 'c1', name: 'mock_lookup', input: { query: 'facts' }, status: 'ok', result: 'found' },
          { type: 'text', text: 'Found **42** facts.' },
        ],
      },
      { type: 'text', text: 'There are 42 facts.' },
    ],
  }

  test('show a card with name, status and task, collapsed by default, before the text that followed', () => {
    renderConversation({ messages: [...userTurn, answer], completion: '', isStreaming: false })

    const toggle = screen.getByRole('button', { name: 'Subagent mock_subagent finished' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(toggle.hasAttribute('aria-controls')).toBe(false)
    expect(document.getElementById(toggle.getAttribute('aria-describedby')!)?.textContent).toBe('Task: Find the mock facts')
    expect(screen.queryByText('Let me look that up.')).toBeNull()
    expect(screen.queryByRole('group', { name: 'Tool mock_lookup' })).toBeNull()

    const card = screen.getByTestId('subagent-card')
    expect(card.compareDocumentPosition(screen.getByText('There are 42 facts.')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  test("open to show the subagent's own text and tool parts, rendered like an answer's", () => {
    renderConversation({ messages: [...userTurn, answer], completion: '', isStreaming: false })
    const toggle = screen.getByRole('button', { name: 'Subagent mock_subagent finished' })

    fireEvent.click(toggle)

    const content = screen.getByTestId('subagent-content')
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(toggle.getAttribute('aria-controls')).toBe(content.id)
    expect(content.textContent).toContain('Let me look that up.')
    expect(content.querySelector('strong')?.textContent).toBe('42')
    expect(screen.getByRole('group', { name: 'Tool mock_lookup' }).textContent).toBe('Used the tool mock_lookup')
  })

  test('a running and a failed subagent say so', () => {
    const parts: AssistantPart[] = [
      { type: 'subagent', callId: 's1', name: 'reader', task: 'Read it', status: 'error', parts: [] },
      { type: 'subagent', callId: 's2', name: 'searcher', task: '', status: 'running', parts: [] },
    ]
    render(
      <I18nextProvider i18n={i18n}>
        <Conversation
          endState="none"
          messages={userTurn}
          streamingParts={parts}
          isStreaming
          isMobile={false}
          latestResponseIndex={null}
          latestResponseRef={createRef<HTMLDivElement>()}
        />
      </I18nextProvider>,
    )

    expect(screen.getByRole('button', { name: 'Subagent reader failed' })).toBeTruthy()
    const running = screen.getByRole('button', { name: 'Subagent searcher is working…' })
    expect(running.getAttribute('aria-expanded')).toBe('false')
    expect(running.hasAttribute('aria-describedby')).toBe(false)
  })
})

describe('quiz parts', () => {
  const quizInput = {
    question: 'Which of these is a prime number?',
    options: [
      { id: 'a', text: '4' },
      { id: 'b', text: '7' },
    ],
    multiSelect: false,
    correct: ['b'],
    explanation: 'Seven has no other divisors.',
  }
  const quizMessage: ClientChatMessage = {
    role: 'assistant',
    parts: [
      { type: 'text', text: "Let's check." },
      { type: 'tool', callId: 'q1', name: 'present_quiz', input: quizInput, status: 'ok', result: { correct: ['b'], explanation: quizInput.explanation } },
    ],
  }
  const quizTurn: ClientChatMessage[] = [{ role: 'user', content: 'quiz' }, quizMessage]
  const answerMessage: ClientChatMessage = { role: 'user', content: 'My answer: 7', quizAnswer: { callId: 'q1', selected: ['b'] } }

  const renderWith = (messages: ClientChatMessage[], { isStreaming = false, onQuizAnswer }: { isStreaming?: boolean; onQuizAnswer?: () => void } = {}) =>
    render(
      <I18nextProvider i18n={i18n}>
        <Conversation
          endState="none"
          messages={messages}
          streamingParts={[]}
          isStreaming={isStreaming}
          isMobile={false}
          onQuizAnswer={onQuizAnswer}
          latestResponseIndex={null}
          latestResponseRef={createRef<HTMLDivElement>()}
        />
      </I18nextProvider>,
    )

  test('a quiz in the latest answer can be answered, which sends the answer', () => {
    const onQuizAnswer = vi.fn()
    renderWith(quizTurn, { onQuizAnswer })

    expect(screen.getByTestId('quiz-card').getAttribute('data-quiz-state')).toBe('open')
    fireEvent.click(screen.getByRole('radio', { name: '7' }))
    fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }))
    expect(onQuizAnswer).toHaveBeenCalledWith({ callId: 'q1', selected: ['b'] }, 'My answer: 7')
  })

  test('cannot be answered while a response streams', () => {
    renderWith(quizTurn, { isStreaming: true, onQuizAnswer: vi.fn() })
    expect(screen.getByTestId('quiz-card').getAttribute('data-quiz-state')).toBe('waiting')
    expect(screen.queryByRole('button', { name: 'Submit answer' })).toBeNull()
  })

  test('the answer message after it keeps the quiz answered, also after a reload from localStorage', () => {
    const stored = parseStoredMessages(serializeMessages([...quizTurn, answerMessage]))
    expect(stored[2]).toEqual(answerMessage)

    renderWith(stored, { onQuizAnswer: vi.fn() })
    expect(screen.getByTestId('quiz-card').getAttribute('data-quiz-state')).toBe('answered')
    expect(screen.getByTestId('quiz-result').getAttribute('data-quiz-outcome')).toBe('correct')
    expect((screen.getByRole('radio', { name: /^7/ }) as HTMLInputElement).checked).toBe(true)
    expect(screen.queryByText('My answer: 7')).toBeNull()
  })

  test('a quiz the student went past without answering is closed', () => {
    renderWith([...quizTurn, { role: 'user', content: 'never mind' }], { onQuizAnswer: vi.fn() })
    expect(screen.getByTestId('quiz-card').getAttribute('data-quiz-state')).toBe('closed')
  })

  test('a regenerated quiz with the same call id is a new, open quiz', () => {
    // The mock model always uses the same call id: only the message right after a quiz answers it
    renderWith([...quizTurn, answerMessage, { role: 'assistant', parts: [{ type: 'text', text: 'Right!' }] }, { role: 'user', content: 'quiz' }, quizMessage], {
      onQuizAnswer: vi.fn(),
    })
    expect(screen.getAllByTestId('quiz-card').map((card) => card.getAttribute('data-quiz-state'))).toEqual(['answered', 'open'])
  })
})
