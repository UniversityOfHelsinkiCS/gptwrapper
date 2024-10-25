import { useState } from 'react'
import { addMonths } from 'date-fns'

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Link,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import { enqueueSnackbar } from 'notistack'
import { CoursesViewCourse } from '../../hooks/useUserCourses'
import { useDisableCourse } from './useDisableCourse'
import { useEnableCourse } from './useEnableCourse'
import { formatDate, getCurTypeLabel } from './util'
import { Course as CourseType } from '../../types'
import {
  DEFAULT_MODEL_ON_ENABLE,
  DEFAULT_TOKEN_LIMIT,
  PUBLIC_URL,
} from '../../../config'

const Course = ({
  course,
  onEnable,
  onDisable,
}: {
  course: CoursesViewCourse
  onEnable: (course: CoursesViewCourse) => void
  onDisable: (course: CoursesViewCourse) => void
}) => {
  const { t, i18n } = useTranslation()

  if (!course) return null

  const {
    name,
    courseId,
    activityPeriod,
    isActive,
    isExpired,
    courseUnitRealisationTypeUrn,
    courseUnits,
  } = course

  const { language } = i18n

  const studentLink = `${window.location.origin}${PUBLIC_URL}/${courseId}`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(studentLink)
    enqueueSnackbar(t('linkCopied'), { variant: 'info' })
  }

  const code = courseUnits[0]?.code

  return (
    <Box mb="1rem">
      <Paper
        variant="outlined"
        sx={{ p: 2, display: 'flex', alignItems: 'stretch' }}
      >
        <Box mr="auto">
          <Typography variant="body1">{formatDate(activityPeriod)}</Typography>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Link to={`/courses/${courseId}`} component={RouterLink}>
              <Typography variant="h6">{name[language]}</Typography>
            </Link>
            <Typography style={{ marginLeft: 5 }}>{code}</Typography>
            <Typography style={{ fontStyle: 'italic', marginLeft: 20 }}>
              {getCurTypeLabel(courseUnitRealisationTypeUrn, language)}
            </Typography>
          </div>

          {isActive && (
            <Tooltip title={t('copy')} placement="right">
              <Button sx={{ p: 0 }} color="inherit">
                <Typography
                  style={{ textTransform: 'lowercase' }}
                  onClick={() => handleCopyLink()}
                >
                  {studentLink}
                </Typography>
              </Button>
            </Tooltip>
          )}
        </Box>

        <Box display="flex" flexDirection="column" alignItems="end">
          {isActive && (
            <>
              <Typography>{t('course:curreEnabled')}</Typography>
              <Button
                variant="contained"
                color="error"
                sx={{ mt: 'auto' }}
                onClick={() => onDisable(course)}
              >
                {t('course:disableCurre')}
              </Button>
            </>
          )}
          {isExpired && <Typography>{t('course:curreExpired')}</Typography>}
          {!isActive && !isExpired && (
            <>
              <Typography>{t('course:curreNotEnabled')}</Typography>
              <Button
                variant="contained"
                sx={{ mt: 'auto' }}
                onClick={() => onEnable(course)}
              >
                {t('course:enableCurre')}
              </Button>
            </>
          )}
        </Box>
      </Paper>
    </Box>
  )
}

const CourseList = ({ courseUnits }: { courseUnits: CoursesViewCourse[] }) => {
  const { t, i18n } = useTranslation()
  const enableMutation = useEnableCourse()
  const disableMutation = useDisableCourse()
  const [courseToEnable, setCourseToEnable] = useState<CourseType>(null)
  const [courseToDisable, setCourseToDisable] = useState<CourseType>(null)

  if (!courseUnits) return null

  const defaultActivityPeriod = courseToEnable
    ? {
        startDate: courseToEnable.activityPeriod.startDate,
        endDate: addMonths(
          courseToEnable.activityPeriod.endDate,
          1
        ).toDateString(),
      }
    : null

  const activityPeriodString = courseToEnable
    ? formatDate(defaultActivityPeriod)
    : null

  const { language } = i18n

  return (
    <>
      <Box>
        {courseUnits.length === 0 && (
          <Box p={2}>
            <Typography color="textSecondary" align="center">
              {t('course:noCourses')}
            </Typography>
          </Box>
        )}
        {courseUnits.map((course) => (
          <Course
            key={course.id}
            course={course}
            onEnable={setCourseToEnable}
            onDisable={setCourseToDisable}
          />
        ))}
      </Box>
      <Dialog
        open={courseToEnable !== null}
        onClose={() => setCourseToEnable(null)}
      >
        <DialogTitle>
          {t('course:enableCurreModalTitle', {
            name: courseToEnable?.name[language],
          })}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('course:enableCurreModalText', {
              defaultModel: DEFAULT_MODEL_ON_ENABLE,
              defaultTokenLimit: DEFAULT_TOKEN_LIMIT,
              activityPeriod: activityPeriodString,
            })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCourseToEnable(null)}>{t('cancel')}</Button>
          <Button
            onClick={() => {
              enableMutation.mutate({ id: courseToEnable.id })
              setCourseToEnable(null)
            }}
            autoFocus
            variant="contained"
          >
            {t('enable')}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={courseToDisable !== null}
        onClose={() => setCourseToDisable(null)}
      >
        <DialogTitle>
          {t('course:disableCurreModalTitle', {
            name: courseToDisable?.name[language],
          })}
        </DialogTitle>
        <DialogActions>
          <Button onClick={() => setCourseToDisable(null)}>
            {t('cancel')}
          </Button>
          <Button
            onClick={() => {
              disableMutation.mutate({ id: courseToDisable.id })
              setCourseToDisable(null)
            }}
            variant="contained"
          >
            Ok
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default CourseList
