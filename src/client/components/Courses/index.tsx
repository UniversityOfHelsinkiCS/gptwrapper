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
  Pagination,
  Paper,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import { Course as CourseType } from '../../types'
import useUserCourses from '../../hooks/useUserCourses'
import { formatDate } from './util'
import { useEnableCourse } from './useEnableCourse'
import { DEFAULT_MODEL_ON_ENABLE, DEFAULT_TOKEN_LIMIT } from '../../../config'

const Course = ({
  course,
  onEnable,
}: {
  course: CourseType
  onEnable: (course: CourseType) => void
}) => {
  const { t } = useTranslation()
  if (!course) return null

  const { name, description, courseId, activityPeriod, usageLimit } = course

  const inUse = usageLimit > 0

  return (
    <Box>
      <Paper
        variant="outlined"
        sx={{ my: 1, p: 2, display: 'flex', alignItems: 'stretch' }}
      >
        <Box mr="auto">
          <Typography variant="body1">{formatDate(activityPeriod)}</Typography>
          {inUse ? (
            <Link to={`/courses/${courseId}`} component={RouterLink}>
              <Typography variant="h6">{name}</Typography>
            </Link>
          ) : (
            <Typography variant="h6">{name}</Typography>
          )}

          <Typography variant="body2">
            <code>{courseId}</code>
          </Typography>
          <Typography variant="body1">{description}</Typography>
        </Box>

        <Box display="flex" flexDirection="column" alignItems="end">
          {inUse ? (
            <Typography>{t('course:curreEnabled')}</Typography>
          ) : (
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

  const [page, setPage] = React.useState(1)
  const itemsPerPage = 20
  const { courses = [], count } = useUserCourses({
    limit: itemsPerPage,
    offset: (page - 1) * itemsPerPage,
  })

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
        <Pagination
          count={count ? Math.ceil(count / itemsPerPage) : undefined}
          onChange={(_ev, value) => setPage(value)}
          page={page}
        />
      </Box>
      {courses?.map((course) => (
        <Course key={course.id} course={course} onEnable={setCourseToEnable} />
      ))}

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
