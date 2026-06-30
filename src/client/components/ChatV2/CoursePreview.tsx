import useUserUsages from '../../hooks/useUserUsage'
import { Box, Typography, Paper, IconButton, LinearProgress } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { Course } from '../../types'
import DateRangeIcon from '@mui/icons-material/DateRange'
import PeopleIcon from '@mui/icons-material/People'
import useCourse from '../../hooks/useCourse'
import { useState } from 'react'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import BarChartIcon from '@mui/icons-material/BarChart'
import { usagePercent, gaugeColorKey, formatTokens } from './UsageSelector'
import SchoolIcon from '@mui/icons-material/School'


const CoursePreview = ({ course }: { course: Course }) => {
  const { i18n, t } = useTranslation()
  const { language } = i18n
  const { data: chatInstance } = useCourse(course.courseId)

  const courseResponsibilities = chatInstance?.responsibilities || []
  const teacherNames = courseResponsibilities.filter(
    (responsibility) => responsibility.user.first_names && responsibility.user.last_name,
  )
  const toggleTeachers = teacherNames.length > 5
  const [showTeachers, setShowTeachers] = useState(false)
  
  const { usageInfo } = useUserUsages()

  const currentCourseUsage = usageInfo?.courses.find((c) => c.courseId === course.courseId)

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: '12px', overflow: 'auto', maxHeight: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 6, mt: 2 }}>
        <Box sx={{ flexDirection: 'row', display: 'flex', gap: 1, maxWidth: '80%' }}>
          <SchoolIcon color="primary" fontSize='large'/>  
          <Typography 
            variant="h4" 
            fontWeight="bold" 
            data-testid={`course-preview-title-for-${course.name[language]}`} 
            sx={{ wordBreak: 'break-word', hyphens: 'auto', }}>
            {course.name[language]}
          </Typography>
        </Box>
      </Box>
      <Box sx={{mt: 3, display: 'flex', gap: 3, flexDirection: 'column', alignItems: 'flex-start' }}>
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
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Box gap={1} sx={{ display: 'flex', alignItems: 'center' }}>
                    <BarChartIcon color="primary" />
                    <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                      {t('status:usageTitle')}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '250px', mt: 1 }}>
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

        
        <Box sx={{ display: 'flex', flexDirection: 'column', width: '30%' }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <PeopleIcon color="primary"/>          
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
            <Box sx={{ display: 'flex', flexDirection: 'column', ml: 4, mt: 1 }}>
              {teacherNames.map((responsibility) => (
                <Typography key={responsibility.user.id} variant="body2" color="text.primary">
                  {`${responsibility.user.first_names.split(' ')[0]} ${responsibility.user.last_name}`}
                </Typography>
              ))}
            </Box>
          )}
        </Box>
        
      </Box>

      </Paper>
     
  )
}
export default CoursePreview