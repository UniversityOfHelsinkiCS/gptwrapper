import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import i18next from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'

const searchedUser = { id: 'user-2', username: 'salosanna', firstNames: 'Sanna', lastName: 'Salo' }

// hook results must be stable references, CoursePreview copies them into state in effects
vi.mock('../../hooks/useCourse', () => {
  const course = { data: undefined, refetch: () => {} }
  const enrolments = { data: [] }
  const statistics = { stats: undefined, refetch: () => {} }
  const promptUsages = { data: [] }
  return {
    default: () => course,
    useCourseEnrolments: () => enrolments,
    useCourseStatistics: () => statistics,
    useCoursePromptUsages: () => promptUsages,
  }
})
vi.mock('../../hooks/useCurrentUser', () => ({ default: () => ({ user: { id: 'admin-1', isAdmin: true } }) }))
vi.mock('../../hooks/useUserUsage', () => ({ default: () => ({ usageInfo: undefined }) }))
vi.mock('../../hooks/useChatInstanceUsageMutation', () => ({ useResetChatInstanceUsageMutation: () => ({ mutateAsync: vi.fn() }) }))
vi.mock('../../util/apiClient', () => ({ default: { post: vi.fn() } }))
vi.mock('../common/Snackbar', () => ({ enqueueSnackbar: vi.fn() }))
vi.mock('./UsageSelector', () => ({ usagePercent: () => 0, gaugeColorKey: () => 'primary', formatTokens: String, UsageInfoButton: () => null }))
vi.mock('../Courses/Course/CourseActivityPeriodEditor', () => ({ CourseActivityPeriodEditor: () => null }))
vi.mock('../Courses/Course/Discussions', () => ({ default: () => null }))
vi.mock('../Courses/Course/PromptUsageHistogram', () => ({ default: () => null }))
// the search results are replaced by a single searched user rendered with the real action button
vi.mock('../Admin/UserSearch', () => ({
  ResponsibilityActionUserSearch: ({ drawActionComponent }: any) => <div data-testid="teacher-search">{drawActionComponent(searchedUser)}</div>,
  EnrolmentActionUserSearch: ({ drawActionComponent }: any) => <div data-testid="student-search">{drawActionComponent(searchedUser)}</div>,
}))

import en from '../../locales/en.json'
import apiClient from '../../util/apiClient'
import { enqueueSnackbar } from '../common/Snackbar'
import CoursePreview from './CoursePreview'

const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    resources: { en },
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
    interpolation: { escapeValue: false },
  })
})
afterEach(() => cleanup())

const course = {
  id: 'ci-1',
  courseId: 'cur-1',
  name: { en: 'Intro', fi: 'Intro', sv: 'Intro' },
  courseUnits: [{ code: 'TKT10003' }],
  activityPeriod: { startDate: '2026-09-01', endDate: '2026-12-31' },
  accessLevel: 'FULL',
  responsibilities: [],
} as any

const openTeacherSearchAndClickAdd = () => {
  render(
    <I18nextProvider i18n={i18n}>
      <CoursePreview course={course} />
    </I18nextProvider>,
  )
  fireEvent.click(screen.getByTestId('toggle-add-teacher-view'))
  fireEvent.click(screen.getByRole('button', { name: en.course.add }))
}

describe('CoursePreview adding a teacher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('asks for confirmation before adding', () => {
    openTeacherSearchAndClickAdd()

    expect(screen.getByRole('dialog').textContent).toContain('Add Sanna Salo as a teacher of the course?')
    expect(apiClient.post).not.toHaveBeenCalled()
  })

  test('does not add when the confirmation is cancelled', async () => {
    openTeacherSearchAndClickAdd()

    fireEvent.click(screen.getByRole('button', { name: en.common.cancel }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(apiClient.post).not.toHaveBeenCalled()
  })

  test('adds after confirmation, notifies and closes the search', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      status: 200,
      data: { id: 'resp-1', createdByUserId: 'admin-1', user: { id: 'user-2', username: 'salosanna', first_names: 'Sanna', last_name: 'Salo' } },
    })
    openTeacherSearchAndClickAdd()

    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'))

    await waitFor(() => expect(enqueueSnackbar).toHaveBeenCalledWith('Teacher added: Sanna Salo', { variant: 'success' }))
    expect(apiClient.post).toHaveBeenCalledWith('/courses/cur-1/responsibilities/assign', { username: 'salosanna' })
    expect(screen.queryByTestId('teacher-search')).toBeNull()
    expect(screen.getByText('Salo Sanna')).toBeTruthy()
  })

  test('disables the add button while the addition is in progress', async () => {
    vi.mocked(apiClient.post).mockReturnValue(new Promise(() => {}))
    openTeacherSearchAndClickAdd()

    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'))

    await waitFor(() => expect((screen.getByRole('button', { name: en.course.add }) as HTMLButtonElement).disabled).toBe(true))
    expect(apiClient.post).toHaveBeenCalledTimes(1)
  })
})
