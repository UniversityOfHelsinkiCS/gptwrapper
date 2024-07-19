import React, { useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  Tooltip,
  TextField,
  Stack,
} from '@mui/material'
import {
  ExpandLess,
  ExpandMore,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

import { enqueueSnackbar } from 'notistack'
import { Prompt as PromptType, SetState } from '../../../types'
import { Response } from '../../Chat/Conversation'
import SystemMessage from '../../Chat/SystemMessage'
import { useEditPromptMutation } from '../../../hooks/usePromptMutation'

const ExpandButton = ({
  expand,
  setExpand,
}: {
  expand: boolean
  setExpand: SetState<boolean>
}) => (
  <Button onClick={() => setExpand(!expand)}>
    {expand ? <ExpandLess /> : <ExpandMore />}
  </Button>
)

const Prompt = ({
  prompt,
  handleDelete,
}: {
  prompt: PromptType
  handleDelete: (promptId: string) => void
}) => {
  const { t } = useTranslation()
  const mutation = useEditPromptMutation()

  const { id, name, systemMessage, messages, hidden } = prompt

  const [expand, setExpand] = useState(false)
  const [editPrompt, setEditPrompt] = useState(false)
  const [message, setMessage] = useState(systemMessage)
  const [updatedName, setUpdatedName] = useState(name)

  const handleSave = () => {
    const updatedPrompt = {
      ...prompt,
      systemMessage: message,
      name: updatedName,
    }

    try {
      mutation.mutate(updatedPrompt)
      setEditPrompt(false)
      enqueueSnackbar('Prompt updated', { variant: 'success' })
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' })
    }
  }

  return (
    <Box key={id} pt={2}>
      <Paper variant="outlined" sx={{ padding: '2%' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Box display="inline" mr={2}>
              {hidden ? (
                <Tooltip title={t('hiddenPromptInfo')}>
                  <VisibilityOff />
                </Tooltip>
              ) : (
                <Tooltip title={t('visiblePromptInfo')}>
                  <Visibility />
                </Tooltip>
              )}
            </Box>
            {!editPrompt ? (
              <Typography variant="h6" display="inline">
                {name}
              </Typography>
            ) : (
              <TextField
                defaultValue={updatedName}
                sx={{ width: '650px' }}
                onChange={(e) => setUpdatedName(e.target.value)}
              />
            )}
          </Box>
          <Box>
            <Button onClick={() => handleDelete(prompt.id)} color="error">
              {t('common:delete')}
            </Button>
            <ExpandButton expand={expand} setExpand={setExpand} />
          </Box>
        </Box>

        {expand && (
          <Box mt={2}>
            {!editPrompt ? (
              <>
                <Box width="80%">
                  <SystemMessage
                    system={systemMessage}
                    setSystem={() => {}}
                    showInfo={false}
                    disabled
                  />
                </Box>
                <Box>
                  {messages.map(({ role, content }) => (
                    <Response key={content} role={role} content={content} />
                  ))}
                </Box>
              </>
            ) : (
              <TextField
                defaultValue={systemMessage}
                sx={{ width: '80%' }}
                multiline
                onChange={(e) => setMessage(e.target.value)}
              />
            )}
            <Stack direction="row" spacing={2} marginTop={2}>
              {editPrompt && (
                <Button onClick={handleSave} variant="outlined">
                  {t('common:save')}
                </Button>
              )}
              <Button
                variant="outlined"
                onClick={() => setEditPrompt(!editPrompt)}
              >
                {editPrompt ? t('common:cancel') : t('common:edit')}
              </Button>
            </Stack>
          </Box>
        )}
      </Paper>
    </Box>
  )
}

export default Prompt