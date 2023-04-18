import React from 'react'
import { Box, Typography } from '@mui/material'

import { Message } from '../../types'

const Conversation = ({ messages }: { messages: Message[] }) => (
  <Box>
    {messages.map(({ role, content }) => (
      <Box mb={2} key={content}>
        <Typography variant="body1">{role}: {content}</Typography>
      </Box>
    ))}
  </Box>
)

export default Conversation
