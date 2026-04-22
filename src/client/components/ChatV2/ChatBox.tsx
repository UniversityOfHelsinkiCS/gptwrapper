import React, { useEffect, useState } from 'react'
import HelpOutline from '@mui/icons-material/HelpOutline'
import Send from '@mui/icons-material/Send'
import StopIcon from '@mui/icons-material/Stop'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import { Box, Chip, IconButton, TextField, Tooltip, Typography, Alert } from '@mui/material'
import { useRef } from 'react'
import useUserStatus from '../../hooks/useUserStatus'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BlueButton, GrayButton } from './general/Buttons'
import { useIsEmbedded } from '../../contexts/EmbeddedContext'
import useCurrentUser from '../../hooks/useCurrentUser'
import { SendPreferenceConfiguratorModal, ShiftEnterForNewline, ShiftEnterToSend } from '../Settings/SendPreferenceConfigurator'
import { useKeyboardCommands } from './useKeyboardCommands'
import { WarningType } from '@shared/aiApi'
import ModelSelector from './ModelSelector'
import { ValidModelName } from '../../../config'
import { amber } from '@mui/material/colors'

export const ChatBox = ({
  disabled,
  fileInputRef,
  fileName,
  messageWarning,
  setFileName,
  handleCancel,
  handleContinue,
  handleSubmit,
  handleReset,
  handleStop,
  isMobile,
  currentModel,
  setModel,
}: {
  disabled: boolean
  fileInputRef: React.RefObject<HTMLInputElement | null>
  fileName: string
  messageWarning: { [key in WarningType]?: { message: string; ignored: boolean } }
  setFileName: (name: string) => void
  handleCancel: () => void
  handleContinue: (message: string, ignoredWarnings: WarningType[]) => void
  handleSubmit: (message: string) => void
  handleReset: () => void
  handleStop: () => void
  isMobile: boolean
  currentModel: ValidModelName
  setModel: (model: ValidModelName) => void
}) => {
  const { courseId } = useParams()
  const isEmbedded = useIsEmbedded()
  const { user } = useCurrentUser()
  const { userStatus, isLoading: statusLoading, refetch: refetchStatus } = useUserStatus(courseId)

  const [isTokenLimitExceeded, setIsTokenLimitExceeded] = useState<boolean>(false)
  const [disallowedFileType, setDisallowedFileType] = useState<string>('')
  const [fileTypeAlertOpen, setFileTypeAlertOpen] = useState<boolean>(false)
  const [sendPreferenceConfiguratorOpen, setSendPreferenceConfiguratorOpen] = useState<boolean>(false)
  const [isNearBottom, setIsNearBottom] = useState<boolean>(true)
  const sendButtonRef = useRef<HTMLButtonElement>(null)
  const textFieldRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    const check = () => {
      const el = document.documentElement
      const dist = el.scrollHeight - el.clientHeight - el.scrollTop
      setIsNearBottom(dist <= 24)
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => {
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [])

  const acuallyDisabled = disabled || message.length === 0

  const { t } = useTranslation()

  useKeyboardCommands({
    resetChat: handleReset,
    openModelSelector: () => {
      // setIsModelSelectorOpen(true) // @todo what key combination to open model selector
    },
  })

  const isShiftEnterSend = user?.preferences?.sendShortcutMode === 'shift+enter' || !user?.preferences?.sendShortcutMode

  const handleDeleteFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setFileName('')
  }

  const handleFileTypeValidation = (file: File): void => {
    const allowedImageTypes = ['image/jpeg', 'image/png']
    if (!file.type.startsWith('text/') && file.type !== 'application/pdf' && !allowedImageTypes.find((s) => s === file.type)) {
      setDisallowedFileType(file.type)
      setFileTypeAlertOpen(true)
      setTimeout(() => {
        setFileTypeAlertOpen(false)
      }, 6000)
      return
    }

    if (allowedImageTypes.find((s) => s === file.type) && !user?.isAdmin) {
      setDisallowedFileType(file.type)
      setFileTypeAlertOpen(true)
      setTimeout(() => {
        setFileTypeAlertOpen(false)
      }, 6000)
      return
    }
    setFileName(file.name)
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (acuallyDisabled) return

    handleSubmit(message)
    refetchStatus()
    setMessage('')

    if (user && user.preferences?.sendShortcutMode === undefined) {
      setSendPreferenceConfiguratorOpen(true)
    }

    if (textFieldRef.current) {
      textFieldRef.current.focus()
    }
  }

  useEffect(() => {
    if (!userStatus) return
    setIsTokenLimitExceeded(userStatus.usage > userStatus.limit)
  }, [statusLoading, userStatus])

  if (statusLoading) return null

  const activeMessageWarnings = Object.values(messageWarning).filter((warning) => !warning.ignored)

  return (
    <Box sx={{ mb: 1 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 0.75,
          pl: 0.5,
          opacity: isNearBottom ? 1 : 0,
          pointerEvents: isNearBottom ? 'auto' : 'none',
          transition: 'opacity 0.2s ease',
        }}
      >
        <Typography
          sx={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'text.disabled',
            userSelect: 'none',
          }}
        >
          {t('sidebar:modelTitle')}
        </Typography>
        <ModelSelector currentModel={currentModel} setModel={setModel} isTokenLimitExceeded={isTokenLimitExceeded} />
      </Box>
      <Box
        sx={{
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '1.25rem',
          padding: isMobile ? '0.2rem 0.2rem' : '0.5rem 1rem',
          backdropFilter: 'blur(5px)',
          boxShadow: 3,
        }}
      >
        {fileTypeAlertOpen && (
          <Alert severity="warning">
            <Typography>{`File of type "${disallowedFileType}" not supported currently`}</Typography>
            <Typography>{`Currenlty there is support for formats ".pdf" and plain text such as ".txt", ".csv", and ".md"`}</Typography>
          </Alert>
        )}
        {activeMessageWarnings.length > 0 && (
          <Alert
            severity="warning"
            sx={{ my: '0.2rem' }}
            action={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <GrayButton onClick={handleCancel} type="button">
                  {t('common:cancel')}
                </GrayButton>
                <BlueButton onClick={() => handleContinue('', Object.keys(messageWarning) as WarningType[])} color="primary" type="button">
                  {t('common:continue')}
                </BlueButton>
              </Box>
            }
          >
            {Object.entries(messageWarning)
              .filter(([, warning]) => !warning.ignored)
              .map(([type, warning]) => (
                <Box key={type} sx={{ mb: 0.5 }}>
                  {warning.message}
                </Box>
              ))}
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={onSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (!isShiftEnterSend) {
                if (e.shiftKey) {
                  // Do nothing with this event, it will result in a newline being inserted
                } else {
                  onSubmit(e)
                }
              } else if (e.shiftKey) {
                onSubmit(e)
              }
            }
          }}
        >
          <Box>
            <TextField
              autoFocus={!isEmbedded}
              inputRef={textFieldRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('chat:writeHere')}
              fullWidth
              multiline
              data-sentry-mask
              maxRows={25}
              sx={{ padding: '0.5rem' }}
              variant="standard"
              slotProps={{
                htmlInput: {
                  'data-testid': 'chat-input',
                },
                input: {
                  disableUnderline: true,
                },
              }}
            />
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mt: '0.5rem',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Tooltip title={t('chat:attachFile')} arrow placement="top">
                  <IconButton component="label">
                    <AttachFileIcon />
                    <input
                      type="file"
                      accept="*"
                      hidden
                      ref={fileInputRef}
                      onChange={(e) => e.target.files?.[0] && handleFileTypeValidation(e.target.files[0])}
                    />
                  </IconButton>
                </Tooltip>
                {fileName && <Chip sx={{ borderRadius: 100 }} label={fileName} onDelete={handleDeleteFile} />}
                <Box sx={{ display: 'inline-flex', justifyContent: 'space-between', alignItems: 'center', ml: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        whiteSpace: 'nowrap',
                        padding: '0.5rem 0',
                        opacity: isTokenLimitExceeded ? 1 : 0.6,
                        color: isTokenLimitExceeded ? 'error.main' : 'inherit',
                      }}
                    >
                      {userStatus?.usage != null && userStatus?.limit != null
                        ? `${Math.round((userStatus.usage / userStatus.limit) * 100)}% ${t('status:tokensUsed')}`
                        : '-'}
                    </Typography>
                    <Tooltip
                      arrow
                      placement="top"
                      title={
                        <Typography variant="body2" sx={{ p: 1 }}>
                          {t('info:usage')}
                        </Typography>
                      }
                    >
                      <HelpOutline fontSize="small" sx={{ color: 'inherit', opacity: 0.7, mt: 0.5, flex: 2, display: { xs: 'none', sm: 'block' } }} />
                    </Tooltip>
                  </Box>
                </Box>
              </Box>
              {!isMobile && (
                <Typography
                  sx={{
                    display: !acuallyDisabled ? { sm: 'none', md: 'block' } : 'none',
                    ml: 'auto',
                    mr: 1,
                    transition: 'opacity 0.2s ease-in-out',
                    fontSize: '14px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  color="textSecondary"
                >
                  {isShiftEnterSend ? <ShiftEnterToSend t={t} /> : <ShiftEnterForNewline t={t} />}
                </Typography>
              )}

              <Tooltip title={disabled ? t('chat:cancelResponse') : isShiftEnterSend ? t('chat:shiftEnterSend') : t('chat:enterSend')} arrow placement="top">
                {disabled ? (
                  <IconButton onClick={handleStop}>
                    <StopIcon />
                  </IconButton>
                ) : (
                  <IconButton
                    type="submit"
                    ref={sendButtonRef}
                    data-testid="send-chat-message"
                    disabled={acuallyDisabled}
                    sx={{
                      backgroundColor: acuallyDisabled ? 'action.disabledBackground' : amber[700],
                      color: acuallyDisabled ? 'action.disabled' : '#fff',
                      borderRadius: '0.5rem',
                      width: 36,
                      height: 36,
                      transition: 'background-color 0.18s, transform 0.1s, filter 0.1s',
                      '&:hover': {
                        backgroundColor: acuallyDisabled ? 'action.disabledBackground' : amber[800],
                        transform: acuallyDisabled ? 'none' : 'scale(1.06)',
                      },
                      '&.Mui-disabled': {
                        color: 'action.disabled',
                      },
                    }}
                  >
                    <Send sx={{ fontSize: 18 }} />
                  </IconButton>
                )}
              </Tooltip>
              <SendPreferenceConfiguratorModal
                open={sendPreferenceConfiguratorOpen}
                onClose={() => setSendPreferenceConfiguratorOpen(false)}
                anchorEl={sendButtonRef.current}
                context="chat"
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
