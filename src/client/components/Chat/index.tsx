import React, { useState } from 'react'
import { Box } from '@mui/material'

import { Message } from '../../types'
import { getChatCompletion, getResponse } from './util'
import SystemMessage from './SystemMessage'
import Conversation from './Conversation'
import SendMessage from './SendMessage'

const Chat = () => {
  const [system, setSystem] = useState('')
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])

  const handleSend = async () => {
    const newMessage: Message = { role: 'user', content: message }

    const completion = await getChatCompletion(
      system,
      messages.concat(newMessage)
    )
    const response = getResponse(completion)

    setMessages([...messages, newMessage, response])
    setMessage('')
  }

  return (
    <Box
      sx={{
        margin: 'auto',
        width: '80%',
        padding: '5%',
      }}
    >
      <SystemMessage
        system={system}
        setSystem={setSystem}
        disabled={messages.length > 0}
      />
      <Conversation messages={messages} />
      <SendMessage
        message={message}
        setMessage={setMessage}
        handleSend={handleSend}
      />
    </Box>
  )
}

export default Chat
