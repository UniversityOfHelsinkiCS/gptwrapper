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

import en from '../../../locales/en.json'
import { CourseBudgetBonusEditor } from './CourseBudgetBonusEditor'
import { enqueueSnackbar } from '../../common/Snackbar'

const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.use(initReactI18next).init({ resources: { en }, lng: 'en', fallbackLng: 'en', defaultNS: 'common' })
})
beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)

const renderEditor = (budgetBonusPercent: number | null) => {
  render(
    <I18nextProvider i18n={i18n}>
      <CourseBudgetBonusEditor course={{ courseId: 'cur-1', budgetBonusPercent } as any} />
    </I18nextProvider>,
  )
  return {
    input: screen.getByLabelText(en.course.budgetBonusLabel) as HTMLInputElement,
    save: screen.getByRole('button', { name: en.common.save }) as HTMLButtonElement,
  }
}

describe('CourseBudgetBonusEditor', () => {
  test('is labelled and shows the helper text', () => {
    renderEditor(null)

    expect(screen.getByText(en.course.budgetBonusTitle)).toBeTruthy()
    expect(screen.getByText(en.course.budgetBonusHelp)).toBeTruthy()
  })

  test('sets a bonus on a course without one', async () => {
    const { input, save } = renderEditor(null)
    expect(input.value).toBe('')
    expect(save.disabled).toBe(true)

    fireEvent.change(input, { target: { value: '100' } })
    fireEvent.click(save)

    expect(mutateAsync).toHaveBeenCalledWith({ budgetBonusPercent: 100 })
    await vi.waitFor(() => expect(enqueueSnackbar).toHaveBeenCalledWith('Course budget bonus set to 100 %', { variant: 'success' }))
  })

  test('changes an existing bonus', () => {
    const { input, save } = renderEditor(50)
    expect(input.value).toBe('50')

    fireEvent.change(input, { target: { value: '75' } })
    fireEvent.click(save)

    expect(mutateAsync).toHaveBeenCalledWith({ budgetBonusPercent: 75 })
  })

  test('clears the bonus when the field is emptied', async () => {
    const { input, save } = renderEditor(50)

    fireEvent.change(input, { target: { value: '' } })
    expect(save.disabled).toBe(false)
    fireEvent.click(save)

    expect(mutateAsync).toHaveBeenCalledWith({ budgetBonusPercent: null })
    await vi.waitFor(() => expect(enqueueSnackbar).toHaveBeenCalledWith(en.course.budgetBonusCleared, { variant: 'success' }))
  })

  test.each([
    ['-5', '5'],
    ['1.5', '15'],
    ['20%', '20'],
  ])('keeps only the digits of "%s"', (typed, shown) => {
    const { input } = renderEditor(null)
    fireEvent.change(input, { target: { value: typed } })

    expect(input.value).toBe(shown)
  })

  test('ignores input over the maximum', () => {
    const { input } = renderEditor(null)
    fireEvent.change(input, { target: { value: '10000' } })
    fireEvent.change(input, { target: { value: '100000' } })

    expect(input.value).toBe('10000')
  })

  test('shows the error when saving fails', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('Forbidden'))
    const { input, save } = renderEditor(null)

    fireEvent.change(input, { target: { value: '10' } })
    fireEvent.click(save)

    await vi.waitFor(() => expect(screen.getByText('Forbidden')).toBeTruthy())
  })
})
