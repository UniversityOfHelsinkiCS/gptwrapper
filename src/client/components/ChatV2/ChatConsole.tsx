import { Box, Chip, IconButton, Tooltip, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import type { Course, User } from '../../types'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import SchoolIcon from '@mui/icons-material/School'
import ChatIcon from '@mui/icons-material/Chat'
import CloseIcon from '@mui/icons-material/Close'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks'
import { usePromptState } from './PromptState'

const SectionLabel = ({ children }: { children: ReactNode }) => (
  <Typography
    variant="overline"
    sx={{
      display: 'block',
      fontSize: '0.75rem',
      fontWeight: 700,
      letterSpacing: '0.1em',
      color: 'text.secondary',
      px: 3,
      pt: 1.5,
      pb: 0.5,
      lineHeight: 1.6,
    }}
  >
    {children}
  </Typography>
)

type SelectorRowProps = {
  icon: ReactNode
  label?: string | null
  placeholder: string
  onClick?: () => void
  onClear?: () => void
  clearTooltip?: string
  disabled?: boolean
  selectorTestId?: string
  clearTestId?: string
}

const SelectorRow = ({ icon, label, placeholder, onClick, onClear, clearTooltip, disabled, selectorTestId, clearTestId }: SelectorRowProps) => {
  const hasValue = Boolean(label)
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, px: 3 }}>
      <Box
        component="button"
        onClick={onClick}
        disabled={disabled}
        data-testid={selectorTestId}
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          border: 'none',
          borderRadius: 1.5,
          px: 1,
          py: 0.75,
          textAlign: 'left',
          cursor: disabled ? 'default' : 'pointer',
          fontFamily: 'inherit',
          fontSize: '0.875rem',
          fontWeight: hasValue ? 500 : 400,
          color: hasValue ? 'text.primary' : 'text.disabled',
          backgroundColor: hasValue ? 'action.hover' : 'transparent',
          transition: 'background-color .15s ease',
          '&:hover': { backgroundColor: disabled ? 'transparent' : 'action.selected' },
        }}
      >
        <Box sx={{ display: 'flex', flexShrink: 0, color: hasValue ? 'primary.main' : 'text.disabled', '& svg': { fontSize: 18 } }}>{icon}</Box>
        <Box sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label || placeholder}</Box>
        <ChevronRightIcon sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0 }} />
      </Box>
      {hasValue && onClear && (
        <Tooltip title={clearTooltip ?? ''} placement="right">
          <IconButton size="small" onClick={onClear} data-testid={clearTestId} sx={{ color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  )
}

const CourseStatus = ({ course }: { course?: Course }) => {
  const { t } = useTranslation()
  if (!course) return null

  const courseEnded = Date.parse(course.activityPeriod.endDate) < Date.now()
  const courseEnabled = course.usageLimit > 0

  if (courseEnded) {
    return (
      <Tooltip title={t('chat:courseChatEndedInfo')}>
        <Chip label={t('chat:courseChatEnded')} color="error" size="small" icon={<InfoOutlinedIcon fontSize="small" />} />
      </Tooltip>
    )
  }
  if (!courseEnabled) {
    return (
      <Tooltip title={t('chat:courseChatNotActivatedInfo')}>
        <Chip label={t('chat:courseChatNotActivated')} color="warning" size="small" icon={<InfoOutlinedIcon fontSize="small" />} />
      </Tooltip>
    )
  }
  return null
}

export default function ChatConsole({ user, course }: { user?: User | null; course?: Course }) {
  const navigate = useNavigate()
  const { courseId } = useParams()
  const { t, i18n } = useTranslation()
  const { activePrompt, handleChangePrompt } = usePromptState()
  const { language } = i18n

  const courseName = course ? course.name[language] || 'undefined course' : undefined
  const coursesPath = `/${courseId ?? 'general'}/courses`
  const promptsPath = `/${courseId ?? 'general'}/prompts`

  const handleClearCourse = () => {
    navigate('/general')
    handleChangePrompt(undefined)
  }

  return (
    <Box sx={{ pb: 1 }}>
      <Box sx={{ mb: 1 }}>
        <SectionLabel>{t('sidebar:courseTitle')}</SectionLabel>
        <SelectorRow
          icon={<SchoolIcon />}
          label={courseName}
          placeholder={t('sidebar:noCourse')}
          onClick={() => navigate(coursesPath)}
          onClear={course ? handleClearCourse : undefined}
          clearTooltip={t('sidebar:courseExit')}
          selectorTestId="select-course-button"
          clearTestId="course-exit-button"
        />
        {course && (
          <Box sx={{ px: 3, pt: 1 }}>
            <CourseStatus course={course} />
          </Box>
        )}
      </Box>

      <Box data-testid={activePrompt ? 'prompt-name' : undefined}>
        <SectionLabel>{t('sidebar:promptTitle')}</SectionLabel>
        <SelectorRow
          icon={<ChatIcon />}
          label={activePrompt?.name}
          placeholder={t('sidebar:promptSelect')}
          onClick={() => navigate(promptsPath)}
          onClear={activePrompt ? () => handleChangePrompt(undefined) : undefined}
          clearTooltip={t('sidebar:promptNone')}
          selectorTestId="choose-prompt-button"
        />
      </Box>

      {user?.isAdmin && (
        <Box>
          <SectionLabel>{t('course:userSourceMaterials')}</SectionLabel>
          <SelectorRow
            icon={<LibraryBooksIcon />}
            placeholder={t('course:userSourceMaterials')}
            onClick={() => navigate(`/${courseId ?? 'general'}/userrags`)}
          />
        </Box>
      )}
    </Box>
  )
}
