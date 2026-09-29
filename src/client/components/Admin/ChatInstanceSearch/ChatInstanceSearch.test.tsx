import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import i18next from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'

const mutate = vi.fn()

vi.mock('./useChatInstanceSearch', () => ({
  default: vi.fn(),
  CHAT_INSTANCE_SEARCH_DEFAULT_LIMIT: 25,
  CHAT_INSTANCE_SEARCH_MIN_LENGTH: 3,
}))
vi.mock('../../../hooks/useCourse', () => ({ default: () => ({ data: undefined }) }))
vi.mock('../../../hooks/useCourseMutation', () => ({
  useSaveDiscussionsMutation: () => ({ mutate, isPending: false, variables: undefined }),
}))
vi.mock('../../ChatV2/CoursePreview', () => ({ default: () => null }))

import en from '../../../locales/en.json'
import ChatInstanceSearch from './index'
import useChatInstanceSearch from './useChatInstanceSearch'

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

const results = [
  { id: 'cur-1', name: { en: 'Intro', fi: 'Intro', sv: 'Intro' }, codes: ['TKT10003'], terms: [], saveDiscussions: false },
  { id: 'cur-2', name: { en: 'Advanced', fi: 'Advanced', sv: 'Advanced' }, codes: ['TKT20001'], terms: [], saveDiscussions: true },
]

const renderWithResults = async () => {
  render(
    <I18nextProvider i18n={i18n}>
      <ChatInstanceSearch />
    </I18nextProvider>,
  )
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'intro' } })
  return screen.findByRole('switch', { name: `${en.course.isReseachCourse}: Intro` })
}

describe('ChatInstanceSearch research course toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useChatInstanceSearch).mockReturnValue({ results, count: results.length, isFetching: false } as any)
  })

  test('shows each course research state with an accessible name', async () => {
    const introSwitch = await renderWithResults()

    expect((introSwitch as HTMLInputElement).checked).toBe(false)
    expect((screen.getByRole('switch', { name: `${en.course.isReseachCourse}: Advanced` }) as HTMLInputElement).checked).toBe(true)
  })

  test('saves the new state after confirmation', async () => {
    const confirm = vi.fn(() => true)
    vi.stubGlobal('confirm', confirm)
    const introSwitch = await renderWithResults()

    fireEvent.click(introSwitch)

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Intro'))
    expect(mutate).toHaveBeenCalledWith({ chatId: 'cur-1', saveDiscussions: true })
  })

  test('does not save when the confirmation is cancelled', async () => {
    const confirm = vi.fn(() => false)
    vi.stubGlobal('confirm', confirm)
    const introSwitch = await renderWithResults()

    fireEvent.click(introSwitch)

    expect(mutate).not.toHaveBeenCalled()
  })

  test('toggling does not open the course preview', async () => {
    const confirm = vi.fn(() => false)
    vi.stubGlobal('confirm', confirm)
    const introSwitch = await renderWithResults()

    fireEvent.click(introSwitch)

    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
