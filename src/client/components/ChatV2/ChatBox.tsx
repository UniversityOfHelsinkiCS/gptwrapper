import React, { useEffect, useState } from 'react'
import HelpOutline from '@mui/icons-material/HelpOutline'
import Send from '@mui/icons-material/Send'
import StopIcon from '@mui/icons-material/Stop'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import { Box, Chip, IconButton, TextField, Tooltip, Typography, Alert } from '@mui/material'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import { useRef } from 'react'
import useUserStatus from '../../hooks/useUserStatus'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BlueButton, GrayButton } from './general/Buttons'
import { useIsEmbedded } from '../../contexts/EmbeddedContext'
import useCurrentUser from '../../hooks/useCurrentUser'
import { SendPreferenceConfiguratorModal, ShiftEnterForNewline, ShiftEnterToSend } from '../Settings/SendPreferenceConfigurator'
import { KeyCombinations, useKeyboardCommands } from './useKeyboardCommands'
import { WarningType } from '@shared/aiApi'

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
    if (!file.type.startsWith('text/') && file.type !== 'application/pdf') {
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
    <Box
      sx={{
        background: 'white',
        mb: 1,
        border: '1px solid rgba(0,0,0,0.3)',
        borderRadius: '1.25rem',
        padding: isMobile ? '0.2rem 0.2rem' : '0.5rem 1rem',
        backdropFilter: 'blur(5px)',
      }}
    >
      {fileTypeAlertOpen && (
        <Alert severity="warning">
          <Typography>{`File of type "${disallowedFileType}" not supported currently`}</Typography>
          <Typography>{`Currenlty there is support for formats ".pdf" and plain text such as ".txt", ".csv", and ".md"`}</Typography>
        </Alert>
      )}
      {
        activeMessageWarnings.length > 0 && (
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
        )
      }

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
              <Tooltip title={t('chat:emptyConversationTooltip', { hint: KeyCombinations.RESET_CHAT?.hint })} arrow placement="top">
                <IconButton data-testid="clear-conversation-button" onClick={handleReset}>
                  <RestartAltIcon />
                </IconButton>
              </Tooltip>
              {fileName && <Chip sx={{ borderRadius: 100 }} label={fileName} onDelete={handleDeleteFile} />}
              <Box sx={{ display: 'inline-flex', justifyContent: 'space-between', alignItems: 'center', ml: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{ whiteSpace: 'nowrap', padding: '0.5rem 0', opacity: isTokenLimitExceeded ? 1 : 0.6, color: isTokenLimitExceeded ? '#cc0000' : 'inherit' }}
                  >
                    {userStatus?.usage ?? '-'} / {userStatus?.limit ?? '-'} {!isMobile && (t('status:tokensUsed'))}
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
                  display: { sm: 'none', md: 'block' },
                  ml: 'auto',
                  mr: '1rem',
                  opacity: acuallyDisabled ? 0 : 1,
                  transition: 'opacity 0.2s ease-in-out',
                  fontSize: '14px',
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
                <IconButton type='submit' ref={sendButtonRef} data-testid="send-chat-message">
                  <Send />
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
    </Box >
  )
}
