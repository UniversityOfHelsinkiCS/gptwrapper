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
vi.mock('../Settings/SendPreferenceConfigurator', () => ({
  SendPreferenceConfiguratorModal: () => null,
  ShiftEnterForNewline: () => null,
  ShiftEnterToSend: () => null,
}))

import en from '../../locales/en.json'
import { ChatBox, type ChatBoxActions, type QuizPrompt } from './ChatBox'

const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.use(initReactI18next).init({ resources: { en }, lng: 'en', fallbackLng: 'en', defaultNS: 'common' })
})
afterEach(cleanup)

const renderChatBox = ({ quizPrompt = null }: { quizPrompt?: QuizPrompt | null } = {}) => {
  const handleSubmit = vi.fn()
  const actionsRef = createRef<ChatBoxActions>()
  const fileInputRef = createRef<HTMLInputElement>()
  const chatBox = (prompt: QuizPrompt | null) => (
    <MemoryRouter>
      <I18nextProvider i18n={i18n}>
        <ChatBox
          disabled={false}
          isTokenLimitExceeded={false}
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

  test('with a quiz option picked, the chat box asks why, also in its accessible description', () => {
    const { rerenderWith } = renderChatBox({ quizPrompt: 'reasoning' })
    expect(input().placeholder).toBe('Why did you pick this? (optional)')
    expect(description()).toContain('Why did you pick this? (optional)')
    expect(description()).toContain('Enter sends the message')

    rerenderWith('unclear')
    expect(input().placeholder).toBe('What part is unclear? (optional)')
    expect(description()).toContain('What part is unclear? (optional)')
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
})
