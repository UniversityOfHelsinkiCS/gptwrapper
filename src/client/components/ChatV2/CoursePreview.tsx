import useUserUsages from '../../hooks/useUserUsage'
import { Box, Typography, Paper, IconButton, LinearProgress, Tooltip } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { Course } from '../../types'
import DateRangeIcon from '@mui/icons-material/DateRange'
import PeopleIcon from '@mui/icons-material/People'
import GroupsIcon from '@mui/icons-material/Groups'
import useCourse from '../../hooks/useCourse'
import { useState } from 'react'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import BarChartIcon from '@mui/icons-material/BarChart'
import { usagePercent, gaugeColorKey, formatTokens } from './UsageSelector'
import SchoolIcon from '@mui/icons-material/School'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import useCurrentUser from '../../hooks/useCurrentUser'
import ToggleOnIcon from '@mui/icons-material/ToggleOn'
import ToggleOffIcon from '@mui/icons-material/ToggleOff'
import TagIcon from '@mui/icons-material/Tag'
import { useCourseEnrolments } from '../../hooks/useCourse'
import { CourseActivityPeriodEditor } from '../Courses/Course/CourseActivityPeriodEditor'

const CoursePreview = ({ course }: { course: Course }) => {
  const { i18n, t } = useTranslation()
  const { language } = i18n
  const { data: chatInstance } = useCourse(course.courseId)
  const { user } = useCurrentUser()

  const courseResponsibilities = chatInstance?.responsibilities || []
  const amongResponsibles = courseResponsibilities.some((r) => r.user.id === user?.id)
  const { data: enrolments } = useCourseEnrolments(course.courseId, Boolean(user?.isAdmin || amongResponsibles))

  const teacherNames = courseResponsibilities.filter((responsibility) => responsibility.user.first_names && responsibility.user.last_name)

  const studentNames = enrolments?.filter((enrolment) => enrolment.user.first_names && enrolment.user.last_name)
  const toggleTeachers = teacherNames.length > 5
  const [showTeachers, setShowTeachers] = useState(false)
  const [showStudents, setShowStudents] = useState(false)

  const { usageInfo } = useUserUsages()

  const currentCourseUsage = usageInfo?.courses.find((c) => c.courseId === course.courseId)

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: '12px', overflow: 'auto', maxHeight: '100%', mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, mt: 2 }}>
        <Box sx={{ flexDirection: 'row', display: 'flex', gap: 1, maxWidth: '100%' }}>
          <SchoolIcon color="primary" fontSize="large" />
          <Typography
            variant="h4"
            fontWeight="bold"
            data-testid={`course-preview-title-for-${course.name[language]}`}
            sx={{ wordBreak: 'break-word', hyphens: 'auto' }}
          >
            {course.name[language]}
          </Typography>
          {course.courseUnitRealisationTypeUrn && (
            <Tooltip title={t('course:goToCoursePage')}>
              <IconButton
                aria-label={t('course:goToCoursePage')}
                onClick={() => {
                  window.open(`https://studies.helsinki.fi/kurssit/toteutus/${course.courseId}`, '_blank')
                }}
                data-testid="go-to-course-page-link"
                sx={{ alignSelf: 'center' }}
              >
                <OpenInNewIcon color="primary" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
      <Box sx={{ mt: 3, display: 'flex', gap: 3, flexDirection: 'column', alignItems: 'flex-start' }}>
        <CourseActivityPeriodEditor course={course} />
        {course.courseUnitRealisationTypeUrn && (
          <Box
            sx={{
              width: '70%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 3,
              flexWrap: 'wrap',
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: '220px' }}>
              <Box gap={1} sx={{ display: 'flex', alignItems: 'center' }}>
                <TagIcon color="primary" />
                <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                  {t('course:code')}:{' '}
                  <Box component="span" sx={{ color: 'text.secondary', variant: 'body2', fontWeight: 'normal' }}>
                    {course.courseUnits[0]?.code ?? '--'}
                  </Box>
                </Typography>
              </Box>
            </Box>

            {amongResponsibles && (
              <Box
                gap={1}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '250px',
                }}
              >
                {course.activated ? (
                  <ToggleOnIcon fontSize="large" sx={{ color: 'success.main' }} />
                ) : (
                  <ToggleOffIcon fontSize="large" sx={{ color: 'error.main' }} />
                )}
                <Typography variant="body2" sx={{ textAlign: 'right' }}>
                  {course.activated ? t('course:activatedForStudents') : t('course:closedForStudents')}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        <Box
          sx={{
            width: '70%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 3,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: '220px' }}>
            <Box gap={1} sx={{ display: 'flex', alignItems: 'center' }}>
              <DateRangeIcon color="primary" />
              <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                {t('course:courseActivePeriod')}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', ml: 4 }}>
              <Typography variant="body2" color="text.primary">
                {course.activityPeriod.startDate} - {course.activityPeriod.endDate}
              </Typography>
            </Box>
          </Box>

          {currentCourseUsage &&
            (() => {
              const percent = usagePercent(currentCourseUsage.usage, currentCourseUsage.limit)
              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', width: '250px' }}>
                  <Box gap={1} sx={{ display: 'flex', alignItems: 'center' }}>
                    <BarChartIcon color="primary" />
                    <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                      {t('status:usageTitle')}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', mt: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      color={gaugeColorKey(percent)}
                      value={percent}
                      sx={{
                        height: 20,
                        borderRadius: 0,
                        flex: 1,
                      }}
                    />
                    <Typography variant="body2" fontWeight={600} sx={{ minWidth: '45px' }}>
                      {percent} %
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.3 }}>
                    {formatTokens(currentCourseUsage.usage)} / {formatTokens(currentCourseUsage.limit)} {t('status:tokens')}
                  </Typography>
                </Box>
              )
            })()}
        </Box>
        <Box
          sx={{
            width: '70%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 3,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: '220px' }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <PeopleIcon color="primary" />
              <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                {t('course:teachers')}
              </Typography>
              <IconButton
                aria-label={t('settings:saveMyPrompt')}
                onClick={() => setShowTeachers((open) => !open)}
                data-testid={`show-course-info-${course.id}-button`}
                sx={{ color: 'primary.main', borderRadius: 1 }}
              >
                {toggleTeachers && (showTeachers ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />)}
              </IconButton>
            </Box>
            {teacherNames.length > 0 && (!toggleTeachers || showTeachers) && (
              <Box sx={{ display: 'flex', flexDirection: 'column', ml: 4, mt: 1, gap: 0.75 }}>
                {teacherNames
                  .sort((a, b) => a.user.last_name.localeCompare(b.user.last_name, 'fi', { sensitivity: 'base' }))
                  .map((responsibility) => (
                    <Typography key={responsibility.user.id} variant="body2" color="text.primary">
                      {`${responsibility.user.last_name} ${responsibility.user.first_names.split(' ')[0]} `}
                    </Typography>
                  ))}
              </Box>
            )}
          </Box>

          {(amongResponsibles || user?.isAdmin) && studentNames && studentNames.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', width: '250px' }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <GroupsIcon color="primary" />
                <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                  {t('course:students')}
                </Typography>
                <IconButton
                  aria-label={t('settings:saveMyPrompt')}
                  onClick={() => setShowStudents((open) => !open)}
                  data-testid={`show-course-info-${course.id}-button`}
                  sx={{ color: 'primary.main', borderRadius: 1 }}
                >
                  {studentNames.length > 5 && (showStudents ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />)}
                </IconButton>
              </Box>
              {studentNames.length > 0 && (studentNames.length <= 5 || showStudents) && (
                <Box sx={{ display: 'flex', flexDirection: 'column', ml: 4, mt: 1, gap: 0.75 }}>
                  {studentNames
                    .sort((a, b) => a.user.last_name.localeCompare(b.user.last_name, 'fi', { sensitivity: 'base' }))
                    .map((enrolment) => (
                      <Typography key={enrolment.user.id} variant="body2" color="text.primary">
                        {`${enrolment.user.last_name} ${enrolment.user.first_names}`}
                      </Typography>
                    ))}
                </Box>
              )}
            </Box>
          ) : null}
        </Box>
      </Box>
    </Paper>
  )
}
export default CoursePreview
