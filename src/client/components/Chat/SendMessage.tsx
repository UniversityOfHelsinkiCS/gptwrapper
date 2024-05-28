/* eslint-disable no-param-reassign */
import React from 'react'
import { Box, TextField, Button, Typography } from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import DeleteIcon from '@mui/icons-material/Delete'
import { useTranslation } from 'react-i18next'

import { SetState } from '../../types'

const SendMessage = ({
  message,
  setMessage,
  handleSend,
  handleReset,
  disabled,
  resetDisabled,
  inputFileRef,
  fileName,
  setFileName,
  setDisallowedFileType,
  setAlertOpen,
}: {
  message: string
  setMessage: SetState<string>
  handleSend: () => void
  handleReset: () => void
  disabled: boolean
  resetDisabled: boolean
  inputFileRef: React.RefObject<HTMLInputElement>
  fileName: string
  setFileName: (name: string) => void
  setDisallowedFileType: React.Dispatch<string>
  setAlertOpen: React.Dispatch<boolean>
}) => {
  const { t } = useTranslation()

  const handleDeleteFile = () => {
    inputFileRef.current.value = ''
    setFileName('')
  }

  const handleFileTypeValidation = (file: File): void => {
    const allowedFileTypes = [
      'text/plain',
      'text/html',
      'text/css',
      'text/csv',
      'text/markdown',
      'application/pdf',
    ]

    if (allowedFileTypes.includes(file.type)) {
      setFileName(file.name)
    } else {
      setDisallowedFileType(file.type)
      setAlertOpen(true)
      setTimeout(() => {
        setAlertOpen(false)
      }, 6000)
    }
  }

  return (
    <Box mb={2}>
      <Box mb={1}>
        <Typography variant="h6">{t('chat:message')}</Typography>
      </Box>
      <Box mb={2}>
        <TextField
          fullWidth
          multiline
          minRows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('chat:messagePlaceholder') as string}
        />
      </Box>
      <Box
        sx={(theme) => ({
          display: 'flex',
          flexDirection: 'row',
          [theme.breakpoints.down('sm')]: {
            flexDirection: 'column',
          },
          gap: 1,
        })}
      >
        {fileName && (
          <Button onClick={handleDeleteFile} endIcon={<DeleteIcon />}>
            {fileName}
          </Button>
        )}
        <Button variant="contained" onClick={handleSend} disabled={disabled}>
          {t('send')}
        </Button>
        <Button component="label" variant="text" startIcon={<UploadFileIcon />}>
          {t('fileUploadText')}
          <input
            type="file"
            accept="^(test\/.*|application\/pdf)$"
            hidden
            ref={inputFileRef}
            onChange={(e) => handleFileTypeValidation(e.target.files[0])}
          />
        </Button>
        <Button onClick={() => handleReset()} disabled={resetDisabled}>
          {t('reset')}
        </Button>
      </Box>
    </Box>
  )
}

export default SendMessage
