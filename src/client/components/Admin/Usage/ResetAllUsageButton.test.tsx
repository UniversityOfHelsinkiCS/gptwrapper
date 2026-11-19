import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import i18next from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'

const mutate = vi.fn()
const mutation = { mutate, isPending: false }

vi.mock('../../../hooks/useResetUsageMutation', () => ({
  useResetAllUsageMutation: () => mutation,
}))
vi.mock('../../common/Snackbar', () => ({ enqueueSnackbar: vi.fn() }))

import en from '../../../locales/en.json'
import { enqueueSnackbar } from '../../common/Snackbar'
import ResetAllUsageButton from './ResetAllUsageButton'

const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    resources: { en },
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
  })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const renderButton = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <ResetAllUsageButton />
    </I18nextProvider>,
  )

describe('ResetAllUsageButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('does nothing when the confirmation is declined', () => {
    const confirm = vi.fn(() => false)
    vi.stubGlobal('confirm', confirm)
    renderButton()

    fireEvent.click(screen.getByRole('button', { name: en.admin.resetAllUsage }))

    expect(confirm).toHaveBeenCalledWith(en.admin.resetAllUsageConfirm)
    expect(mutate).not.toHaveBeenCalled()
  })

  test('resets all usage when confirmed and shows the result', () => {
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    )
    mutate.mockImplementation((_vars, { onSuccess }) => onSuccess({ users: 7, courseUsages: 3 }))
    renderButton()

    fireEvent.click(screen.getByRole('button', { name: en.admin.resetAllUsage }))

    expect(mutate).toHaveBeenCalledTimes(1)
    expect(enqueueSnackbar).toHaveBeenCalledWith('Weekly usage reset (users with usage: 7)', { variant: 'success' })
  })

  test('shows the error when the reset fails', () => {
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    )
    mutate.mockImplementation((_vars, { onError }) => onError(new Error('boom')))
    renderButton()

    fireEvent.click(screen.getByRole('button', { name: en.admin.resetAllUsage }))

    expect(enqueueSnackbar).toHaveBeenCalledWith('boom', { variant: 'error' })
  })
})
