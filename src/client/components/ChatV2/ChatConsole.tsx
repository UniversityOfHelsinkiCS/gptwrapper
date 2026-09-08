import { Box, IconButton, Tooltip, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import type { User } from '../../types'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ChatIcon from '@mui/icons-material/Chat'
import CloseIcon from '@mui/icons-material/Close'
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks'
import { getLanguageValue } from '@shared/utils'
import { usePromptState } from './PromptState'
import useCourse from '../../hooks/useCourse'

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
  ariaLabel?: string
}

const SelectorRow = ({ icon, label, placeholder, onClick, onClear, clearTooltip, disabled, selectorTestId, clearTestId, ariaLabel }: SelectorRowProps) => {
  const hasValue = Boolean(label)
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, px: 3, mt: 1 }}>
      <Box
        component="button"
        aria-label={ariaLabel}
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

type ContextRowProps = {
  courseLabel?: string | null
  promptLabel?: string | null
  promptType?: string | null
  placeholder: string
  onClick?: () => void
  onClear?: () => void
  clearTooltip?: string
  selectorTestId?: string
  clearTestId?: string
  ariaDescription?: string
}

const ContextRow = ({
  courseLabel,
  promptLabel,
  promptType,
  placeholder,
  onClick,
  onClear,
  clearTooltip,
  selectorTestId,
  clearTestId,
  ariaDescription,
}: ContextRowProps) => {
  const hasPrompt = Boolean(promptLabel)
  const { t } = useTranslation()

  if (!hasPrompt) {
    return (
      <SelectorRow ariaLabel={t('sidebar:coursesAndPrompts')} icon={<ChatIcon />} placeholder={placeholder} onClick={onClick} selectorTestId={selectorTestId} />
    )
  }

  const hasType = promptType === 'CHAT_INSTANCE' || promptType === 'PERSONAL' || promptType === 'UNIVERSITY'
  const typeLabel = hasType
    ? promptType === 'CHAT_INSTANCE'
      ? courseLabel
      : t(`sidebar:${promptType === 'PERSONAL' ? 'myPrompt' : 'universityPrompt'}`)
    : null

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, px: 3, mt: 1 }}>
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          border: '1.5px dashed',
          borderColor: 'transparent',
          borderRadius: 2,
          backgroundColor: 'action.hover',
          transition: 'background-color .15s ease, border-color .15s ease',
        }}
      >
        <Box
          component="button"
          onClick={onClick}
          data-testid={selectorTestId}
          aria-description={ariaDescription}
          sx={{
            position: 'relative',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: 0.75,
            border: 'none',
            borderRadius: 2,
            background: 'transparent',
            px: 1.5,
            py: 1.25,
            pr: 4,
            textAlign: 'left',
            cursor: 'pointer',
            fontFamily: 'inherit',
            '&:hover': { backgroundColor: 'action.selected' },
            fontWeight: 500,
            color: 'text.primary',
          }}
        >
          {hasType && (
            <Box sx={{ display: 'flex', gap: 0.75, minWidth: 0, mb: 1 }}>
              <Typography
                sx={{
                  minWidth: 0,
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'normal',
                }}
              >
                {typeLabel}
              </Typography>
            </Box>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', flexShrink: 0, color: 'primary.main', '& svg': { fontSize: 18 } }}>
              <ChatIcon />
            </Box>
            <Typography noWrap sx={{ flex: 1, minWidth: 0, fontSize: '0.9375rem', fontWeight: 700, color: 'text.primary' }}>
              {promptLabel}
            </Typography>
          </Box>
          <ChevronRightIcon
            sx={{ position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)', fontSize: 16, color: 'text.disabled', flexShrink: 0 }}
          />
        </Box>
      </Box>
      {onClear && (
        <Tooltip title={clearTooltip ?? ''} placement="right">
          <IconButton
            size="small"
            onClick={onClear}
            data-testid={clearTestId}
            sx={{ mt: 0.25, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  )
}

export default function ChatConsole({ user }: { user?: User | null }) {
  const navigate = useNavigate()
  const { courseId } = useParams()
  const { t, i18n } = useTranslation()
  const { activePrompt, handleChangePrompt } = usePromptState()
  const isCourseChat = Boolean(courseId) && courseId !== 'general'
  const { data: course } = useCourse(isCourseChat ? courseId : undefined)
  const isEmployeeOrAdmin = user?.isEmployee || user?.isAdmin

  const promptsPath = `/${courseId ?? 'general'}/prompts`
  const courseLabel = isCourseChat ? (course ? getLanguageValue(course.name, i18n.language) : '') : undefined

  return (
    <Box sx={{ pb: 1 }}>
      <Box sx={{ mb: 1 }} data-testid={activePrompt ? 'prompt-name' : undefined}>
        <SectionLabel>{t('sidebar:coursesAndPrompts')}</SectionLabel>
        <ContextRow
          ariaDescription={t('sidebar:manageCourseAndPrompts')}
          courseLabel={courseLabel}
          promptLabel={activePrompt?.name}
          promptType={activePrompt?.type}
          placeholder={t('sidebar:promptSelect')}
          onClick={() => navigate(promptsPath)}
          onClear={
            activePrompt
              ? () => {
                  handleChangePrompt(undefined)
                  navigate('/general')
                }
              : undefined
          }
          clearTooltip={t('sidebar:promptNone')}
          selectorTestId="choose-prompt-button"
        />
      </Box>

      {isEmployeeOrAdmin && (
        <Box>
          <SectionLabel>{t('sidebar:sourceMaterials')}</SectionLabel>
          <SelectorRow
            icon={<LibraryBooksIcon />}
            placeholder={t('course:userSourceMaterials')}
            onClick={() => navigate(`/${courseId ?? 'general'}/userrags`)}
            selectorTestId="openSourceMaterialsButton"
            ariaLabel={t('sidebar:sourceMaterials')}
          />
        </Box>
      )}
    </Box>
  )
}
