import React, { useState } from 'react'
import { Box, Paper, Typography, Button } from '@mui/material'
import { ExpandLess, ExpandMore } from '@mui/icons-material'
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

  const { id, messages } = prompt

  return (
    <Box key={id} pt="1%">
      <Paper variant="outlined" sx={{ padding: '2%' }}>
        <Box display="flex" justifyContent="space-between">
          <Typography variant="h6" display="inline">
            {prompt.systemMessage}
          </Typography>
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
