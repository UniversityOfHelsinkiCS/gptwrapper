import React from 'react'
import { Send } from '@mui/icons-material'
import StopIcon from '@mui/icons-material/Stop'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import { Box, Chip, IconButton, TextField, Tooltip, Typography } from '@mui/material'
import { useState, useRef } from 'react'
import useUserStatus from '../../hooks/useUserStatus'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ModelSelector from './ModelSelector'

export const ChatBox = ({
  disabled,
  currentModel,
  fileInputRef,
  fileName,
  availableModels,
  setDisallowedFileType,
  setAlertOpen,
  setFileName,
  setModel,
  onSubmit,
}: {
  disabled: boolean
  currentModel: string
  fileInputRef: React.RefObject<HTMLInputElement>
  fileName: string
  availableModels: string[]
  setDisallowedFileType: React.Dispatch<string>
  setAlertOpen: React.Dispatch<boolean>
  setFileName: (name: string) => void
  setModel: (model: string) => void
  onSubmit: (message: string) => void
}) => {
  const { courseId } = useParams()
  const { userStatus, isLoading: statusLoading, refetch: refetchStatus } = useUserStatus(courseId)
  const [message, setMessage] = useState<string>('')

  const textFieldRef = useRef<HTMLInputElement>(null)

  const { t, i18n } = useTranslation()

  const handleDeleteFile = () => {
    fileInputRef.current.value = null
    setFileName('')
  }

  const handleFileTypeValidation = (file: File): void => {
    const allowedFileTypes = ['text/plain', 'text/html', 'text/css', 'text/csv', 'text/markdown', 'application/pdf']

    if (allowedFileTypes.includes(file.type)) {
      setFileName(file.name)
    } else {
      setDisallowedFileType(file.type)
      setAlertOpen(true)
      setTimeout(() => {
        setAlertOpen(false)
      }, 5000)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // This is here to prevent the form from submitting but because disabling it in the component breaks re-focusing on the text field
    if (disabled) return

    if (message.trim()) {
      onSubmit(message)
      setMessage('')
      refetchStatus()
    }

    if (textFieldRef.current) {
      textFieldRef.current.focus()
    }
  }

  if (statusLoading) {
    return <p>loading</p>
  }
  return (
    <Box>
      <Box
        component="form"
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault()
            handleSubmit(e)
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
            placeholder="Kirjoita viestisi tähän..."
            fullWidth
            multiline
            maxRows={25}
            sx={{ padding: '0.5rem' }}
            variant="standard"
            slotProps={{
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
              <IconButton component="label">
                <AttachFileIcon />
                <input type="file" accept="text/*,application/pdf" hidden ref={fileInputRef} onChange={(e) => handleFileTypeValidation(e.target.files[0])} />
              </IconButton>
              {fileName && <Chip sx={{ borderRadius: 100 }} label={fileName} onDelete={handleDeleteFile} />}
              <ModelSelector currentModel={currentModel} setModel={setModel} availableModels={availableModels} />
            </Box>

            {disabled ? (
              // Stop signal is currently not supported due to OpenAI response cancel endpoint not working properly.
              // Try implementing this in the fall 2025.
              <Tooltip title="Cancelling responses is currently not supported" arrow placement="top">
                <IconButton disabled={!disabled}>
                  <StopIcon />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="Or send on Shift + Enter" arrow placement="top">
                <IconButton disabled={disabled} type="submit">
                  <Send />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        <Box>
          <Typography variant="body1" style={{ padding: '1rem', opacity: 0.7 }}>
            {userStatus.usage} / {userStatus.limit} {t('status:tokensUsed')}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
