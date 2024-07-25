import React, { useState } from 'react'
import { Box, Button, Stack, TextField, Typography } from '@mui/material'
import { enqueueSnackbar } from 'notistack'
import useInfoTexts from '../../hooks/useInfoTexts'
import { InfoText } from '../../types'
import { useEditInfoTextMutation } from '../../hooks/useInfoTextMutation'

const Text = ({ info }: { info: InfoText }) => {
  if (!info) return null

  const [isEditing, setIsEditing] = useState(false)

  const [fi, setFi] = useState(info.text.fi)
  const [sv, setSv] = useState(info.text.sv)
  const [en, setEn] = useState(info.text.en)

  const mutation = useEditInfoTextMutation()

  const handleSave = () => {
    try {
      mutation.mutate({
        ...info,
        text: { fi, sv, en },
      })
      setIsEditing(false)
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
            <TextField
              defaultValue={info.text.fi}
              multiline
              onChange={(e) => setFi(e.target.value)}
            />
            <Typography variant="h6">SV</Typography>
            <TextField
              defaultValue={info.text.sv}
              multiline
              onChange={(e) => setSv(e.target.value)}
            />
            <Typography variant="h6">EN</Typography>
            <TextField
              defaultValue={info.text.en}
              multiline
              onChange={(e) => setEn(e.target.value)}
            />
          </Stack>
          <Button
            onClick={() => handleSave()}
            variant="outlined"
            sx={{ mr: 2 }}
          >
            Tallenna
          </Button>
        </>
      ) : (
        <Box margin={1}>{info.text.fi}</Box>
      )}
      <Button onClick={() => setIsEditing(!isEditing)} variant="outlined">
        {isEditing ? 'Peruuta' : 'Muokkaa'}
      </Button>
    </Box>
  )
}

const EditTexts = () => {
  const { infoTexts, isLoading } = useInfoTexts()
  if (isLoading) return null

  return (
    <Box>
      {infoTexts.map((info) => (
        <Text info={info} key={info.id} />
      ))}
    </Box>
  )
}

export default EditTexts
