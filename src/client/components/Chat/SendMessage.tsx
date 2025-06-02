import React from 'react'
import { Box, TextField, Button, Typography, Switch, FormControlLabel, Alert } from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { useTranslation } from 'react-i18next'
import AttachmentButton from './AttachmentButton'

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
  saveChat,
  saveConsent,
  setSaveConsent,
  notOptoutSaving,
}: {
  message: string
  setMessage: SetState<string>
  handleSend: (userConsent: boolean, saveConsent: boolean) => void
  handleReset: () => void
  disabled: boolean
  resetDisabled: boolean
  inputFileRef: React.RefObject<HTMLInputElement>
  fileName: string
  setFileName: (name: string) => void
  setDisallowedFileType: React.Dispatch<string>
  setAlertOpen: React.Dispatch<boolean>
  saveConsent: boolean
  setSaveConsent: React.Dispatch<boolean>
  saveChat: boolean
  notOptoutSaving: boolean
}) => {
  const { t } = useTranslation()

  const handleDeleteFile = () => {
    inputFileRef.current.value = ''
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
      }, 6000)
    }
  }
  const handleOnClick = () => {
    handleSend(false, saveConsent)
  }
  return (
    <Box mb={2}>
      <Box mb={1}>
        <Typography variant="h6">{t('chat:message')}</Typography>
      </Box>
      <Box mb={2}>
        <TextField fullWidth multiline minRows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t('chat:messagePlaceholder') as string} />
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
        <Button variant="contained" onClick={handleOnClick} disabled={disabled}>
          {t('send')}
        </Button>
        <Button component="label" variant="text" startIcon={<UploadFileIcon />}>
          {t('fileUploadText')}
          <input type="file" accept="text/*,application/pdf" hidden ref={inputFileRef} onChange={(e) => handleFileTypeValidation(e.target.files[0])} />
        </Button>
        {fileName && <AttachmentButton fileName={fileName} handleDeleteFile={handleDeleteFile} />}
        <Button onClick={() => handleReset()} disabled={resetDisabled}>
          {t('reset')}
        </Button>
        {!notOptoutSaving && saveChat && (
          <FormControlLabel control={<Switch onChange={() => setSaveConsent(!saveConsent)} checked={saveConsent} />} label={t('chat:allowSave')} />
        )}
        {notOptoutSaving && saveChat && (
          <Alert severity="warning" style={{ marginLeft: 20 }}>
            <Typography>{t('chat:toBeSaved')}</Typography>
          </Alert>
        )}
      </Box>
    </Box>
  )
}

export default SendMessage
