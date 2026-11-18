import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import i18next from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'

const mutateAsync = vi.fn()
const mutation = { mutateAsync, isPending: false }

vi.mock('../../../hooks/useCourseMutation', () => ({
  useEditCourseMutation: () => mutation,
}))
vi.mock('../../common/Snackbar', () => ({ enqueueSnackbar: vi.fn() }))
vi.mock('@config', () => ({ DEFAULT_TOKEN_LIMIT: 200_000 }))

import en from '../../../locales/en.json'
import { CourseTokenLimitEditor } from './CourseTokenLimitEditor'
import { enqueueSnackbar } from '../../common/Snackbar'

const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.use(initReactI18next).init({ resources: { en }, lng: 'en', fallbackLng: 'en', defaultNS: 'common' })
})
beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)

// Intl's Finnish grouping uses non-breaking spaces
const fi = (s: string) => s.replaceAll(' ', '\u00a0')

const course = { courseId: 'cur-1', usageLimit: 200_000 } as any

const renderEditor = () => {
  render(
    <I18nextProvider i18n={i18n}>
      <CourseTokenLimitEditor course={course} />
    </I18nextProvider>,
  )
  return {
    input: screen.getByLabelText(en.course.tokenLimitLabel) as HTMLInputElement,
    save: screen.getByRole('button', { name: en.common.save }) as HTMLButtonElement,
  }
}

describe('CourseTokenLimitEditor', () => {
  test('shows the current limit and saves a new one', async () => {
    const { input, save } = renderEditor()
    expect(input.value).toBe(fi('200 000'))
    expect(save.disabled).toBe(true)

    fireEvent.change(input, { target: { value: '5000000' } })
    expect(input.value).toBe(fi('5 000 000'))
    fireEvent.click(save)

    expect(mutateAsync).toHaveBeenCalledWith({ usageLimit: 5_000_000 })
    await vi.waitFor(() =>
      expect(enqueueSnackbar).toHaveBeenCalledWith(`Course token limit set to ${fi('5 000 000')} tokens per user per week`, { variant: 'success' }),
    )
  })

  test.each([
    ['5000', '5 000'],
    ['50 0000', '500 000'],
    ['1,000,000', '1 000 000'],
    ['20k', '20'],
    ['-5', '5'],
  ])('formats "%s" as "%s"', (typed, shown) => {
    const { input } = renderEditor()
    fireEvent.change(input, { target: { value: typed } })

    expect(input.value).toBe(fi(shown))
  })

  test.each(['', '0'])('does not save the invalid limit "%s"', (value) => {
    const { input, save } = renderEditor()
    fireEvent.change(input, { target: { value } })

    expect(save.disabled).toBe(true)
    expect(screen.getByText(en.course.tokenLimitInvalid)).toBeTruthy()
  })

  test('ignores input over the maximum', () => {
    const { input } = renderEditor()
    fireEvent.change(input, { target: { value: '2 147 483 647' } })
    fireEvent.change(input, { target: { value: '2 147 483 6470' } })

    expect(input.value).toBe(fi('2 147 483 647'))
  })
})
