import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Menu, MenuItem, Popover, Typography } from '@mui/material'
import type { Theme } from '@mui/material/styles'
import HelpOutline from '@mui/icons-material/HelpOutline'
import EventRepeatIcon from '@mui/icons-material/EventRepeat'
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined'
import { Gauge, gaugeClasses } from '@mui/x-charts/Gauge'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { getLanguageValue } from '@shared/utils'
import { CourseUsage } from '@shared/types'
import type { CostUserStatus } from '@shared/usage'
import type { UserStatus } from '../../types'
import useUserUsages from '../../hooks/useUserUsage'
import { InfoBox } from '../common/InfoBox'
import { announceToScreenReader } from '../common/accessibility/SnackbarAnnouncer'
import { usePromptState } from './PromptState'
import { visuallyHidden } from '@mui/utils'

export const usagePercent = (usage: number, limit: number) => (limit > 0 ? Math.round((usage / limit) * 100) : 0)

export const formatTokens = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`)

export const gaugeColorKey = (percent: number): 'error' | 'warning' | 'success' => (percent >= 75 ? 'error' : percent >= 50 ? 'warning' : 'success')

const DARK_GAUGE_COLORS = { success: '#81c995', warning: '#fdba74', error: '#f28b82' } as const

const gaugeColor = (theme: Theme, percent: number) => {
  const key = gaugeColorKey(percent)
  return theme.palette.mode === 'dark' ? DARK_GAUGE_COLORS[key] : theme.palette[key].main
}

const UsageInfoDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs">
      <DialogTitle>{t('status:usageTitle')}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <InfoBox severity="info" icon={<EventRepeatIcon fontSize="small" />}>
          {t('info:usageReset')}
        </InfoBox>
        <InfoBox severity="success" icon={<LightbulbOutlinedIcon fontSize="small" />}>
          {t('info:usageTips')}
        </InfoBox>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common:close')}</Button>
      </DialogActions>
    </Dialog>
  )
}

export const UsageInfoButton = () => {
  const { t } = useTranslation()
  const [infoOpen, setInfoOpen] = React.useState(false)

  return (
    <>
      <IconButton size="small" onClick={() => setInfoOpen(true)} aria-label={t('common:showInfo')}>
        <HelpOutline sx={{ fontSize: 16, color: 'text.secondary' }} />
      </IconButton>
      <UsageInfoDialog open={infoOpen} onClose={() => setInfoOpen(false)} />
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
      [`& .${gaugeClasses.valueText}`]: { fontSize: 11, fontWeight: 700, fill: gaugeColor(theme, percent) },
      [`& .${gaugeClasses.valueArc}`]: { fill: gaugeColor(theme, percent) },
      [`& .${gaugeClasses.referenceArc}`]: { fill: theme.palette.divider },
    })}
  />
)

type UsagePillProps = {
  label: string
  percent: number | null
  open: boolean
  onClick: (event: React.MouseEvent<HTMLElement>) => void
  /** `aria-haspopup` of the button */
  popupRole: 'true' | 'dialog'
  /** Id of the popup, referenced while it is open */
  controls: string
  /** Visually hidden text at the start of the button's accessible name */
  hiddenTitle?: string
  /** Visually hidden text at the end of the button's accessible name */
  hiddenSuffix?: string
}

/** The pill button that opens the usage menu. Later it also leads to the usage dashboard. */
const UsagePill = ({ label, percent, open, onClick, popupRole, controls, hiddenTitle, hiddenSuffix }: UsagePillProps) => (
  <Box
    component="button"
    type="button"
    onClick={onClick}
    aria-haspopup={popupRole}
    aria-expanded={open}
    aria-controls={open ? controls : undefined}
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
    {hiddenTitle && <Typography sx={visuallyHidden}>{hiddenTitle}</Typography>}

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
      {label}
    </Typography>
    {percent != null && (
      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: (theme) => gaugeColor(theme, percent), lineHeight: 1 }}>{percent}%</Typography>
    )}
    {hiddenSuffix && <Typography sx={visuallyHidden}>{hiddenSuffix}</Typography>}

    {open ? (
      <ExpandLessIcon sx={{ fontSize: 16, color: 'text.secondary', ml: -0.25 }} />
    ) : (
      <ExpandMoreIcon sx={{ fontSize: 16, color: 'text.secondary', ml: -0.25 }} />
    )}
  </Box>
)

const TokenUsageSelector = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { courseId } = useParams()
  const { usageInfo, isLoading, refetch } = useUserUsages()
  const { handleChangePrompt } = usePromptState()
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const [infoOpen, setInfoOpen] = React.useState(false)
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
    announceToScreenReader(t('accessibility:courseSelected', { name: getLanguageValue(course.name, i18n.language) }))
    if (course.courseId && course.courseId !== currentCourseId) {
      // Prompts are course-specific, so they must not carry over to the next course
      handleChangePrompt(undefined)
      navigate(`/${course.courseId}`)
    }
  }

  return (
    <>
      <UsagePill
        label={pillLabel}
        percent={pillPercent}
        open={open}
        onClick={handleClick}
        popupRole="true"
        controls="usage-selector-menu"
        hiddenTitle={t('status:usageTitle')}
      />
      <Menu
        id="usage-selector-menu"
        anchorEl={anchorEl}
        open={open}
        disableAutoFocusItem
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        slotProps={{
          list: { 'aria-labelledby': 'usage-selector-title' },
          paper: {
            style: {
              minWidth: 320,
              borderRadius: '0.75rem',
              marginTop: '-8px',
            },
          },
        }}
      >
        <MenuItem aria-label={[t('status:usageTitle'), t('common:showInfo')].join(', ')} aria-haspopup="dialog" onClick={() => setInfoOpen(true)}>
          <Typography
            id="usage-selector-title"
            component="span"
            sx={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '0.1em', color: 'text.secondary', py: 1 }}
          >
            {t('status:usageTitle')}
          </Typography>

          <HelpOutline sx={{ fontSize: 16, color: 'text.secondary', ml: 'auto' }} />
        </MenuItem>

        {usageInfo.courses
          .filter((course) => course.usage > 0 || course.courseId === currentCourseId || course.courseId === 'general')
          .map((course) => {
            const active = course.courseId === currentCourseId
            const percent = usagePercent(course.usage, course.limit)
            const key = course.courseId ?? getLanguageValue(course.name, i18n.language)
            const itemSx = { display: 'flex', gap: 1.25, py: 0.75, px: 1.75, alignItems: 'center', mt: 1 }
            const staticItemSx = {
              ...itemSx,
              cursor: 'text',
              '&:hover': { backgroundColor: 'transparent' },
              '&.Mui-focusVisible': { backgroundColor: 'transparent' },
            }
            const content = (
              <>
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
              </>
            )
            const isSelectable = course.courseId === 'general' || active
            const ariaLabel = `${getLanguageValue(course.name, i18n.language)}, ${formatTokens(course.usage)} / ${formatTokens(course.limit)} ${t('status:tokens')}, ${percent}% ${t('status:tokensUsed')}`

            return (
              <MenuItem
                role="menuitemradio"
                aria-checked={active}
                aria-disabled={isSelectable ? undefined : true}
                aria-label={ariaLabel}
                key={key}
                onClick={isSelectable ? () => handleSelect(course) : undefined}
                sx={isSelectable ? itemSx : staticItemSx}
              >
                {content}
              </MenuItem>
            )
          })}
      </Menu>
      <UsageInfoDialog open={infoOpen} onClose={() => setInfoOpen(false)} />
    </>
  )
}

/** Under cost enforcement: one gauge for the weekly budget, its composition and the next reset. No euros. */
export const CostUsageSelector = ({ status }: { status: CostUserStatus }) => {
  const { t, i18n } = useTranslation()
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const percent = usagePercent(status.usage, status.limit)
  const bonuses = status.budget.bonuses.filter((bonus) => bonus.percent > 0)
  const resetsAt = new Date(status.resetsAt).toLocaleString(i18n.language, { dateStyle: 'full', timeStyle: 'short' })
  const lineSx = { fontSize: '0.875rem', lineHeight: 1.4 }

  return (
    <>
      <UsagePill
        label={t('status:usage')}
        percent={percent}
        open={open}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        popupRole="dialog"
        controls="usage-budget-popover"
        hiddenSuffix={t('status:budgetPillSuffix')}
      />
      <Popover
        id="usage-budget-popover"
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        slotProps={{
          paper: {
            role: 'dialog',
            'aria-labelledby': 'usage-budget-title',
            sx: { width: 320, maxWidth: 'calc(100vw - 32px)', borderRadius: '0.75rem', mt: '-8px', p: 2 },
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography id="usage-budget-title" component="h2" sx={{ fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '0.1em', color: 'text.secondary' }}>
              {t('status:budgetTitle')}
            </Typography>
            <Typography sx={{ ...lineSx, fontWeight: 600, mt: 0.5 }}>{t('status:budgetUsedPercent', { percent })}</Typography>
          </Box>
          <Box aria-hidden>
            <UsageGauge percent={percent} />
          </Box>
        </Box>

        <Typography component="h3" sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', mt: 2 }}>
          {t('status:budgetComposition')}
        </Typography>
        <Box component="ul" data-testid="usage-budget-composition" sx={{ listStyle: 'none', p: 0, m: 0, mt: 0.5 }}>
          <Typography component="li" sx={lineSx}>
            {t('status:budgetBase')}
          </Typography>
          {bonuses.map((bonus) => (
            <Typography component="li" key={bonus.courseId} sx={lineSx}>
              {t('status:budgetBonus', { name: getLanguageValue(bonus.name, i18n.language), percent: bonus.percent })}
            </Typography>
          ))}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, color: 'text.secondary' }}>
          <EventRepeatIcon fontSize="small" aria-hidden />
          <Typography sx={{ fontSize: '0.8125rem' }} data-testid="usage-budget-resets">
            {t('status:budgetResets', { resetsAt })}
          </Typography>
        </Box>
      </Popover>
    </>
  )
}

/**
 * The usage pill under the chat box. The mode comes from the user status: under cost one budget gauge, under tokens a
 * gauge per course from `/users/status/all` (only fetched under tokens).
 */
const UsageSelector = ({ userStatus }: { userStatus?: UserStatus }) => {
  if (!userStatus) return null
  return userStatus.mode === 'cost' ? <CostUsageSelector status={userStatus} /> : <TokenUsageSelector />
}

export default UsageSelector
