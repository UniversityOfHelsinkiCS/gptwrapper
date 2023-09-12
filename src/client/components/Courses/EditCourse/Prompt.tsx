import React, { useState } from 'react'
import { Box, Paper, Typography, Button, Tooltip } from '@mui/material'
import {
  ExpandLess,
  ExpandMore,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

import { Prompt as PromptType, Set } from '../../../types'
import { Response } from '../../Chat/Conversation'

const ExpandButton = ({
  expand,
  setExpand,
  disabled,
}: {
  expand: boolean
  setExpand: Set<boolean>
  disabled: boolean
}) => (
  <Button onClick={() => setExpand(!expand)} disabled={disabled}>
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

  const [expand, setExpand] = useState(false)

  const { id, messages, hidden } = prompt

  return (
    <Box key={id} pt="1%">
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
            <Typography variant="h6" display="inline">
              {prompt.systemMessage}
            </Typography>
          </Box>
          <Box>
            <Button onClick={() => handleDelete(prompt.id)} color="error">
              {t('common:delete')}
            </Button>
            <ExpandButton
              expand={expand}
              setExpand={setExpand}
              disabled={messages.length === 0}
            />
          </Box>
        </Box>

        {expand && (
          <Box mt={2}>
            {messages.map(({ role, content }) => (
              <Response key={content} role={role} content={content} />
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  )
}

export default Prompt
