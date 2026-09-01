import React, { useEffect, useState } from 'react'
import Send from '@mui/icons-material/Send'
import StopIcon from '@mui/icons-material/Stop'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import { Box, Chip, IconButton, TextField, Tooltip, Typography, Alert } from '@mui/material'
import { visuallyHidden } from '@mui/utils'
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
import UsageSelector from './UsageSelector'
import { DEFAULT_TOKEN_LIMIT, ValidModelName } from '../../../config'
import { Course } from 'src/client/types'
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat'

const skipLinkSx = {
  ...visuallyHidden,
  zIndex: 1300,
  '&:focus-visible': {
    position: 'fixed',
    top: '1rem',
    right: '1rem',
    width: 'auto',
    height: 'auto',
    bgcolor: 'primary.main',
    borderRadius: '0.5rem',
    p: 1,
    color: 'white',
    margin: 0,
    overflow: 'visible',
    clip: 'auto',
    clipPath: 'none',
    whiteSpace: 'normal',
    transform: 'translateY(-100%)',
    '&:focus': {
      transform: 'translateY(0)',
      outline: '2px solid #fff',
    },
  },
}

export const ChatBox = ({
  disabled,
  chatInstance,
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
  isNewResponseAvailable,
  onGoToLatestResponse,
}: {
  disabled: boolean
  chatInstance?: Course
  fileInputRef: React.RefObject<HTMLInputElement | null>
  fileName: string
  messageWarning: { [key in WarningType]?: { message: string; ignored: boolean; tokenCount?: number; contextLimit?: number; tokenUsagePercentage?: number } }
  setFileName: (name: string) => void
  handleCancel: (reason: 'canceled' | 'error') => void
  handleContinue: (message: string, ignoredWarnings: WarningType[]) => void
  handleSubmit: (message: string) => void
  handleReset: () => void
  handleStop: () => void
  isMobile: boolean
  currentModel: ValidModelName
  setModel: (model: ValidModelName) => void
  isNewResponseAvailable: boolean
  onGoToLatestResponse: () => void
}) => {
  const { courseId } = useParams()
  const isEmbedded = useIsEmbedded()
  const { user } = useCurrentUser()
  const { userStatus, isLoading: statusLoading, refetch: refetchStatus } = useUserStatus(courseId)

  const [isTokenLimitExceeded, setIsTokenLimitExceeded] = useState<boolean>(false)
  const [disallowedFileType, setDisallowedFileType] = useState<string>('')
  const [fileTypeAlertOpen, setFileTypeAlertOpen] = useState<boolean>(false)
  const [sendPreferenceConfiguratorOpen, setSendPreferenceConfiguratorOpen] = useState<boolean>(false)
  const sendButtonRef = useRef<HTMLButtonElement>(null)
  const textFieldRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string>('')
  const amongResponsibles = user?.isAdmin || chatInstance?.responsibilities.some((r) => r.user.id === user?.id)

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
    const limit = !chatInstance?.activated && amongResponsibles ? DEFAULT_TOKEN_LIMIT : userStatus.limit
    setIsTokenLimitExceeded(userStatus.usage > limit)
  }, [statusLoading, userStatus])

  const activeMessageWarnings = Object.values(messageWarning).filter((warning) => !warning.ignored)

  return (
    <Box sx={{ mb: 1 }}>
      <Box sx={{ mb: 0.75, px: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
        <ModelSelector currentModel={currentModel} setModel={setModel} isTokenLimitExceeded={isTokenLimitExceeded} />
        <UsageSelector />
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
                <GrayButton autoFocus={activeMessageWarnings.length > 0} onClick={() => handleCancel('canceled')} type="button">
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
                <Box key={type} sx={{ mb: 0.5, flexDirection: 'row', display: 'flex', gap: 1 }}>
                  {type === 'usage' && 'tokenUsagePercentage' in warning ? (
                    <Typography variant="body2" color="textSecondary">
                      {t('chat:usageWarning', { tokenUsagePercentage: warning.tokenUsagePercentage })}
                    </Typography>
                  ) : type === 'contextLimit' && 'tokenCount' in warning && 'contextLimit' in warning ? (
                    <Typography variant="body2" color="textSecondary">
                      {t('chat:contextLimitWarning', { tokenCount: warning.tokenCount, contextLimit: warning.contextLimit })}
                    </Typography>
                  ) : (
                    <>
                      {type === 'fileParsingError' && (
                        <Typography variant="body2" color="textSecondary">
                          {t('error:fileParsingError')}:
                        </Typography>
                      )}
                      <Typography variant="body2" color="textSecondary">
                        {warning.message}
                      </Typography>
                    </>
                  )}
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
              id="chat-input"
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
            {isNewResponseAvailable && acuallyDisabled && (
              <Tooltip title={t('chat:goToLatestResponse')} arrow placement="right">
                <IconButton component="button" type="button" onClick={onGoToLatestResponse} sx={skipLinkSx}>
                  <TrendingFlatIcon />
                </IconButton>
              </Tooltip>
            )}

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
                  <span>
                    <IconButton
                      type="submit"
                      aria-label={t('common:send')}
                      ref={sendButtonRef}
                      data-testid="send-chat-message"
                      disabled={acuallyDisabled}
                      sx={{
                        backgroundColor: acuallyDisabled ? 'action.disabledBackground' : 'primary.main',
                        color: acuallyDisabled ? 'action.disabled' : '#fff',
                        borderRadius: '0.5rem',
                        width: 36,
                        height: 36,
                        transition: 'background-color 0.18s, transform 0.1s, filter 0.1s',
                        '&:hover': {
                          backgroundColor: acuallyDisabled ? 'action.disabledBackground' : 'primary.main',
                          transform: acuallyDisabled ? 'none' : 'scale(1.06)',
                        },
                        '&.Mui-disabled': {
                          color: 'action.disabled',
                        },
                      }}
                    >
                      <Send sx={{ fontSize: 18 }} />
                    </IconButton>
                  </span>
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
