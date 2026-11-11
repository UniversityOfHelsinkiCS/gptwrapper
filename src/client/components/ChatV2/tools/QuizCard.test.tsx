import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import i18next, { type TFunction } from 'i18next'
import { useState } from 'react'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import type { ToolPart } from '../../../../shared/agentChat'
import type { QuizAnswer } from '../../../../shared/quiz'
import en from '../../../locales/en.json'
import { QuizPart } from './QuizCard'
import { findQuiz, quizAnswerMessage, QuizAnswerProvider, type QuizAnswerContextValue, type QuizSelection } from './quizAnswerContext'

const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.use(initReactI18next).init({ resources: { en }, lng: 'en', fallbackLng: 'en', defaultNS: 'common' })
})
afterEach(cleanup)

const singleQuiz = {
  question: 'Which of these is a prime number?',
  options: [
    { id: 'a', text: '4' },
    { id: 'b', text: '7' },
    { id: 'c', text: '9' },
  ],
  multiSelect: false,
  correct: ['b'],
  explanation: 'Seven has no other divisors.',
}

const multiQuiz = {
  question: 'Which of these are even?',
  options: [
    { id: 'a', text: '2' },
    { id: 'b', text: '3' },
    { id: 'c', text: '4' },
  ],
  multiSelect: true,
  correct: ['a', 'c'],
  explanation: 'Two and four divide by two.',
}

const quizPart = (quiz: typeof singleQuiz, overrides: Partial<ToolPart> = {}): ToolPart => ({
  type: 'tool',
  callId: 'quiz_1',
  name: 'present_quiz',
  input: quiz,
  status: 'ok',
  result: { correct: quiz.correct, explanation: quiz.explanation },
  ...overrides,
})

type Context = Omit<QuizAnswerContextValue, 'selection' | 'onSelect'> & { open?: boolean }

/** Keeps the selection the way ChatV2 does. `onSubmit` stands in for sending the answer from the chat box. */
const Harness = ({ part, open, ...context }: Context & { part: ToolPart }) => {
  const [selection, setSelection] = useState<QuizSelection | null>(null)
  return (
    <QuizAnswerProvider {...context} selection={selection} onSelect={open ? setSelection : undefined}>
      <QuizPart part={part} />
    </QuizAnswerProvider>
  )
}

const renderQuiz = (part: ToolPart, context: Context) =>
  render(
    <I18nextProvider i18n={i18n}>
      <Harness part={part} {...context} />
    </I18nextProvider>,
  )

const checkbox = (name: string) => screen.getByRole('checkbox', { name: new RegExp(`^${name}`) }) as HTMLInputElement
const radio = (name: string) => screen.getByRole('radio', { name: new RegExp(`^${name}`) }) as HTMLInputElement
const submitButton = () => screen.queryByRole('button', { name: 'Submit answer' }) as HTMLButtonElement | null

describe('QuizCard', () => {
  test('a single-select quiz is a labelled radio group, with "I don\'t know" as the last option and no text field', () => {
    renderQuiz(quizPart(singleQuiz), { open: true, onSubmit: vi.fn() })

    expect(screen.getByRole('group', { name: 'Quiz question' })).toBeTruthy()
    const group = screen.getByRole('radiogroup', { name: 'Which of these is a prime number?' })
    const names = Array.from(group.querySelectorAll('input[type="radio"]')).map((input) => (input as HTMLInputElement).value)
    expect(names).toEqual(['a', 'b', 'c', 'idk'])
    expect(radio("I don't know")).toBeTruthy()
    // The explanation is written in the chat box
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  test('"I don\'t know" excludes the other options in a multi-select quiz', () => {
    renderQuiz(quizPart(multiQuiz), { open: true, onSubmit: vi.fn() })
    expect(screen.getByRole('group', { name: 'Which of these are even?' })).toBeTruthy()

    fireEvent.click(checkbox('2'))
    fireEvent.click(checkbox('4'))
    expect([checkbox('2').checked, checkbox('4').checked]).toEqual([true, true])

    fireEvent.click(checkbox("I don't know"))
    expect([checkbox('2').checked, checkbox('4').checked, checkbox("I don't know").checked]).toEqual([false, false, true])

    fireEvent.click(checkbox('3'))
    expect([checkbox('3').checked, checkbox("I don't know").checked]).toEqual([true, false])
  })

  test('Submit is disabled until an option is picked, and says that it sends the message box text too', () => {
    renderQuiz(quizPart(singleQuiz), { open: true, onSubmit: vi.fn() })
    expect(submitButton()!.disabled).toBe(true)
    fireEvent.click(radio('7'))
    expect(submitButton()!.disabled).toBe(false)

    const descriptionId = submitButton()!.getAttribute('aria-describedby')!
    expect(document.getElementById(descriptionId)!.textContent).toBe('Also sends the text in the message box.')
  })

  test('Submit sends the answer; the answer then locks the card, shows the result and gets focus', () => {
    const onSubmit = vi.fn()
    const part = quizPart(singleQuiz)
    const { rerender } = renderQuiz(part, { open: true, onSubmit })

    fireEvent.click(radio('4'))
    fireEvent.click(submitButton()!)
    expect(onSubmit).toHaveBeenCalledTimes(1)

    // ChatV2 sends the answer as the next message, with the chat box text as the explanation
    rerender(
      <I18nextProvider i18n={i18n}>
        <Harness part={part} answer={{ callId: 'quiz_1', selected: ['a'], explanation: 'it looked prime' }} closed />
      </I18nextProvider>,
    )

    expect(submitButton()).toBeNull()
    expect(radio('4').disabled).toBe(true)
    expect(radio('4').checked).toBe(true)
    expect(radio('7').disabled).toBe(true)
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.getByTestId('quiz-explanation').textContent).toBe('Your comment: it looked prime')

    const result = screen.getByTestId('quiz-result')
    expect(result.getAttribute('data-quiz-outcome')).toBe('incorrect')
    expect(result.textContent).toContain('Not quite.')
    expect(result.textContent).toContain('Seven has no other divisors.')
    expect(document.activeElement).toBe(result)
    // The options say which one was right and which one the student picked
    expect(radio('7').closest('label')!.textContent).toContain('(correct answer)')
    expect(radio('4').closest('label')!.textContent).toContain('(your answer)')
  })

  test('"I don\'t know" is shown as not knowing, not as wrong', () => {
    renderQuiz(quizPart(singleQuiz), { answer: { callId: 'quiz_1', selected: ['idk'] }, closed: true })
    expect(radio("I don't know").checked).toBe(true)
    expect(screen.getByTestId('quiz-result').getAttribute('data-quiz-outcome')).toBe('idk')
    expect(screen.getByTestId('quiz-result').textContent).toContain('No problem, here is the answer.')
    expect(screen.queryByTestId('quiz-explanation')).toBeNull()
  })

  test('an answer already in the conversation (after a reload) shows the card locked with its result', () => {
    const answer: QuizAnswer = { callId: 'quiz_1', selected: ['a', 'c'], explanation: 'both divide by two' }
    renderQuiz(quizPart(multiQuiz), { answer, closed: true })

    expect(screen.getByTestId('quiz-card').getAttribute('data-quiz-state')).toBe('answered')
    expect([checkbox('2').checked, checkbox('3').checked, checkbox('4').checked]).toEqual([true, false, true])
    expect(checkbox('2').disabled).toBe(true)
    expect(screen.getByTestId('quiz-explanation').textContent).toBe('Your comment: both divide by two')
    expect(screen.getByTestId('quiz-result').getAttribute('data-quiz-outcome')).toBe('correct')
    expect(screen.getByTestId('quiz-result').textContent).toContain('Correct!')
    expect(document.activeElement).not.toBe(screen.getByTestId('quiz-result'))
    expect(submitButton()).toBeNull()
  })

  test('the answer of another quiz does not answer this one', () => {
    renderQuiz(quizPart(singleQuiz), { answer: { callId: 'other', selected: ['b'] }, open: true, onSubmit: vi.fn() })
    expect(screen.getByTestId('quiz-card').getAttribute('data-quiz-state')).toBe('open')
    expect(screen.queryByTestId('quiz-result')).toBeNull()
  })

  test('an unanswered quiz the conversation went past is locked as not answered', () => {
    renderQuiz(quizPart(singleQuiz), { closed: true })
    expect(screen.getByTestId('quiz-card').getAttribute('data-quiz-state')).toBe('closed')
    expect(radio('7').disabled).toBe(true)
    expect(submitButton()).toBeNull()
    expect(screen.getByText('Not answered')).toBeTruthy()
  })

  test('a quiz still being prepared or that failed is a status line', () => {
    renderQuiz(quizPart(singleQuiz, { status: 'running', result: undefined }), {})
    expect(screen.getByRole('group', { name: 'Quiz question' }).textContent).toContain('Preparing a quiz question…')
    cleanup()

    renderQuiz(quizPart(singleQuiz, { status: 'error', result: 'Invalid quiz' }), {})
    expect(screen.getByRole('group', { name: 'Quiz question' }).textContent).toContain('The quiz question could not be shown')
    expect(screen.queryByTestId('quiz-card')).toBeNull()
  })
})

describe('quiz answer message', () => {
  const t = i18n.t.bind(i18n) as unknown as TFunction

  test('names the picked options and adds the explanation from the chat box', () => {
    const quiz = findQuiz([{ type: 'text', text: 'Check' }, quizPart(multiQuiz)], 'quiz_1')!
    expect(quiz.question).toBe('Which of these are even?')
    expect(quizAnswerMessage(quiz, { callId: 'quiz_1', selected: ['a', 'c'], explanation: 'they divide by two' }, t)).toBe(
      'My answer: 2, 4\n\nthey divide by two',
    )
    expect(quizAnswerMessage(quiz, { callId: 'quiz_1', selected: ['idk'] }, t)).toBe("My answer: I don't know")
  })

  test('finds only a ready quiz with that call id', () => {
    expect(findQuiz([quizPart(singleQuiz)], 'other')).toBeNull()
    expect(findQuiz([quizPart(singleQuiz, { status: 'running' })], 'quiz_1')).toBeNull()
  })
})
