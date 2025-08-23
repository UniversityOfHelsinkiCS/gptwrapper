import React, { useEffect, useState } from 'react'
import { HelpOutline, Send } from '@mui/icons-material'
import StopIcon from '@mui/icons-material/Stop'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import SettingsIcon from '@mui/icons-material/Settings'
import { Box, Chip, IconButton, TextField, Tooltip, Typography, FormControlLabel, Switch, Alert } from '@mui/material'
import CircularProgress from '@mui/material/CircularProgress'
import { useRef } from 'react'
import useUserStatus from '../../hooks/useUserStatus'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ModelSelector from './ModelSelector'
import { BlueButton, GrayButton, OutlineButtonBlack } from './general/Buttons'
import { useIsEmbedded } from '../../contexts/EmbeddedContext'
import useCurrentUser from '../../hooks/useCurrentUser'
import { SendPreferenceConfiguratorModal, ShiftEnterForNewline, ShiftEnterToSend } from './SendPreferenceConfigurator'
import { KeyCombinations, useKeyboardCommands } from './useKeyboardCommands'

export const ChatBox = ({
  disabled,
  currentModel,
  fileInputRef,
  fileName,
  availableModels,
  tokenUsageWarning,
  tokenUsageAlertOpen,
  saveConsent,
  setSaveConsent,
  setChatLeftSidePanelOpen,
  chatLeftSidePanelOpen,
  saveChat,
  notOptoutSaving,
  setFileName,
  setModel,
  handleCancel,
  handleContinue,
  handleSubmit,
  handleReset,
  isMobile,
}: {
  disabled: boolean
  currentModel: string
  fileInputRef: React.RefObject<HTMLInputElement>
  fileName: string
  availableModels: string[]
  tokenUsageWarning: string
  tokenUsageAlertOpen: boolean
  saveConsent: boolean
  setSaveConsent: React.Dispatch<boolean>
  setChatLeftSidePanelOpen: (open: boolean) => void
  chatLeftSidePanelOpen: boolean
  saveChat: boolean
  notOptoutSaving: boolean
  setFileName: (name: string) => void
  setModel: (model: string) => void
  handleCancel: () => void
  handleContinue: (message: string) => void
  handleSubmit: (message: string) => void
  handleReset: () => void
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

  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState<boolean>(false)
  useKeyboardCommands({
    resetChat: handleReset,
    openModelSelector: () => {
      setIsModelSelectorOpen(true)
    },
  }) // @todo what key combination to open model selector

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

    // This is here to prevent the form from submitting on disabled.
    // It is done this way instead of explicitely disabling the textfield
    // so that it doesnt break the re-focus back on the text field after message is send
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

  if (statusLoading) {
    return (
      <Box sx={{ display: 'flex' }}>
        <CircularProgress />
      </Box>
    )
  }
  return (
    <Box
      sx={{
        background: 'white',
        borderTopRightRadius: '0.3rem',
        borderTopLeftRadius: '0.3rem',
      }}
    >
      {fileTypeAlertOpen && (
        <Alert severity="warning">
          <Typography>{`File of type "${disallowedFileType}" not supported currently`}</Typography>
          <Typography>{`Currenlty there is support for formats ".pdf" and plain text such as ".txt", ".csv", and ".md"`}</Typography>
        </Alert>
      )}
      {tokenUsageAlertOpen && (
        <Alert
          severity="warning"
          sx={{ my: '0.2rem' }}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <GrayButton onClick={handleCancel} type="button">
                {t('common:cancel')}
              </GrayButton>
              <BlueButton onClick={() => handleContinue(message)} color="primary" type="button">
                {t('common:continue')}
              </BlueButton>
            </Box>
          }
        >
          {tokenUsageWarning}
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
        <Box
          sx={{
            border: '1px solid rgba(0,0,0,0.3)',
            borderRadius: '0.3rem',
            padding: '0.5rem 1rem',
          }}
        >
          <TextField
            inputRef={textFieldRef}
            autoFocus
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
            <Box>
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
                <IconButton onClick={handleReset}>
                  <RestartAltIcon />
                </IconButton>
              </Tooltip>
              {fileName && <Chip sx={{ borderRadius: 100 }} label={fileName} onDelete={handleDeleteFile} />}
              {!isEmbedded && (
                <ModelSelector
                  currentModel={currentModel}
                  setModel={setModel}
                  availableModels={availableModels}
                  isTokenLimitExceeded={isTokenLimitExceeded}
                  isOpen={isModelSelectorOpen}
                  setIsOpen={(open) => {
                    setIsModelSelectorOpen(open)
                    if (!open) {
                      setTimeout(() => textFieldRef.current?.focus(), 0) // setTimeout required here...
                    }
                  }}
                />
              )}
            </Box>

            <Tooltip title={disabled ? t('chat:cancelResponse') : isShiftEnterSend ? t('chat:shiftEnterSend') : t('chat:enterSend')} arrow placement="top">
              <IconButton type={disabled ? 'button' : 'submit'} ref={sendButtonRef}>
                {disabled ? <StopIcon /> : <Send />}
              </IconButton>
            </Tooltip>
            <SendPreferenceConfiguratorModal
              open={sendPreferenceConfiguratorOpen}
              onClose={() => setSendPreferenceConfiguratorOpen(false)}
              anchorEl={sendButtonRef.current}
              context="chat"
            />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="body1"
              sx={{ padding: '0.5rem 0', opacity: isTokenLimitExceeded ? 1 : 0.7, color: isTokenLimitExceeded ? '#cc0000' : 'inherit' }}
            >
              {userStatus?.usage ?? '-'} / {userStatus?.limit ?? '-'} {t('status:tokensUsed')}
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

          {!isMobile && (
            <Typography
              sx={{
                display: { sm: 'none', md: 'block' },
                ml: 'auto',
                opacity: acuallyDisabled ? 0 : 1,
                transition: 'opacity 0.2s ease-in-out',
                fontSize: '14px',
              }}
              variant="body1"
              color="textSecondary"
            >
              {isShiftEnterSend ? <ShiftEnterToSend t={t} /> : <ShiftEnterForNewline t={t} />}
            </Typography>
          )}

          {!isEmbedded && (
            <Tooltip
              arrow
              placement="top"
              title={
                <Typography variant="body2" sx={{ p: 1 }}>
                  {t('chat:settings')}
                </Typography>
              }
            >
              <OutlineButtonBlack sx={{ display: { sm: 'block', md: 'none' } }} onClick={() => setChatLeftSidePanelOpen(true)} data-testid="left-panel-open">
                <SettingsIcon sx={{ color: 'rgba(0, 0, 0, 0.7)' }} />
              </OutlineButtonBlack>
            </Tooltip>
          )}
        </Box>
      </Box>
    </Box>
  )
}
