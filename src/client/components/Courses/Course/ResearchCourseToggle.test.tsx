import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import i18next from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'

const mutate = vi.fn()
const mutation = { mutate, isPending: false }

vi.mock('../../../hooks/useCourseMutation', () => ({
  useSaveDiscussionsMutation: () => mutation,
}))

import en from '../../../locales/en.json'
import { ResearchCourseToggle } from './ResearchCourseToggle'

const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.use(initReactI18next).init({ resources: { en }, lng: 'en', fallbackLng: 'en', defaultNS: 'common' })
})
beforeEach(() => vi.clearAllMocks())
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const course = (saveDiscussions: boolean) => ({ courseId: 'cur-1', name: { en: 'Intro', fi: 'Intro', sv: 'Intro' }, saveDiscussions }) as any

const renderToggle = (saveDiscussions: boolean) => {
  render(
    <I18nextProvider i18n={i18n}>
      <ResearchCourseToggle course={course(saveDiscussions)} />
    </I18nextProvider>,
  )
  return screen.getByRole('switch', { name: en.course.isReseachCourse }) as HTMLInputElement
}

describe('ResearchCourseToggle', () => {
  test('reflects the course research state', () => {
    expect(renderToggle(true).checked).toBe(true)
  })

  test('saves the new state after confirmation', () => {
    const confirm = vi.fn(() => true)
    vi.stubGlobal('confirm', confirm)

    fireEvent.click(renderToggle(false))

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Intro'))
    expect(mutate).toHaveBeenCalledWith({ chatId: 'cur-1', saveDiscussions: true })
  })

  test('does not save when the confirmation is cancelled', () => {
    vi.stubGlobal(
      'confirm',
      vi.fn(() => false),
    )

    fireEvent.click(renderToggle(true))

    expect(mutate).not.toHaveBeenCalled()
  })
})
