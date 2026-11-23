import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import i18next from 'i18next'
import { createRef } from 'react'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'

vi.mock('../../../config', () => ({}))
vi.mock('../../hooks/useUserStatus', () => {
  const status = { refetch: () => {} }
  return { default: () => status }
})
vi.mock('../../hooks/useCurrentUser', () => {
  // Enter sends, and the send preference is already chosen so its popover does not open
  const currentUser = { user: { id: 'student-1', preferences: { sendShortcutMode: 'enter' } } }
  return { default: () => currentUser }
})
vi.mock('./ModelSelector', () => ({ default: () => null }))
vi.mock('./UsageSelector', () => ({ default: () => null }))
vi.mock('./useKeyboardCommands', () => ({ useKeyboardCommands: () => {} }))
vi.mock('../common/accessibility/SnackbarAnnouncer', () => ({ announceToScreenReader: vi.fn() }))
vi.mock('../Settings/SendPreferenceConfigurator', () => ({
  SendPreferenceConfiguratorModal: () => null,
  ShiftEnterForNewline: () => null,
  ShiftEnterToSend: () => null,
}))

import en from '../../locales/en.json'
import { announceToScreenReader } from '../common/accessibility/SnackbarAnnouncer'
import type { PendingQuote } from '../FileViewer/selectionQuote'
import { ChatBox, type ChatBoxActions, type QuizPrompt } from './ChatBox'

const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.use(initReactI18next).init({ resources: { en }, lng: 'en', fallbackLng: 'en', defaultNS: 'common' })
})
afterEach(cleanup)

const renderChatBox = ({
  quizPrompt = null,
  budgetResetsAt = null,
  disabled = false,
}: { quizPrompt?: QuizPrompt | null; budgetResetsAt?: string | null; disabled?: boolean } = {}) => {
  const handleSubmit = vi.fn()
  const actionsRef = createRef<ChatBoxActions>()
  const fileInputRef = createRef<HTMLInputElement>()
  const chatBox = (prompt: QuizPrompt | null) => (
    <MemoryRouter>
      <I18nextProvider i18n={i18n}>
        <ChatBox
          disabled={disabled}
          isTokenLimitExceeded={false}
          budgetResetsAt={budgetResetsAt}
          fileInputRef={fileInputRef}
          fileName=""
          messageWarning={{}}
          setFileName={() => {}}
          handleCancel={() => {}}
          handleContinue={() => {}}
          handleSubmit={handleSubmit}
          handleReset={() => {}}
          handleStop={() => {}}
          isMobile={false}
          currentModel={'gpt-4o' as never}
          setModel={() => {}}
          isNewResponseAvailable={false}
          onGoToLatestResponse={() => {}}
          quizPrompt={prompt}
          actionsRef={actionsRef}
        />
      </I18nextProvider>
    </MemoryRouter>
  )
  const utils = render(chatBox(quizPrompt))
  return { ...utils, handleSubmit, actionsRef, rerenderWith: (prompt: QuizPrompt | null) => utils.rerender(chatBox(prompt)) }
}

const input = () => screen.getByTestId('chat-input') as HTMLTextAreaElement
const sendButton = () => screen.getByTestId('send-chat-message') as HTMLButtonElement
const description = () =>
  input()
    .getAttribute('aria-describedby')!
    .split(' ')
    .map((id) => document.getElementById(id)!.textContent)
    .join(' ')

describe('ChatBox', () => {
  test('without a picked quiz option, Send needs text and sends it as a message', () => {
    const { handleSubmit } = renderChatBox()
    expect(input().placeholder).toBe('Type your message here...')
    expect(description()).not.toContain('(optional)')
    expect(sendButton().disabled).toBe(true)

    fireEvent.change(input(), { target: { value: 'hello' } })
    fireEvent.click(sendButton())
    expect(handleSubmit).toHaveBeenCalledWith('hello')
    expect(input().value).toBe('')
  })

  test('with a quiz option picked, the chat box asks why in its placeholder, and the field and Send say that the answer is sent', () => {
    const quizSend = 'Sends your quiz answer, with this text as your reasoning.'
    const sendDescription = () => document.getElementById(sendButton().getAttribute('aria-describedby')!)!.textContent

    const { rerenderWith } = renderChatBox({ quizPrompt: 'reasoning' })
    expect(input().placeholder).toBe('Why did you pick this? (optional)')
    expect(description()).not.toContain('(optional)')
    expect(description()).toContain(quizSend)
    expect(description()).toContain('Enter sends the message')
    expect(sendDescription()).toBe(quizSend)

    rerenderWith('unclear')
    expect(input().placeholder).toBe('What part is unclear? (optional)')
    expect(description()).toContain(quizSend)

    rerenderWith(null)
    expect(input().placeholder).toBe('Type your message here...')
    expect(description()).not.toContain(quizSend)
    expect(sendButton().getAttribute('aria-describedby')).toBeNull()
  })

  test('with a quiz option picked, Send works with an empty chat box', () => {
    const { handleSubmit } = renderChatBox({ quizPrompt: 'reasoning' })
    expect(sendButton().disabled).toBe(false)
    fireEvent.click(sendButton())
    expect(handleSubmit).toHaveBeenCalledWith('')
  })

  test('with a quiz option picked, Enter sends the explanation and clears the chat box', () => {
    const { handleSubmit } = renderChatBox({ quizPrompt: 'reasoning' })
    fireEvent.change(input(), { target: { value: 'it has no divisors' } })
    fireEvent.keyDown(input(), { key: 'Enter' })
    expect(handleSubmit).toHaveBeenCalledWith('it has no divisors')
    expect(input().value).toBe('')
  })

  test('submit() (the quiz card Submit) sends the chat box text without focusing the chat box', () => {
    const { handleSubmit, actionsRef } = renderChatBox({ quizPrompt: 'unclear' })
    fireEvent.change(input(), { target: { value: 'what is a prime?' } })
    const other = document.createElement('button')
    document.body.appendChild(other)
    other.focus()

    act(() => actionsRef.current!.submit())
    expect(handleSubmit).toHaveBeenCalledWith('what is a prime?')
    expect(input().value).toBe('')
    expect(document.activeElement).toBe(other)
    other.remove()
  })

  test('with the weekly budget used up, Send stays disabled and the chat box says when the budget resets', () => {
    const resetsAt = '2026-11-23T00:01:00.000Z'
    const { handleSubmit } = renderChatBox({ budgetResetsAt: resetsAt })

    const formatted = new Date(resetsAt).toLocaleString('en', { dateStyle: 'full', timeStyle: 'short' })
    expect(screen.getByTestId('budget-used-up').textContent).toBe(`You have used up your weekly CurreChat budget. Next reset: ${formatted}.`)

    fireEvent.change(input(), { target: { value: 'hello' } })
    expect(sendButton().disabled).toBe(true)
    fireEvent.keyDown(input(), { key: 'Enter' })
    expect(handleSubmit).not.toHaveBeenCalled()
  })

  test('without a used-up budget, no budget message is shown', () => {
    renderChatBox()
    expect(screen.queryByTestId('budget-used-up')).toBeNull()
  })
})

describe('ChatBox quote chip', () => {
  const pending = (text: string, overrides: Partial<PendingQuote> = {}): PendingQuote => ({
    quote: { kind: 'text', path: 'Course/week3/notes.md', heading: 'Eigenvalues', text },
    truncated: false,
    ...overrides,
  })
  const chips = () => screen.queryAllByTestId('quote-chip')

  test('addQuote shows the quote above the input, focuses the input and announces it', () => {
    const { actionsRef } = renderChatBox()
    expect(chips()).toHaveLength(0)

    act(() => actionsRef.current!.addQuote(pending('An eigenvector keeps its direction.')))
    expect(chips()).toHaveLength(1)
    expect(chips()[0].textContent).toBe('Quote from notes.md · Eigenvalues: An eigenvector keeps its direction.')
    expect(chips()[0].getAttribute('aria-label')).toBe('Quote from notes.md · Eigenvalues, Remove the quote by pressing Delete or Backspace')
    expect(document.activeElement).toBe(input())
    expect(announceToScreenReader).toHaveBeenCalledWith('Quote added to chat')
  })

  test('a PDF quote shows its page', () => {
    const { actionsRef } = renderChatBox()
    act(() => actionsRef.current!.addQuote({ quote: { kind: 'text', path: 'Course/book.pdf', page: 3, text: 'Entropy grows.' }, truncated: false }))
    expect(chips()[0].textContent).toBe('Quote from book.pdf · p. 3: Entropy grows.')
    expect(chips()[0].getAttribute('aria-label')).toBe('Quote from book.pdf · p. 3, Remove the quote by pressing Delete or Backspace')
  })

  test('a new quote replaces the earlier one, and a truncated one says so', () => {
    const { actionsRef } = renderChatBox()
    act(() => actionsRef.current!.addQuote(pending('first')))
    act(() => actionsRef.current!.addQuote(pending('second', { truncated: true })))
    expect(chips()).toHaveLength(1)
    expect(chips()[0].textContent).toBe('Quote from notes.md · Eigenvalues (truncated): second')
    expect(chips()[0].getAttribute('aria-label')).toContain('truncated')
  })

  test('the chip can be removed with Delete, which focuses the input', () => {
    const { actionsRef, handleSubmit } = renderChatBox()
    act(() => actionsRef.current!.addQuote(pending('first')))
    chips()[0].focus()
    fireEvent.keyUp(chips()[0], { key: 'Delete' })
    expect(chips()).toHaveLength(0)
    expect(document.activeElement).toBe(input())
    expect(announceToScreenReader).toHaveBeenCalledWith('Quote removed')

    fireEvent.change(input(), { target: { value: 'hello' } })
    fireEvent.click(sendButton())
    expect(handleSubmit).toHaveBeenCalledWith('hello')
  })

  test('sending carries the quote and clears the chip', () => {
    const { actionsRef, handleSubmit } = renderChatBox()
    const quote = pending('An eigenvector keeps its direction.')
    act(() => actionsRef.current!.addQuote(quote))
    expect(sendButton().disabled).toBe(true)

    fireEvent.change(input(), { target: { value: 'What does this mean?' } })
    fireEvent.click(sendButton())
    expect(handleSubmit).toHaveBeenCalledWith('What does this mean?', [quote.quote])
    expect(chips()).toHaveLength(0)
  })

  test('a quiz answer is sent without the quote, which stays for the next message', () => {
    const { actionsRef, handleSubmit, rerenderWith } = renderChatBox({ quizPrompt: 'reasoning' })
    act(() => actionsRef.current!.addQuote(pending('quoted')))
    fireEvent.click(sendButton())
    expect(handleSubmit).toHaveBeenCalledWith('')
    expect(chips()).toHaveLength(1)

    rerenderWith(null)
    fireEvent.change(input(), { target: { value: 'now with the quote' } })
    fireEvent.click(sendButton())
    expect(handleSubmit).toHaveBeenLastCalledWith('now with the quote', [pending('quoted').quote])
  })

  test('a quick action sends the quote with its message right away, keeping the draft and the pending chip', () => {
    const { actionsRef, handleSubmit } = renderChatBox()
    act(() => actionsRef.current!.addQuote(pending('in the chip')))
    fireEvent.change(input(), { target: { value: 'my draft' } })
    vi.mocked(announceToScreenReader).mockClear()

    const quick = pending('explain me')
    act(() => actionsRef.current!.addQuote(quick, { message: 'Explain this passage.', send: true }))
    expect(handleSubmit).toHaveBeenCalledWith('Explain this passage.', [quick.quote])
    expect(input().value).toBe('my draft')
    expect(chips()).toHaveLength(1)
    expect(chips()[0].textContent).toContain('in the chip')
    expect(announceToScreenReader).not.toHaveBeenCalled()
  })

  test('a quick action is not sent while a response streams or the budget is used up', () => {
    const streaming = renderChatBox({ disabled: true })
    act(() => streaming.actionsRef.current!.addQuote(pending('quoted'), { message: 'Explain this passage.', send: true }))
    expect(streaming.handleSubmit).not.toHaveBeenCalled()
    expect(chips()).toHaveLength(0)
    cleanup()

    const usedUp = renderChatBox({ budgetResetsAt: new Date(Date.now() + 86_400_000).toISOString() })
    act(() => usedUp.actionsRef.current!.addQuote(pending('quoted'), { message: 'Explain this passage.', send: true }))
    expect(usedUp.handleSubmit).not.toHaveBeenCalled()
  })

  test('a quick action is sent as a message while a quiz option is picked', () => {
    const { actionsRef, handleSubmit } = renderChatBox({ quizPrompt: 'reasoning' })
    act(() => actionsRef.current!.addQuote(pending('quoted'), { message: 'Summarize this passage.', send: true }))
    expect(handleSubmit).toHaveBeenCalledWith('Summarize this passage.', [pending('quoted').quote])
  })

  test('clearQuote removes the chip', () => {
    const { actionsRef } = renderChatBox()
    act(() => actionsRef.current!.addQuote(pending('first')))
    act(() => actionsRef.current!.clearQuote())
    expect(chips()).toHaveLength(0)
  })
})
