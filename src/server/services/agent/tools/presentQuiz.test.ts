// @vitest-environment node
import { describe, expect, test } from 'vitest'
import type { ToolPart } from '@shared/agentChat'
import { quizOutcome, quizProblems } from '@shared/quiz'
import { findQuizPart, presentQuiz, quizAnswerToText } from './presentQuiz'

const quiz = {
  question: 'Which of these is a prime number?',
  options: [
    { id: 'a', text: '4' },
    { id: 'b', text: '7' },
    { id: 'c', text: '9' },
  ],
  multiSelect: false,
  correct: ['b'],
  explanation: '7 has no divisors other than 1 and itself.',
  concept: 'prime numbers',
}

const quizPart = (overrides: Partial<ToolPart> = {}): ToolPart => ({
  type: 'tool',
  callId: 'quiz_1',
  name: 'present_quiz',
  input: quiz,
  status: 'ok',
  result: { correct: quiz.correct, explanation: quiz.explanation },
  ...overrides,
})

describe('present_quiz summarizeForHistory', () => {
  test('covers the question, the options and the correct answer', () => {
    expect(presentQuiz.summarizeForHistory(quizPart())).toBe(
      [
        '[Showed the student a quiz on prime numbers: "Which of these is a prime number?"',
        'Options:',
        '- a) 4',
        '- b) 7 (correct)',
        '- c) 9',
        'Explanation shown after answering: "7 has no divisors other than 1 and itself."]',
      ].join('\n'),
    )
  })

  test('says when several answers were allowed', () => {
    const text = presentQuiz.summarizeForHistory(quizPart({ input: { ...quiz, multiSelect: true, correct: ['a', 'b'], concept: undefined } }))
    expect(text).toMatch(/^\[Showed the student a quiz \(several answers allowed\): /)
    expect(text).toContain('- a) 4 (correct)\n- b) 7 (correct)\n- c) 9')
  })

  test('says when the quiz failed or its input is not a quiz', () => {
    expect(presentQuiz.summarizeForHistory(quizPart({ status: 'error' }))).toBe('[Tried to show the student a quiz, but it failed.]')
    expect(presentQuiz.summarizeForHistory(quizPart({ input: { question: 'x' } }))).toBe('[Tried to show the student a quiz, but it failed.]')
  })
})

describe('quizAnswerToText', () => {
  test('a correct answer with the reasoning', () => {
    expect(quizAnswerToText({ callId: 'quiz_1', selected: ['b'], explanation: ' 7 only divides by itself ' }, quizPart())).toBe(
      ['[Quiz answer]', 'Selected: b) 7', 'Result: correct', 'Student\'s reasoning: "7 only divides by itself"'].join('\n'),
    )
  })

  test('a wrong answer also names the correct one', () => {
    expect(quizAnswerToText({ callId: 'quiz_1', selected: ['a'] }, quizPart())).toBe(
      ['[Quiz answer]', 'Selected: a) 4', 'Result: incorrect', 'Correct answer: b) 7'].join('\n'),
    )
  })

  test('"I don\'t know" is a signal of its own, with what is unclear', () => {
    expect(quizAnswerToText({ callId: 'quiz_1', selected: ['idk'], explanation: 'what is a prime?' }, quizPart())).toBe(
      ['[Quiz answer]', 'Selected: "I don\'t know"', 'Result: did not know', 'Correct answer: b) 7', 'What is unclear to the student: "what is a prime?"'].join(
        '\n',
      ),
    )
  })

  test('without its quiz in the history, only the selected ids', () => {
    expect(quizAnswerToText({ callId: 'gone', selected: ['a', 'c'] }, undefined)).toBe('[Quiz answer]\nSelected: a; c')
  })

  test('findQuizPart takes the closest quiz with the call id', () => {
    const older = quizPart({ input: { ...quiz, question: 'older' } })
    const newer = quizPart()
    expect(findQuizPart([[older], [{ type: 'text', text: 'hi' }, newer]], 'quiz_1')).toBe(newer)
    expect(findQuizPart([[older]], 'other')).toBeUndefined()
  })
})

describe('quiz rules', () => {
  test('quizOutcome needs exactly the correct options; idk wins', () => {
    expect(quizOutcome(['a', 'c'], ['c', 'a'])).toBe('correct')
    expect(quizOutcome(['a', 'c'], ['a'])).toBe('incorrect')
    expect(quizOutcome(['a'], ['a', 'b'])).toBe('incorrect')
    expect(quizOutcome(['a'], ['idk'])).toBe('idk')
  })

  test('quizProblems catches what the client cannot show', () => {
    expect(quizProblems(quiz)).toEqual([])
    expect(quizProblems({ ...quiz, options: [{ id: 'a', text: 'x' }], correct: ['a'] })).toHaveLength(1)
    expect(quizProblems({ ...quiz, options: [...quiz.options, { id: 'idk', text: 'no' }] })).toHaveLength(1)
    expect(quizProblems({ ...quiz, correct: ['a', 'b'] })).toEqual(['A single-select quiz has exactly one correct option.'])
    expect(quizProblems({ ...quiz, correct: ['z'] })).toEqual(['Every id in correct must be an option id.'])
  })
})
