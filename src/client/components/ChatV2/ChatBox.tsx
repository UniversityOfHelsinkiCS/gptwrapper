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
import { BlueButton, GrayButton, OutlineButtonBlack } from './generics/Buttons'
import { useIsEmbedded } from '../../contexts/EmbeddedContext'

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
}) => {
  const { courseId } = useParams()
  const isEmbedded = useIsEmbedded()
  const { userStatus, isLoading: statusLoading, refetch: refetchStatus } = useUserStatus(courseId)

  const [isTokenLimitExceeded, setIsTokenLimitExceeded] = useState<boolean>(false)
  const [disallowedFileType, setDisallowedFileType] = useState<string>('')
  const [fileTypeAlertOpen, setFileTypeAlertOpen] = useState<boolean>(false)
  const [message, setMessage] = useState<string>('')

  const textFieldRef = useRef<HTMLInputElement>(null)

  const { t } = useTranslation()

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
    if (disabled) return

    if (message.trim()) {
      handleSubmit(message)
      setMessage('')
      refetchStatus()
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
          if (e.key === 'Enter' && e.shiftKey) {
            onSubmit(e)
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
            ref={textFieldRef}
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
              input: {
                disableUnderline: true,
                id: 'chat-input',
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
              <Tooltip title={t('chat:emptyConversation')} arrow placement="top">
                <IconButton onClick={handleReset}>
                  <RestartAltIcon />
                </IconButton>
              </Tooltip>
              {fileName && <Chip sx={{ borderRadius: 100 }} label={fileName} onDelete={handleDeleteFile} />}
              {!isEmbedded && (
                <ModelSelector currentModel={currentModel} setModel={setModel} availableModels={availableModels} isTokenLimitExceeded={isTokenLimitExceeded} />
              )}
            </Box>

            {disabled ? (
              // Stop signal is currently not supported due to OpenAI response cancel endpoint not working properly.
              // Try implementing this in the fall 2025.
              <Tooltip title={t('chat:cancelResponse')} arrow placement="top">
                <IconButton disabled={!disabled}>
                  <StopIcon />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title={t('chat:shiftEnter')} arrow placement="top">
                <IconButton disabled={disabled} type="submit">
                  <Send />
                </IconButton>
              </Tooltip>
            )}
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

          <Tooltip
            arrow
            placement="top"
            title={
              <Typography variant="body2" sx={{ p: 1 }}>
                {t('chat:settings')}
              </Typography>
            }
          >
            <OutlineButtonBlack sx={{ display: { xs: 'block', lg: 'none' } }} onClick={() => setChatLeftSidePanelOpen(true)} id="left-panel-open">
              <SettingsIcon sx={{ color: 'rgba(0, 0, 0, 0.7)' }} />
            </OutlineButtonBlack>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  )
}
