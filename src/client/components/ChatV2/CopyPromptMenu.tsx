import PersonIcon from '@mui/icons-material/Person'
import { Box, Divider, InputAdornment, ListItemIcon, ListItemText, ListSubheader, Menu, MenuItem, TextField, Typography } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { enqueueSnackbar } from 'notistack'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { CoursesViewCourse } from '../../hooks/useUserCourses'
import { useCopyPromptMutation } from '../../hooks/usePromptMutation'
import type { Prompt } from '../../types'
import { formatDate } from './util'

/** Above this many courses the list is long enough that scanning it beats scrolling. */
const SEARCH_THRESHOLD = 8

const CourseStatusDot = ({ activated }: { activated: boolean }) => (
  <Box
    component="span"
    sx={{
      width: 8,
      height: 8,
      borderRadius: '50%',
      mr: 1.5,
      flexShrink: 0,
      backgroundColor: activated ? 'success.main' : 'grey.400',
    }}
  />
)

const CopyPromptMenu = ({
  prompt,
  targets,
  anchorEl,
  onClose,
  onCopied,
}: {
  prompt: Prompt
  targets: CoursesViewCourse[]
  anchorEl: HTMLElement | null
  onClose: () => void
  onCopied: (course?: CoursesViewCourse) => void
}) => {
  const { t, i18n } = useTranslation()
  const { language } = i18n
  const [search, setSearch] = useState('')
  const { mutateAsync: copyPrompt, isPending } = useCopyPromptMutation()

  const showSearch = targets.length > SEARCH_THRESHOLD
  const query = search.trim().toLowerCase()
  const visibleTargets = query ? targets.filter((course) => course.name[language]?.toLowerCase().includes(query)) : targets

  const handleClose = () => {
    setSearch('')
    onClose()
  }

  const handleCopy = async (course?: CoursesViewCourse) => {
    if (isPending) return

    handleClose()

    try {
      await copyPrompt({
        promptId: prompt.id,
        destinationCourseId: course?.courseId,
        target: course ? { type: 'CHAT_INSTANCE', chatInstanceId: course.id } : { type: 'PERSONAL' },
      })

      enqueueSnackbar(course ? t('prompt:copiedToCourse', { course: course.name[language] }) : t('prompt:copiedToMyPrompts'), { variant: 'success' })

      onCopied(course)
    } catch (error) {
      const apiError = error as { response?: { data?: { error?: string } }; message?: string }

      enqueueSnackbar(apiError.response?.data?.error ?? apiError.message ?? t('prompt:copyPromptFailed'), { variant: 'error' })
    }
  }

  return (
    <Menu
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{ list: { sx: { pt: 0, minWidth: 300 } }, paper: { sx: { maxHeight: 400 } } }}
      data-testid="copy-prompt-menu"
    >
      <ListSubheader sx={{ lineHeight: 2.5 }}>{t('prompt:copyPromptTo')}</ListSubheader>

      <MenuItem onClick={() => handleCopy()} disabled={isPending} data-testid="copy-target-personal" sx={{ mt: 1 }}>
        <ListItemIcon sx={{ minWidth: 36 }}>
          <PersonIcon color="primary" fontSize="small" />
        </ListItemIcon>
        <ListItemText primary={t('settings:myPrompts')} sx={{ minWidth: 0, my: 0 }} />
      </MenuItem>

      {targets.length > 0 && <Divider />}

      {showSearch && (
        <Box sx={{ px: 1.5, py: 1 }}>
          <TextField
            size="small"
            fullWidth
            autoFocus
            value={search}
            placeholder={t('settings:filterCourses')}
            onChange={(e) => setSearch(e.target.value)}
            // Menus treat typing as type-ahead navigation, which would steal every keystroke.
            onKeyDown={(e) => e.stopPropagation()}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
            data-testid="copy-target-search"
          />
        </Box>
      )}

      {visibleTargets.map((course) => (
        <MenuItem key={course.id} onClick={() => handleCopy(course)} disabled={isPending} data-testid={`copy-target-${course.courseId ?? course.id}`}>
          <CourseStatusDot activated={course.activated} />
          <ListItemText
            primary={course.name[language]}
            secondary={formatDate(course.activityPeriod)}
            slotProps={{
              primary: { noWrap: true },
              secondary: { variant: 'caption', color: 'text.secondary' },
            }}
            sx={{ minWidth: 0, my: 0 }}
          />
        </MenuItem>
      ))}

      {targets.length > 0 && visibleTargets.length === 0 && (
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            {t('course:noCourses')}
          </Typography>
        </Box>
      )}
    </Menu>
  )
}

export default CopyPromptMenu
