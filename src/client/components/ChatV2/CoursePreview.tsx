import { useEffect, useMemo, useState } from 'react'
import {
  Avatar,
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { enqueueSnackbar } from 'notistack'
import SchoolIcon from '@mui/icons-material/School'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import CodeIcon from '@mui/icons-material/Code'
import ForumIcon from '@mui/icons-material/Forum'
import TagIcon from '@mui/icons-material/Tag'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import BarChartIcon from '@mui/icons-material/BarChart'
import PeopleIcon from '@mui/icons-material/People'
import GroupsIcon from '@mui/icons-material/Groups'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import GroupAddIcon from '@mui/icons-material/GroupAdd'
import SearchIcon from '@mui/icons-material/Search'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import CloseIcon from '@mui/icons-material/Close'
import type { Course, Enrolment, Responsibility, User } from '../../types'
import useCourse, { useCourseEnrolments, useCoursePromptUsages, useCourseStatistics } from '../../hooks/useCourse'
import useCurrentUser from '../../hooks/useCurrentUser'
import useUserUsages from '../../hooks/useUserUsage'
import { useResetChatInstanceUsageMutation } from '../../hooks/useChatInstanceUsageMutation'
import apiClient from '../../util/apiClient'
import { usagePercent, gaugeColorKey, formatTokens } from './UsageSelector'
import { formatDate } from './util'
import { OutlineButtonBlue, BlueButton } from './general/Buttons'
import { CourseActivityPeriodEditor } from '../Courses/Course/CourseActivityPeriodEditor'
import CourseEmbedding from '../Courses/Course/CourseEmbedding'
import DiscussionView from '../Courses/Course/Discussions'
import PromptUsageHistogram from '../Courses/Course/PromptUsageHistogram'
import { EnrolmentActionUserSearch, ResponsibilityActionUserSearch } from '../Admin/UserSearch'

const initialsOf = (lastName?: string, firstNames?: string) => {
  const a = firstNames?.trim()?.[0] ?? ''
  const b = lastName?.trim()?.[0] ?? ''
  return `${a}${b}`.toUpperCase()
}

type SortKey = 'last_name' | 'weekly' | 'total'
type SortConfig = { key: SortKey; direction: 'asc' | 'desc' }

const CoursePreview = ({ course }: { course: Course }) => {
  const { i18n, t } = useTranslation()
  const { language } = i18n
  const { data: chatInstance, refetch: refetchCourse } = useCourse(course.courseId)
  const { user } = useCurrentUser()

  const courseResponsibilities = chatInstance?.responsibilities ?? course.responsibilities ?? []
  const amongResponsibles = courseResponsibilities.some((r) => r.user.id === user?.id)
  const canManage = Boolean(user?.isAdmin || amongResponsibles)
  const isAdmin = Boolean(user?.isAdmin)
  const isCustomCourse = (course.courseUnits?.length ?? 0) === 0

  const { data: enrolmentsData } = useCourseEnrolments(course.courseId, canManage)
  const { stats, refetch: refetchStats } = useCourseStatistics(canManage ? course.courseId : undefined)
  const { data: promptUsages } = useCoursePromptUsages(canManage ? course.courseId : undefined)
  const { usageInfo } = useUserUsages()

  const resetUsageMutation = useResetChatInstanceUsageMutation()

  const [responsibilities, setResponsibilities] = useState<Responsibility[]>(courseResponsibilities)
  const [enrolments, setEnrolments] = useState<Enrolment[]>(enrolmentsData ?? [])
  const [addTeacherOpen, setAddTeacherOpen] = useState(false)
  const [showAllTeachers, setShowAllTeachers] = useState(false)
  const [addStudentOpen, setAddStudentOpen] = useState(false)
  const [embeddingModalOpen, setEmbeddingModalOpen] = useState(false)
  const [discussionsModalOpen, setDiscussionsModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'last_name', direction: 'asc' })

  useEffect(() => {
    if (chatInstance?.responsibilities) setResponsibilities(chatInstance.responsibilities)
  }, [chatInstance])

  useEffect(() => {
    if (enrolmentsData) setEnrolments(enrolmentsData)
  }, [enrolmentsData])

  const currentCourseUsage = usageInfo?.courses.find((c) => c.courseId === course.courseId)

  const usageByUser = useMemo(() => {
    const map: Record<string, { id: string; usageCount: number; totalUsageCount: number }> = {}
    for (const u of stats?.usages ?? []) map[u.dataValues.userId] = u.dataValues
    return map
  }, [stats])

  const students = useMemo(
    () =>
      enrolments.map((enrolment) => ({
        enrolment,
        user: enrolment.user,
        usageId: usageByUser[enrolment.user.id]?.id,
        weekly: Math.round(usageByUser[enrolment.user.id]?.usageCount ?? 0),
        total: usageByUser[enrolment.user.id]?.totalUsageCount ?? 0,
      })),
    [enrolments, usageByUser],
  )

  const activeThisWeek = students.filter((s) => s.weekly > 0).length

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = q
      ? students.filter(
          (s) => `${s.user.first_names ?? ''} ${s.user.last_name ?? ''}`.toLowerCase().includes(q) || (s.user.student_number ?? '').toLowerCase().includes(q),
        )
      : students
    const dir = sortConfig.direction === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      if (sortConfig.key === 'last_name') return (a.user.last_name ?? '').localeCompare(b.user.last_name ?? '', 'fi', { sensitivity: 'base' }) * dir
      const av = sortConfig.key === 'weekly' ? a.weekly : a.total
      const bv = sortConfig.key === 'weekly' ? b.weekly : b.total
      return (av - bv) * dir
    })
  }, [students, search, sortConfig])

  if (!user) return null

  const requestSort = (key: SortKey) => {
    setSortConfig((prev) => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }))
  }

  const handleAddResponsible = async (target: User) => {
    const result = await apiClient.post(`/courses/${course.courseId}/responsibilities/assign`, { username: target.username })
    if (result.status === 200) {
      setResponsibilities((prev) => [...prev, result.data])
      refetchCourse()
    }
  }

  const handleRemoveResponsibility = async (responsibility: Responsibility) => {
    if (!window.confirm(t('course:confirmRemoval'))) return
    const result = await apiClient.post(`/courses/${course.courseId}/responsibilities/remove`, { username: responsibility.user?.username })
    if (result.status === 200) {
      setResponsibilities((prev) => prev.filter((r) => r.id !== responsibility.id))
      refetchCourse()
    }
  }

  const handleAddEnrolment = async (target: User) => {
    const result = await apiClient.post(`/courses/${course.courseId}/enrolments/assign`, { username: target.username })
    if (result.status === 200) setEnrolments((prev) => [...prev, result.data])
  }

  const handleRemoveEnrolment = async (enrolment: Enrolment) => {
    if (!window.confirm(t('course:confirmRemoval'))) return
    const result = await apiClient.post(`/courses/${course.courseId}/enrolments/remove`, { username: enrolment.user.username })
    if (result.status === 200) setEnrolments((prev) => prev.filter((e) => e.id !== enrolment.id))
  }

  const handleResetUsage = async (usageId: string) => {
    try {
      await resetUsageMutation.mutateAsync(usageId)
      await refetchStats()
      enqueueSnackbar(t('course:courseUpdated'), { variant: 'success' })
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' })
    }
  }

  const drawTeacherAction = (target: User) => {
    const existing = responsibilities.find((r) => r.user.id === target.id)
    return existing ? (
      <OutlineButtonBlue onClick={() => handleRemoveResponsibility(existing)}>{t('course:remove')}</OutlineButtonBlue>
    ) : (
      <BlueButton onClick={() => handleAddResponsible(target)}>{t('course:add')}</BlueButton>
    )
  }

  const drawStudentAction = (target: User) => {
    const existing = enrolments.find((e) => e.user.id === target.id)
    return existing ? (
      <OutlineButtonBlue data-testid={`remove-student-${target.username}`} onClick={() => handleRemoveEnrolment(existing)}>
        {t('course:remove')}
      </OutlineButtonBlue>
    ) : (
      <BlueButton data-testid={`add-student-${target.username}`} onClick={() => handleAddEnrolment(target)}>
        {t('course:add')}
      </BlueButton>
    )
  }

  const activeCourse: Course = chatInstance ? { ...chatInstance, activated: chatInstance.usageLimit > 0 } : course
  const activated = activeCourse.activated

  return (
    <>
      <Paper variant="outlined" sx={{ p: 3, borderRadius: '12px', overflow: 'auto', maxHeight: '100%', mb: 2 }}>
        {/* Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mt: 1 }}>
          <SchoolIcon color="primary" fontSize="large" />
          <Typography
            variant="h4"
            fontWeight="bold"
            data-testid={`course-preview-title-for-${course.name[language]}`}
            sx={{ wordBreak: 'break-word', hyphens: 'auto' }}
          >
            {course.name[language]}
          </Typography>
          {canManage && (
            <Chip
              size="small"
              label={activated ? t('course:statusActive') : t('course:statusClosed')}
              color={activated ? 'success' : 'error'}
              variant="filled"
              sx={{ fontWeight: 600 }}
            />
          )}
          {course.courseUnitRealisationTypeUrn && (
            <Tooltip title={t('course:goToCoursePage')}>
              <IconButton
                aria-label={t('course:goToCoursePage')}
                onClick={() => window.open(`https://studies.helsinki.fi/kurssit/toteutus/${course.courseId}`, '_blank')}
                data-testid="go-to-course-page-link"
              >
                <OpenInNewIcon color="primary" />
              </IconButton>
            </Tooltip>
          )}
          {canManage && (
            <Tooltip title={t('course:moodleEmbedding')}>
              <IconButton aria-label={t('course:moodleEmbedding')} onClick={() => setEmbeddingModalOpen(true)} data-testid="open-course-embedding-button">
                <CodeIcon color="primary" />
              </IconButton>
            </Tooltip>
          )}
          {canManage && course.saveDiscussions && (
            <Tooltip title={t('course:discussions')}>
              <IconButton aria-label={t('course:discussions')} onClick={() => setDiscussionsModalOpen(true)} data-testid="open-course-discussions-button">
                <ForumIcon color="primary" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Subtitle: code + open dates */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap', color: 'text.secondary', mt: 1, mb: 3 }}>
          {course.courseUnits?.[0]?.code && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <TagIcon fontSize="small" />
              <Typography variant="body2">{course.courseUnits[0].code}</Typography>
            </Box>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <EventAvailableIcon fontSize="small" />
            <Typography variant="body2">{formatDate(course.activityPeriod)}</Typography>
          </Box>
        </Box>

        {/* Activity period editor (managers) */}
        {canManage && (
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px', mb: 3 }}>
            <CourseActivityPeriodEditor course={activeCourse} />
          </Box>
        )}

        {/* Personal usage card */}
        {currentCourseUsage &&
          (() => {
            const percent = usagePercent(currentCourseUsage.usage, currentCourseUsage.limit)
            return (
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px', p: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BarChartIcon color="primary" />
                    <Typography variant="subtitle1" fontWeight="bold">
                      {t('status:usageTitle')}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {formatTokens(currentCourseUsage.usage)} / {formatTokens(currentCourseUsage.limit)} {t('status:tokens')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <LinearProgress variant="determinate" color={gaugeColorKey(percent)} value={percent} sx={{ height: 12, borderRadius: 6, flex: 1 }} />
                  <Typography variant="body2" fontWeight={600} sx={{ minWidth: 45, textAlign: 'right' }}>
                    {percent} %
                  </Typography>
                </Box>
              </Box>
            )
          })()}

        {/* Stats (managers) */}
        {canManage && stats && (
          <Box sx={{ mb: 3 }} data-testid="students-stats-container">
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 1.5, mb: 3 }}>
              <StatTile value={enrolments.length} label={t('course:enrolledStudents')} />
              <StatTile value={stats.usagePercentage ? `${Math.round(stats.usagePercentage * 100 * 10) / 10} %` : '0 %'} label={t('course:haveUsedCurre')} />
              <StatTile value={Math.round(stats.average || 0)} label={t('course:avgTokensPerStudent')} />
              <StatTile value={activeThisWeek} label={t('course:activeThisWeek')} accent="secondary" />
            </Box>
            <PromptUsageHistogram promptUsages={promptUsages ?? []} activityPeriod={course.activityPeriod} />
          </Box>
        )}

        {/* Teachers */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <PeopleIcon sx={{ color: 'text.secondary' }} />
            <Typography variant="subtitle1" fontWeight="bold">
              {t('course:teachers')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ({responsibilities.length})
            </Typography>
            {isAdmin && (
              <OutlineButtonBlue
                sx={{ ml: 'auto' }}
                startIcon={<PersonAddIcon />}
                onClick={() => setAddTeacherOpen((open) => !open)}
                data-testid="toggle-add-teacher-view"
              >
                {addTeacherOpen ? t('common:cancel') : t('course:addTeacher')}
              </OutlineButtonBlue>
            )}
          </Box>
          {addTeacherOpen ? (
            <ResponsibilityActionUserSearch courseId={course.courseId as string} actionText={t('course:add')} drawActionComponent={drawTeacherAction} />
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              {responsibilities
                .slice()
                .sort((a, b) => (a.user.last_name ?? '').localeCompare(b.user.last_name ?? '', 'fi', { sensitivity: 'base' }))
                .slice(0, showAllTeachers ? undefined : 5)
                .map((responsibility) => (
                  <Chip
                    key={responsibility.id}
                    sx={{ '& .MuiChip-avatar': { bgcolor: 'primary.main', color: 'primary.contrastText' } }}
                    avatar={<Avatar>{initialsOf(responsibility.user.last_name, responsibility.user.first_names)}</Avatar>}
                    label={`${responsibility.user.last_name ?? ''} ${responsibility.user.first_names?.split(' ')[0] ?? ''}`.trim()}
                    onDelete={isAdmin && responsibility.createdByUserId ? () => handleRemoveResponsibility(responsibility) : undefined}
                    deleteIcon={<CloseIcon />}
                    variant="outlined"
                  />
                ))}
              {responsibilities.length > 5 && (
                <Chip
                  variant="outlined"
                  color="primary"
                  onClick={() => setShowAllTeachers((open) => !open)}
                  label={showAllTeachers ? t('course:showLess') : t('course:showMore', { count: responsibilities.length - 5 })}
                  data-testid="toggle-show-all-teachers"
                />
              )}
            </Box>
          )}
        </Box>

        {/* Students (managers) */}
        {canManage && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
              <GroupsIcon sx={{ color: 'text.secondary' }} />
              <Typography variant="subtitle1" fontWeight="bold">
                {t('course:students')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ({students.length})
              </Typography>
              <Box sx={{ flex: 1 }} />
              <TextField
                size="small"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('course:searchStudents')}
                slotProps={{ input: { startAdornment: <SearchIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} /> } }}
                sx={{ minWidth: 220 }}
              />
              {isAdmin && isCustomCourse && (
                <BlueButton startIcon={<GroupAddIcon />} onClick={() => setAddStudentOpen((open) => !open)} data-testid="toggle-add-student-view">
                  {addStudentOpen ? t('common:cancel') : t('course:addNewStudent')}
                </BlueButton>
              )}
            </Box>

            {addStudentOpen && isAdmin && isCustomCourse ? (
              <EnrolmentActionUserSearch courseId={course.courseId as string} actionText={t('course:add')} drawActionComponent={drawStudentAction} />
            ) : (
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px', overflow: 'auto' }}>
                <Table size="small" data-testid="students-table">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'background.subtle' }}>
                      <TableCell>#</TableCell>
                      <TableCell>{t('admin:studentNumber')}</TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={sortConfig.key === 'last_name'}
                          direction={sortConfig.direction}
                          onClick={() => requestSort('last_name')}
                          data-testid="sort-by-last-name"
                        >
                          {t('admin:name')}
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right">
                        <TableSortLabel
                          active={sortConfig.key === 'weekly'}
                          direction={sortConfig.direction}
                          onClick={() => requestSort('weekly')}
                          data-testid="sort-by-usage"
                        >
                          {t('course:weeklyUsage')}
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right">
                        <TableSortLabel
                          active={sortConfig.key === 'total'}
                          direction={sortConfig.direction}
                          onClick={() => requestSort('total')}
                          data-testid="sort-by-total-usage"
                        >
                          {t('admin:totalUsage')}
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right" sx={{ width: 48 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody data-testid="students-table-body">
                    {filteredStudents.map((s, idx) => (
                      <TableRow key={s.enrolment.id} data-testid={`student-row-${s.user.id}`}>
                        <TableCell sx={{ color: 'text.secondary' }}>{idx + 1}</TableCell>
                        <TableCell data-testid="student-number">{s.user.student_number}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 26, height: 26, fontSize: 12, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                              {initialsOf(s.user.last_name, s.user.first_names)}
                            </Avatar>
                            {`${s.user.last_name ?? ''} ${s.user.first_names ?? ''}`.trim()}
                          </Box>
                        </TableCell>
                        <TableCell align="right" data-testid="student-usage">
                          {s.weekly}
                        </TableCell>
                        <TableCell align="right" data-testid="student-total-usage">
                          {s.total}
                        </TableCell>
                        <TableCell align="right">
                          {isAdmin && s.usageId && s.weekly > 0 && (
                            <Tooltip title={t('course:resetWeeklyUsage')}>
                              <IconButton size="small" onClick={() => handleResetUsage(s.usageId as string)} data-testid={`reset-usage-${s.user.id}`}>
                                <RestartAltIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredStudents.length === 0 && (
                  <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                    <Typography variant="body2">{t('course:noStudentsMatch')}</Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}
      </Paper>
      <Dialog open={embeddingModalOpen} onClose={() => setEmbeddingModalOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {t('course:moodleEmbedding')}
          <IconButton onClick={() => setEmbeddingModalOpen(false)} aria-label={t('common:close')}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <CourseEmbedding courseId={course.courseId} coursePrompts={course.prompts} />
        </DialogContent>
      </Dialog>
      <Dialog open={discussionsModalOpen} onClose={() => setDiscussionsModalOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {t('course:discussions')}
          <IconButton onClick={() => setDiscussionsModalOpen(false)} aria-label={t('common:close')}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <DiscussionView courseId={course.courseId} />
        </DialogContent>
      </Dialog>
    </>
  )
}

const StatTile = ({ value, label, accent = 'primary' }: { value: string | number; label: string; accent?: 'primary' | 'secondary' }) => (
  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px', p: 2 }}>
    <Typography variant="h5" fontWeight="bold" color={`${accent}.main`} lineHeight={1.1}>
      {value}
    </Typography>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
  </Box>
)

export default CoursePreview
