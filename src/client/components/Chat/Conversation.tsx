import React from 'react'
import { Box, Typography } from '@mui/material'

import { Message } from '../../types'

const MessageBox = ({ message }: { message: Message }) => (
  <Box mb={2}>
    <Typography variant="body1">{message.content}</Typography>
  </Box>
)

const Conversation = ({
  messages,
}: {
  messages: Message[],
}) => (
  <Box>
    {messages.map((message) => (
      <MessageBox key={message.id} message={message} />
    ))}
  </Box>
)

export default Conversation
