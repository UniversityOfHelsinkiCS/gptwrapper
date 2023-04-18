import React, { useState } from 'react'
import { Box, TextField, Button, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { Message } from '../../types'
import { getChatCompletion, getResponse } from './util'

const Chat = () => {
  const [system, setSystem] = useState('')
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])

  const { t } = useTranslation()

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
      m={2}
      sx={{
        margin: 'auto',
        width: '80%',
        padding: '5%',
      }}
    >
      <Box mb={2}>
        <TextField
          fullWidth
          multiline
          minRows={2}
          value={system}
          onChange={(e) => setSystem(e.target.value)}
          placeholder={t('chat:exampleSystemMessage') as string}
        />
      </Box>

      {messages.map(({ content }) => (
        <Box mb={2} key={content}>
          <Typography variant="body1">{content}</Typography>
        </Box>
      ))}

      <Box mb={2}>
        <Box mb={2}>
          <TextField
            fullWidth
            multiline
            minRows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('chat:messagePlaceholder') as string}
          />
        </Box>

        <Button variant="contained" onClick={handleSend}>
          {t('send')}
        </Button>
      </Box>
    </Box>
  )
}

export default Chat
