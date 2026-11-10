import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import i18next from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import type { ToolPart } from '../../../../shared/agentChat'
import type { QuizAnswer } from '../../../../shared/quiz'
import en from '../../../locales/en.json'
import { QuizPart } from './QuizCard'
import { QuizAnswerProvider, type QuizAnswerContextValue } from './quizAnswerContext'

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

const renderQuiz = (part: ToolPart, context: QuizAnswerContextValue) =>
  render(
    <I18nextProvider i18n={i18n}>
      <QuizAnswerProvider {...context}>
        <QuizPart part={part} />
      </QuizAnswerProvider>
    </I18nextProvider>,
  )

const checkbox = (name: string) => screen.getByRole('checkbox', { name: new RegExp(`^${name}`) }) as HTMLInputElement
const radio = (name: string) => screen.getByRole('radio', { name: new RegExp(`^${name}`) }) as HTMLInputElement
const explanationInput = () => screen.getByRole('textbox', { name: 'Your reasoning (optional)' }) as HTMLTextAreaElement
const submitButton = () => screen.queryByRole('button', { name: 'Submit answer' }) as HTMLButtonElement | null

describe('QuizCard', () => {
  test('a single-select quiz is a labelled radio group, with "I don\'t know" as the last option', () => {
    renderQuiz(quizPart(singleQuiz), { onAnswer: vi.fn() })

    expect(screen.getByRole('group', { name: 'Quiz question' })).toBeTruthy()
    const group = screen.getByRole('radiogroup', { name: 'Which of these is a prime number?' })
    const names = Array.from(group.querySelectorAll('input[type="radio"]')).map((input) => (input as HTMLInputElement).value)
    expect(names).toEqual(['a', 'b', 'c', 'idk'])
    expect(radio("I don't know")).toBeTruthy()
  })

  test('"I don\'t know" excludes the other options in a multi-select quiz, and changes the placeholder', () => {
    renderQuiz(quizPart(multiQuiz), { onAnswer: vi.fn() })
    expect(screen.getByRole('group', { name: 'Which of these are even?' })).toBeTruthy()
    expect(explanationInput().placeholder).toMatch(/^Why did you choose this\?/)

    fireEvent.click(checkbox('2'))
    fireEvent.click(checkbox('4'))
    expect([checkbox('2').checked, checkbox('4').checked]).toEqual([true, true])

    fireEvent.click(checkbox("I don't know"))
    expect([checkbox('2').checked, checkbox('4').checked, checkbox("I don't know").checked]).toEqual([false, false, true])
    expect(explanationInput().placeholder).toBe('What part is unclear?')

    fireEvent.click(checkbox('3'))
    expect([checkbox('3').checked, checkbox("I don't know").checked]).toEqual([true, false])
    expect(explanationInput().placeholder).toMatch(/^Why did you choose this\?/)
  })

  test('Submit is disabled until an option is picked', () => {
    renderQuiz(quizPart(singleQuiz), { onAnswer: vi.fn() })
    expect(submitButton()!.disabled).toBe(true)
    fireEvent.click(radio('7'))
    expect(submitButton()!.disabled).toBe(false)
  })

  test('Submit sends the answer message, locks the card and shows the result from the tool result', () => {
    const onAnswer = vi.fn<(answer: QuizAnswer, text: string) => void>()
    renderQuiz(quizPart(singleQuiz), { onAnswer })

    fireEvent.click(radio('4'))
    fireEvent.change(explanationInput(), { target: { value: '  it looked prime  ' } })
    fireEvent.click(submitButton()!)

    expect(onAnswer).toHaveBeenCalledTimes(1)
    expect(onAnswer).toHaveBeenCalledWith({ callId: 'quiz_1', selected: ['a'], explanation: 'it looked prime' }, 'My answer: 4\n\nit looked prime')

    expect(submitButton()).toBeNull()
    expect(radio('4').disabled).toBe(true)
    expect(radio('4').checked).toBe(true)
    expect(radio('7').disabled).toBe(true)
    expect(explanationInput().disabled).toBe(true)

    const result = screen.getByTestId('quiz-result')
    expect(result.getAttribute('data-quiz-outcome')).toBe('incorrect')
    expect(result.textContent).toContain('Not quite.')
    expect(result.textContent).toContain('Seven has no other divisors.')
    expect(document.activeElement).toBe(result)
    // The options say which one was right and which one the student picked
    expect(radio('7').closest('label')!.textContent).toContain('(correct answer)')
    expect(radio('4').closest('label')!.textContent).toContain('(your answer)')
  })

  test('"I don\'t know" is sent as idk and shown as not knowing, not as wrong', () => {
    const onAnswer = vi.fn()
    renderQuiz(quizPart(singleQuiz), { onAnswer })

    fireEvent.click(radio("I don't know"))
    fireEvent.click(submitButton()!)

    expect(onAnswer).toHaveBeenCalledWith({ callId: 'quiz_1', selected: ['idk'] }, "My answer: I don't know")
    expect(screen.getByTestId('quiz-result').getAttribute('data-quiz-outcome')).toBe('idk')
    expect(screen.getByTestId('quiz-result').textContent).toContain('No problem, here is the answer.')
  })

  test('an answer already in the conversation (after a reload) shows the card locked with its result', () => {
    const answer: QuizAnswer = { callId: 'quiz_1', selected: ['a', 'c'], explanation: 'both divide by two' }
    renderQuiz(quizPart(multiQuiz), { answer, closed: true })

    expect(screen.getByTestId('quiz-card').getAttribute('data-quiz-state')).toBe('answered')
    expect([checkbox('2').checked, checkbox('3').checked, checkbox('4').checked]).toEqual([true, false, true])
    expect(checkbox('2').disabled).toBe(true)
    expect(explanationInput().value).toBe('both divide by two')
    expect(screen.getByTestId('quiz-result').getAttribute('data-quiz-outcome')).toBe('correct')
    expect(screen.getByTestId('quiz-result').textContent).toContain('Correct!')
    expect(submitButton()).toBeNull()
  })

  test('the answer of another quiz does not answer this one', () => {
    renderQuiz(quizPart(singleQuiz), { answer: { callId: 'other', selected: ['b'] }, onAnswer: vi.fn() })
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
