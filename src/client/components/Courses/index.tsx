import React, { useState } from 'react'
import { addMonths } from 'date-fns'
import { Link as RouterLink } from 'react-router-dom'
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
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import { Course as CourseType } from '../../types'
import useUserCourses, { CoursesViewCourse } from '../../hooks/useUserCourses'
import { formatDate } from './util'
import { useEnableCourse } from './useEnableCourse'
import { DEFAULT_MODEL_ON_ENABLE, DEFAULT_TOKEN_LIMIT } from '../../../config'
import { useDisableCourse } from './useDisableCourse'

const Course = ({
  course,
  onEnable,
}: {
  course: CoursesViewCourse
  onEnable: (course: CoursesViewCourse) => void
}) => {
  const { t } = useTranslation()
  const disableMutation = useDisableCourse()

  if (!course) return null

  const { name, courseId, activityPeriod, isActive, isExpired } = course

  return (
    <Box mb="1rem">
      <Paper
        variant="outlined"
        sx={{ p: 2, display: 'flex', alignItems: 'stretch' }}
      >
        <Box mr="auto">
          <Typography variant="body1">{formatDate(activityPeriod)}</Typography>

          <Link to={`/courses/${courseId}`} component={RouterLink}>
            <Typography variant="h6">{name}</Typography>
          </Link>
          <Typography variant="body2">
            <code>{courseId}</code>
          </Typography>
        </Box>

        <Box display="flex" flexDirection="column" alignItems="end">
          {isActive && (
            <>
              <Typography>{t('course:curreEnabled')}</Typography>
              <Button
                variant="contained"
                sx={{ mt: 'auto' }}
                onClick={() => disableMutation.mutate({ id: course.id })}
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

const Courses = () => {
  const { t } = useTranslation()
  const { courses } = useUserCourses()

  const enableMutation = useEnableCourse()

  const [courseToEnable, setCourseToEnable] = useState<CourseType>(null)

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

  return (
    <Box>
      <Box display="flex" gap={2}>
        <Typography variant="h5" display="inline" mb={1}>
          {t('common:courses')}
        </Typography>
      </Box>
      <Box>
        {courses?.map((course) => (
          <Course
            key={course.id}
            course={course}
            onEnable={setCourseToEnable}
          />
        ))}
      </Box>

      <Dialog
        open={courseToEnable !== null}
        onClose={() => setCourseToEnable(null)}
      >
        <DialogTitle>
          {t('course:enableCurreModalTitle', { name: courseToEnable?.name })}
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
    </Box>
  )
}

export default Courses
