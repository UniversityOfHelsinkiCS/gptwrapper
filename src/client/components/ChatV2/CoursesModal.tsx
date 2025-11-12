import React from 'react'
import { Box, Tab, Tabs } from '@mui/material'
import { useTranslation } from 'react-i18next'
import useUserCourses, { CoursesViewCourse } from '../../hooks/useUserCourses'
import useCurrentUser from '../../hooks/useCurrentUser'
import { useMemo, useState } from 'react'
import TableSortLabel from '@mui/material/TableSortLabel'
import { useNavigate } from 'react-router-dom'
import { formatDate, getGroupedCourses } from './util'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import { BlueButton, GrayButton, GreenButton, TextButton } from './general/Buttons'
import Skeleton from '@mui/material/Skeleton'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

const CustomTabPanel = (props: TabPanelProps) => {
  const { children, value, index } = props

  return (
    <Box role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 1 }} >{children}</Box>}
    </Box>
  )
}

const CoursesModal = () => {
  const { t } = useTranslation()
  const { courses, isLoading } = useUserCourses()
  const { user } = useCurrentUser()

  const isTeacherOrAdmin = (courses?.length ?? 0) > 0 || user?.isAdmin

  const [value, setValue] = React.useState(0)

  if (!courses || isLoading) return <CoursesSkeleton />

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue)
  }

  const { curreEnabled, curreDisabled, ended, } = getGroupedCourses(courses)


  if (isTeacherOrAdmin) {
    return (
      <Box>
        <Tabs value={value} onChange={handleChange}>
          <Tab label={t('course:activeTab')} />
          <Tab label={t('course:notActiveTab')} />
          <Tab label={t('course:endedTab')} />
        </Tabs>
        <CustomTabPanel value={value} index={0}>
          <CourseList courseUnits={curreEnabled} type="enabled" />
        </CustomTabPanel>
        <CustomTabPanel value={value} index={1}>
          <CourseList courseUnits={curreDisabled} type="disabled" />
        </CustomTabPanel>
        <CustomTabPanel value={value} index={2}>
          <CourseList courseUnits={ended} type="ended" />
        </CustomTabPanel>
      </Box>
    )
  }

  return (
    <Box>
      <CourseList courseUnits={curreEnabled} type="enabled" />
    </Box>
  )
}

type Order = 'asc' | 'desc'
type OrderBy = 'name' | 'code' | 'activityPeriod'

const CourseList = ({ courseUnits, type }: { courseUnits: CoursesViewCourse[], type: "enabled" | "disabled" | "ended" }) => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { language } = i18n

  const [order, setOrder] = useState<Order>('asc')
  const [orderBy, setOrderBy] = useState<OrderBy>('name')

  const handleRequestSort = (property: OrderBy) => {
    const isAsc = orderBy === property && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(property)
  }

  const handleChatLink = (courseId: string) => {
    navigate(`/${courseId}`)
  }

  const handleCourseSettings = (courseId: string) => {
    navigate(`/${courseId}/course`)
  }

  const sorted = useMemo(() => {
    const compare = (a: CoursesViewCourse, b: CoursesViewCourse) => {
      let av: string | number = ''
      let bv: string | number = ''
      if (orderBy === 'name') {
        av = a.name[language] || ''
        bv = b.name[language] || ''
      } else if (orderBy === 'code') {
        av = a.courseId || ''
        bv = b.courseId || ''
      } else {
        av = new Date(a.activityPeriod.startDate).getTime()
        bv = new Date(b.activityPeriod.startDate).getTime()
      }
      if (av < bv) return order === 'asc' ? -1 : 1
      if (av > bv) return order === 'asc' ? 1 : -1
      return 0
    }
    return [...courseUnits].sort(compare)
  }, [courseUnits, order, orderBy, language])

  return (
    <Box sx={{ py: 3, overflow: 'auto' }}>
      <TableContainer sx={{ borderRadius: 1, minWidth: 800 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.03)' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>
                <TableSortLabel
                  active={orderBy === 'name'}
                  direction={orderBy === 'name' ? order : 'asc'}
                  onClick={() => handleRequestSort('name')}
                >
                  {t('course:name')}
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                <TableSortLabel
                  active={orderBy === 'code'}
                  direction={orderBy === 'code' ? order : 'asc'}
                  onClick={() => handleRequestSort('code')}
                >
                  {t('course:code')}
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                <TableSortLabel
                  active={orderBy === 'activityPeriod'}
                  direction={orderBy === 'activityPeriod' ? order : 'asc'}
                  onClick={() => handleRequestSort('activityPeriod')}
                >
                  {t('course:time')}
                </TableSortLabel>
              </TableCell>
              <TableCell />
            </TableRow>
          </TableHead>

          <TableBody>

            {
              sorted.length
                ?
                sorted.map((course) => (
                  <TableRow key={course.courseId} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      <TextButton onClick={() => handleChatLink(course.courseId!)} sx={{ fontWeight: 'bold' }} disabled={!course.courseId}>
                        {course.name[language]}
                      </TextButton>
                    </TableCell>
                    <TableCell align="right">{course.courseUnits[0]?.code ?? '--'}</TableCell>
                    <TableCell align="right">{formatDate(course.activityPeriod)}</TableCell>
                    <TableCell align="right" sx={{ width: 0 }}>
                      <Box sx={{ display: 'inline-flex', gap: 2, pl: '3rem' }}>
                        {type === 'ended' && (
                          <Box component="span" sx={{ color: 'error.main', whiteSpace: 'nowrap' }}>
                            {t('course:courseEnded')}
                          </Box>
                        )}
                        {type !== 'ended' && (
                          <>
                            <GrayButton size="small" endIcon={<OpenInNewIcon />}>
                              {t('course:toCoursePage')}
                            </GrayButton>
                            {type === 'enabled' ? (
                              <BlueButton disabled={!course.courseId} size="small" onClick={() => handleCourseSettings(course.courseId!)}>{t('course:edit')}</BlueButton>
                            ) : (
                              <GreenButton disabled={!course.courseId} size="small" onClick={() => handleCourseSettings(course.courseId!)}>{t('course:activate')}</GreenButton>
                            )}
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
                :
                <TableRow>
                  <Box p={2}>
                    {t('course:noResults')}
                  </Box>
                </TableRow>
            }
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

const CoursesSkeleton = () => (
  <Box>
    <Tabs
      value={0}
      slotProps={{
        indicator: {
          sx: { backgroundColor: 'rgba(0,0,0,0.1)', height: 3, borderRadius: 1 },
        },
      }}
    >
      <Tab label={<Skeleton width={100} />} />
      <Tab label={<Skeleton width={100} />} />
      <Tab label={<Skeleton width={120} />} />
    </Tabs>

    <Box sx={{ py: 2 }}>
      <TableContainer sx={{ borderRadius: 1, minWidth: 800 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.06)' }}>
              <TableCell sx={{ fontWeight: 'bold' }}><Skeleton width={80} /></TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}><Skeleton width={60} /></TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}><Skeleton width={60} /></TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton width={240} /></TableCell>
                <TableCell align="right"><Skeleton width={80} /></TableCell>
                <TableCell align="right"><Skeleton width={120} /></TableCell>
                <TableCell align="right" sx={{ width: 0 }}>
                  <Box sx={{ display: 'inline-flex', gap: 2, pl: '2rem' }}>
                    <Skeleton variant="rounded" width={110} height={32} />
                    <Skeleton variant="rounded" width={90} height={32} />
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  </Box>
)



export default CoursesModal
