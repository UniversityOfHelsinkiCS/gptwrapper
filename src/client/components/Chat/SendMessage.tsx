/* eslint-disable no-param-reassign */
import React from 'react'
import { Box, TextField, Button, Typography } from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import DeleteIcon from '@mui/icons-material/Delete'
import { useTranslation } from 'react-i18next'

import { Set } from '../../types'
import useCurrentUser from '../../hooks/useCurrentUser'

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
}: {
  message: string
  setMessage: Set<string>
  handleSend: () => void
  handleReset: () => void
  disabled: boolean
  resetDisabled: boolean
  inputFileRef: React.RefObject<HTMLInputElement>
  fileName: string
  setFileName: Set<string>
}) => {
  const { t } = useTranslation()

  const handleDeleteFile = () => {
    inputFileRef.current.value = ''
    setFileName('')
  }

  const { user } = useCurrentUser()

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
      <Button
        component="label"
        variant="outlined"
        startIcon={<UploadFileIcon />}
        sx={{
          marginRight: '1rem',
          display: !user?.isAdmin ? 'none' : undefined,
        }}
      >
        {t('fileUploadText')}
        <input
          type="file"
          accept=".txt"
          hidden
          ref={inputFileRef}
          onChange={(e) => setFileName(e.target.files[0].name)}
        />
      </Button>
      {fileName && (
        <Button
          onClick={handleDeleteFile}
          endIcon={<DeleteIcon />}
          sx={{ marginRight: '1rem' }}
        >
          {fileName}
        </Button>
      )}
      <Button variant="contained" onClick={handleSend} disabled={disabled}>
        {t('send')}
      </Button>
      <Button
        sx={{ ml: 2 }}
        onClick={() => handleReset()}
        disabled={resetDisabled}
      >
        {t('reset')}
      </Button>
    </Box>
  )
}

export default SendMessage
