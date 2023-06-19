/* eslint-disable jsx-a11y/aria-role */
import React from 'react'
import { Box, Paper, Typography } from '@mui/material'
import { Person, Assistant } from '@mui/icons-material'
import ReactMarkdown from 'react-markdown'
import { useTranslation } from 'react-i18next'

import { Message, Role } from '../../types'

const Response = ({ role, content }: { role: Role, content: string }) => {
  const isUser = role === 'user'

  return (
    <Box mb={2} overflow="scroll">
      <Box display="inline-block">
        <Paper variant="outlined">
          <Box display="flex">
            {isUser ? <Person sx={{ mx: 3, my: 4 }} /> : <Assistant sx={{ mx: 3, my: 4 }} />}
            <Box pr={7} py={2}>
              <ReactMarkdown>{content}</ReactMarkdown>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  )
}

const Conversation = ({ messages, completion }: { messages: Message[], completion: string }) => {
  const { t } = useTranslation()

  if (messages.length === 0 && !completion) return null

  return (
    <Box>
      <Box mb={1}>
        <Typography variant="h6">
          {t('chat:conversation')}
        </Typography>
      </Box>
        {messages.map(({ role, content }) => (
          <Response key={content} role={role} content={content} />
        ))}
        {completion && <Response role="assistant" content={completion} />}
    </Box>
  )
}
export default Conversation
