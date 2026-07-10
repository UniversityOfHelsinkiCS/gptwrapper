import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Menu, MenuItem, Typography } from '@mui/material'
import HelpOutline from '@mui/icons-material/HelpOutline'
import EventRepeatIcon from '@mui/icons-material/EventRepeat'
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined'
import { Gauge, gaugeClasses } from '@mui/x-charts/Gauge'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { getLanguageValue } from '@shared/utils'
import { CourseUsage } from '@shared/types'
import useUserUsages from '../../hooks/useUserUsage'
import { usePromptState } from './PromptState'

export const usagePercent = (usage: number, limit: number) => (limit > 0 ? Math.round((usage / limit) * 100) : 0)

export const formatTokens = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`)

export const gaugeColorKey = (percent: number): 'error' | 'warning' | 'success' => (percent >= 75 ? 'error' : percent >= 50 ? 'warning' : 'success')

export const UsageInfoButton = () => {
  const { t } = useTranslation()
  const [infoOpen, setInfoOpen] = React.useState(false)

  return (
    <>
      <IconButton size="small" onClick={() => setInfoOpen(true)} aria-label={t('common:showInfo')}>
        <HelpOutline sx={{ fontSize: 16, color: 'text.secondary' }} />
      </IconButton>
      <Dialog open={infoOpen} onClose={() => setInfoOpen(false)} maxWidth="xs">
        <DialogTitle>{t('status:usageTitle')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Alert severity="info" icon={<EventRepeatIcon fontSize="small" />}>
            {t('info:usageReset')}
          </Alert>
          <Alert severity="success" icon={<LightbulbOutlinedIcon fontSize="small" />}>
            {t('info:usageTips')}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoOpen(false)}>{t('common:close')}</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

const UsageGauge = ({ percent, size = 56 }: { percent: number; size?: number }) => (
  <Gauge
    width={size}
    height={size}
    value={Math.min(percent, 100)}
    text={`${percent}%`}
    startAngle={-110}
    endAngle={110}
    margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
    skipAnimation
    sx={(theme) => ({
      flexShrink: 0,
      [`& .${gaugeClasses.valueText}`]: { fontSize: 11, fontWeight: 700, fill: theme.palette[gaugeColorKey(percent)].main },
      [`& .${gaugeClasses.valueArc}`]: { fill: theme.palette[gaugeColorKey(percent)].main },
      [`& .${gaugeClasses.referenceArc}`]: { fill: theme.palette.divider },
    })}
  />
)

const UsageSelector = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { courseId } = useParams()
  const { usageInfo, isLoading, refetch } = useUserUsages()
  const { handleChangePrompt } = usePromptState()
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  if (isLoading || !usageInfo) return null

  const currentCourseId = courseId ?? 'general'
  const currentCourse = usageInfo.courses.find((course) => course.courseId === currentCourseId)

  const pillLabel = currentCourse ? getLanguageValue(currentCourse.name, i18n.language) : t('status:usage')
  const pillPercent = currentCourse ? usagePercent(currentCourse.usage, currentCourse.limit) : null

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    refetch()
    setAnchorEl(event.currentTarget)
  }

  const handleSelect = (course: CourseUsage) => {
    setAnchorEl(null)
    if (course.courseId && course.courseId !== currentCourseId) {
      // Prompts are course-specific, so they must not carry over to the next course
      handleChangePrompt(undefined)
      navigate(`/${course.courseId}`)
    }
  }

  return (
    <>
      <Box
        component="button"
        type="button"
        onClick={handleClick}
        data-testid="usage-selector"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          padding: '4px 8px 4px 10px',
          borderRadius: 999,
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'background-color 0.12s, border-color 0.12s',
          '&:hover': {
            backgroundColor: 'background.default',
          },
        }}
      >
        <Typography
          sx={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'text.primary',
            lineHeight: 1,
            maxWidth: 160,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {pillLabel}
        </Typography>
        {pillPercent != null && (
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: `${gaugeColorKey(pillPercent)}.main`, lineHeight: 1 }}>{pillPercent}%</Typography>
        )}
        {open ? (
          <ExpandLessIcon sx={{ fontSize: 16, color: 'text.secondary', ml: -0.25 }} />
        ) : (
          <ExpandMoreIcon sx={{ fontSize: 16, color: 'text.secondary', ml: -0.25 }} />
        )}
      </Box>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        slotProps={{
          paper: {
            style: {
              minWidth: 320,
              borderRadius: '0.75rem',
              marginTop: '-8px',
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
          <Typography
            variant="overline"
            sx={{ display: 'block', px: 1.75, pt: 0.5, pb: 1, fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.1em', color: 'text.disabled' }}
          >
            {t('status:usageTitle')}
          </Typography>
          <UsageInfoButton />
        </Box>
        {usageInfo.courses
          .filter((course) => course.usage > 0 || course.courseId === currentCourseId || course.courseId === 'general')
          .map((course) => {
            const active = course.courseId === currentCourseId
            const percent = usagePercent(course.usage, course.limit)
            return (
              <MenuItem
                key={course.courseId ?? getLanguageValue(course.name, i18n.language)}
                onClick={() => handleSelect(course)}
                sx={{ gap: 1.25, py: 0.75, px: 1.75, alignItems: 'center' }}
              >
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.25, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: '0.875rem',
                      fontWeight: active ? 600 : 400,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {getLanguageValue(course.name, i18n.language)}
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.3 }}>
                    {formatTokens(course.usage)} / {formatTokens(course.limit)} {t('status:tokens')}
                  </Typography>
                </Box>
                <UsageGauge percent={percent} />
              </MenuItem>
            )
          })}
      </Menu>
    </>
  )
}

export default UsageSelector
