import { Box, Button, Stack, TextField, Typography } from '@mui/material'
import { enqueueSnackbar } from 'notistack'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useEditInfoTextMutation } from '../../hooks/useInfoTextMutation'
import useInfoTexts from '../../hooks/useInfoTexts'
import type { InfoText } from '../../types'

const Text = ({ info }: { info: InfoText }) => {
  const [isEditing, setIsEditing] = useState(false)

  const { t, i18n } = useTranslation()

  const [fi, setFi] = useState(info.text.fi)
  const [sv, setSv] = useState(info.text.sv)
  const [en, setEn] = useState(info.text.en)

  const mutation = useEditInfoTextMutation()

  const { language } = i18n

  const handleSave = () => {
    try {
      mutation.mutate({
        ...info,
        text: { fi, sv, en },
      })
      setIsEditing(false)
      enqueueSnackbar('saved', { variant: 'success' })
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' })
    }
  }

  return (
    <Box sx={{ my: 2 }}>
      <Typography variant="h6">{info.name}</Typography>
      {isEditing ? (
        <>
          <Stack gap={2} sx={{ my: 2 }}>
            <Typography variant="h6">FI</Typography>
            <TextField defaultValue={info.text.fi} multiline onChange={(e) => setFi(e.target.value)} />
            <Typography variant="h6">SV</Typography>
            <TextField defaultValue={info.text.sv} multiline onChange={(e) => setSv(e.target.value)} />
            <Typography variant="h6">EN</Typography>
            <TextField defaultValue={info.text.en} multiline onChange={(e) => setEn(e.target.value)} />
          </Stack>
          <Button onClick={() => handleSave()} variant="outlined" sx={{ mr: 2 }}>
            {t('common:save')}
          </Button>
        </>
      ) : (
        <Box margin={1}>{info.text[language]}</Box>
      )}
      <Button onClick={() => setIsEditing(!isEditing)} variant="outlined">
        {isEditing ? t('common:cancel') : t('common:edit')}
      </Button>
    </Box>
  )
}

const EditTexts = () => {
  const { infoTexts } = useInfoTexts()
  if (!infoTexts) {
    return null
  }

  return (
    <Box>
      {infoTexts.map((info) => (
        <Text info={info} key={info.id} />
      ))}
    </Box>
  )
}

export default EditTexts
