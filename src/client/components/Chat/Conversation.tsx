import React from 'react'
import { Box, Paper } from '@mui/material'
import { Person, Storage } from '@mui/icons-material'
import ReactMarkdown from 'react-markdown'

import { Message, Role } from '../../types'

const Response = ({ role, content }: { role: Role, content: string }) => {
  const isUser = role === 'user'

  return (
    <Box mb={2}>
      <Box display="inline-block">
        <Paper variant="outlined">
          <Box display="flex">
            {isUser ? <Person sx={{ mx: 3, my: 4 }} /> : <Storage sx={{ mx: 3, my: 4 }} />}
            <Box pr={7} py={2}>
              <ReactMarkdown>{content}</ReactMarkdown>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  )
}

const LastMessage = ({ message }: { message: Message }) => {
  const { role, content } = message

  if (role === 'user') return <Response role={role} content={content} />

  return (
    <Response role={role} content={content} />
  )
}

const Conversation = ({ messages, lastMessage }: { messages: Message[], lastMessage: Message | null }) => {
  const previousMessages = messages.slice(0, -1)

  return (
    <Box>
      {previousMessages.map(({ role, content }) => (
        <Response key={content} role={role} content={content} />
      ))}
      {lastMessage && <LastMessage message={lastMessage} />}
    </Box>
  )
}

export default Conversation
