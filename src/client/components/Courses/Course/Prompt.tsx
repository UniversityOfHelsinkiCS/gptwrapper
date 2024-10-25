import { useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  Tooltip,
  TextField,
  Stack,
  FormControlLabel,
  Checkbox,
} from '@mui/material'
import {
  ExpandLess,
  ExpandMore,
  Visibility,
  VisibilityOff,
  PriorityHigh,
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
  mandatoryPromptId,
}: {
  prompt: PromptType
  handleDelete: (promptId: string) => void
  mandatoryPromptId: string
}) => {
  const { t } = useTranslation()
  const mutation = useEditPromptMutation()

  const { id, name, systemMessage, messages, hidden, mandatory } = prompt

  const [expand, setExpand] = useState(false)
  const [editPrompt, setEditPrompt] = useState(false)
  const [message, setMessage] = useState(systemMessage)
  const [updatedName, setUpdatedName] = useState(name)
  const [updatedHidden, setUpdatedHidden] = useState(hidden)
  const [updatedMandatory, setUpdatedMandatory] = useState(mandatory)

  const handleSave = () => {
    const updatedPrompt = {
      ...prompt,
      systemMessage: message,
      name: updatedName,
      hidden: updatedHidden,
      mandatory: updatedMandatory,
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
            {mandatory && (
              <Box display="inline" mr={2}>
                <Tooltip title="Alustus on pakollinen opiskelijoille">
                  <PriorityHigh />
                </Tooltip>
              </Box>
            )}
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
                  {messages.map(({ role, content }, index) => (
                    <Response
                      key={content}
                      role={role}
                      content={content}
                      id={`message-${index}`}
                    />
                  ))}
                </Box>
              </>
            ) : (
              <>
                <TextField
                  defaultValue={systemMessage}
                  sx={{ width: '80%' }}
                  multiline
                  onChange={(e) => setMessage(e.target.value)}
                />
                {!mandatoryPromptId || mandatoryPromptId === prompt.id ? (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={updatedMandatory}
                        onChange={() => setUpdatedMandatory((prev) => !prev)}
                      />
                    }
                    label="Tee alustuksesta pakollinen opiskelijoille"
                    sx={{ mr: 5 }}
                  />
                ) : (
                  <Tooltip title="Kurssilla voi olla vain yksi pakollinen alustus">
                    <FormControlLabel
                      control={<Checkbox checked={updatedMandatory} disabled />}
                      label="Tee alustuksesta pakollinen opiskelijoille"
                      sx={{ mr: 5 }}
                    />
                  </Tooltip>
                )}

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={updatedHidden}
                      onChange={() => setUpdatedHidden((prev) => !prev)}
                    />
                  }
                  label={t('hidePrompt')}
                />
              </>
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
