import { Box, IconButton, Tooltip, Typography, Divider } from '@mui/material'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import type { User } from '../../types'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ChatIcon from '@mui/icons-material/Chat'
import CloseIcon from '@mui/icons-material/Close'
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks'
import { getLanguageValue } from '@shared/utils'
import { usePromptState } from './PromptState'
import useCourse from '../../hooks/useCourse'
import { consumePendingFocusTarget, requestFocusAfterNavigate } from '../../util/accessibility'

const SectionLabel = ({ children }: { children: ReactNode }) => (
  <Typography
    variant="overline"
    component="h2"
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

const SelectorRow = ({ icon, label, placeholder, onClick, disabled, selectorTestId }: SelectorRowProps) => {
  const hasValue = Boolean(label)
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, px: 3, mt: 1 }}>
      <Box
        component="button"
        onClick={onClick}
        disabled={disabled}
        data-testid={selectorTestId}
        id={selectorTestId}
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
          fontWeight: 400,
          color: 'text.secondary',
          backgroundColor: hasValue ? 'action.hover' : 'transparent',
          transition: 'background-color .15s ease',
          '&:hover': { backgroundColor: disabled ? 'transparent' : 'action.selected' },
        }}
      >
        <Box sx={{ display: 'flex', flexShrink: 0, color: hasValue ? 'primary.main' : 'text.disabled', '& svg': { fontSize: 18 } }}>{icon}</Box>
        <Box sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label || placeholder}</Box>
        <ChevronRightIcon sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0 }} />
      </Box>
    </Box>
  )
}

type ContextCardProps = {
  courseLabel?: string | null
  promptLabel?: string | null
  promptType?: string | null
  ragLabel?: string | null
  ragHidden?: boolean | null
  isEmployeeOrAdmin?: boolean
  onClear?: () => void
  clearTooltip?: string
  contextCardId?: string
  clearTestId?: string
}

const ContextCard = ({
  courseLabel,
  promptLabel,
  promptType,
  ragLabel,
  ragHidden,
  isEmployeeOrAdmin,
  onClear,
  clearTooltip,
  contextCardId,
  clearTestId,
}: ContextCardProps) => {
  const hasPrompt = Boolean(promptLabel)
  const { t } = useTranslation()

  const hasType = promptType === 'CHAT_INSTANCE' || promptType === 'PERSONAL' || promptType === 'UNIVERSITY'
  const typeLabel = hasType
    ? promptType === 'CHAT_INSTANCE'
      ? courseLabel
      : t(`sidebar:${promptType === 'PERSONAL' ? 'myPrompt' : 'universityPrompt'}`)
    : null

  const showRagLabel = Boolean(ragLabel) && (promptType === 'PERSONAL' || !ragHidden || isEmployeeOrAdmin)

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
        }}
      >
        <Box
          data-testid={contextCardId}
          id={contextCardId}
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
            fontFamily: 'inherit',
            fontWeight: 500,
            color: 'text.primary',
          }}
        >
          {!hasPrompt ? (
            <Typography
              noWrap
              sx={{
                flex: 1,
                minWidth: 0,
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'normal',
                fontSize: '0.875rem',
                fontWeight: 400,
                color: 'text.secondary',
              }}
            >
              {t('chat:noPrompt')}
            </Typography>
          ) : (
            <>
              {hasType && (
                <Box sx={{ display: 'flex', gap: 0.75, minWidth: 0, mb: 1 }}>
                  <Typography
                    sx={{
                      minWidth: 0,
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      letterSpacing: '0.05em',

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
                <Typography
                  noWrap
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: '0.9375rem',
                    fontWeight: 700,
                    color: 'text.primary',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'normal',
                  }}
                >
                  {promptLabel}
                </Typography>
              </Box>
              {showRagLabel && (
                <Box sx={{ display: 'flex', gap: 0.75, minWidth: 0, mt: 1 }}>
                  <Typography
                    sx={{
                      minWidth: 0,
                      fontSize: '0.6875rem',

                      letterSpacing: '0.05em',

                      color: 'text.secondary',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'normal',
                    }}
                  >
                    {t('sidebar:sourceMaterialInUse')}
                    {ragLabel}
                  </Typography>
                </Box>
              )}
            </>
          )}
          {onClear && (
            <Tooltip title={clearTooltip ?? ''} placement="right">
              <IconButton
                size="small"
                onClick={onClear}
                data-testid={clearTestId}
                sx={{ position: 'absolute', top: 4, right: 4, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}
              >
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
    </Box>
  )
}

export default function ChatConsole({ user }: { user?: User | null }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { courseId } = useParams()
  const { t, i18n } = useTranslation()
  const { activePrompt, handleChangePrompt } = usePromptState()
  const isCourseChat = Boolean(courseId) && courseId !== 'general'
  const { data: course } = useCourse(isCourseChat ? courseId : undefined)
  const isEmployeeOrAdmin = user?.isEmployee || user?.isAdmin

  const promptsPath = `/${courseId ?? 'general'}/prompts`
  const courseLabel = isCourseChat ? (course ? getLanguageValue(course.name, i18n.language) : '') : undefined

  useEffect(() => {
    consumePendingFocusTarget()
  }, [location.pathname, activePrompt])

  return (
    <Box sx={{ pb: 1 }}>
      <Box sx={{ mb: 1 }}>
        <SelectorRow
          icon={<ChatIcon />}
          placeholder={t('sidebar:coursesAndPrompts')}
          onClick={() => navigate(promptsPath)}
          selectorTestId="choose-prompt-button"
        />
      </Box>

      {isEmployeeOrAdmin && (
        <Box sx={{ mb: 1 }}>
          <SelectorRow
            icon={<LibraryBooksIcon />}
            placeholder={t('sidebar:sourceMaterials')}
            onClick={() => navigate(`/${courseId ?? 'general'}/userrags`)}
            selectorTestId="openSourceMaterialsButton"
          />
        </Box>
      )}
      <Divider />
      <Box sx={{ mt: 1 }} data-testid={activePrompt ? 'prompt-name' : undefined}>
        <SectionLabel>{t('common:prompt')}</SectionLabel>
        <ContextCard
          courseLabel={courseLabel}
          promptLabel={activePrompt?.name}
          promptType={activePrompt?.type}
          ragLabel={activePrompt?.ragIndex?.metadata.name}
          ragHidden={activePrompt?.ragHidden}
          isEmployeeOrAdmin={Boolean(isEmployeeOrAdmin)}
          onClear={
            activePrompt
              ? () => {
                  requestFocusAfterNavigate('chat-input')
                  handleChangePrompt(undefined)
                  navigate('/general')
                }
              : undefined
          }
          clearTooltip={t('sidebar:promptNone')}
          contextCardId="prompt-context"
        />
      </Box>
    </Box>
  )
}
