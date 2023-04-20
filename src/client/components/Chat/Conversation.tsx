import React from 'react'
import { Box, Typography, Paper } from '@mui/material'
import { Person, Storage } from '@mui/icons-material'

import { Message, Role } from '../../types'

const Response = ({ role, content }: { role: Role, content: string }) => {
  const isUser = role === 'user'

  return (
    <Box mb={2}>
      <Box display="flex">
        <Box display="inline-block">
          <Paper variant="outlined">
            <Box p={1} display="flex">
              {isUser ? <Person sx={{ mr: 1 }} /> : <Storage sx={{ mr: 1 }} />}
              <Typography variant="body1">{content}</Typography>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  )
}

const Conversation = ({ messages }: { messages: Message[] }) => (
  <Box>
    {messages.map(({ role, content }) => (
      <Response key={content} role={role} content={content} />
    ))}
  </Box>
)

export default Conversation
