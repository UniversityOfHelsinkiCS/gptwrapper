import React, { useState } from 'react'
import { Box, TextField, Button, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { Message } from '../../types'
import useChatCompletion from '../../hooks/useChatCompletion'
import { getResponse } from './util'
import Conversation from './Conversation'

type Set<T> = React.Dispatch<React.SetStateAction<T>>

const SystemMessage = ({
  system,
  setSystem,
}: {
  system: string
  setSystem: Set<string>
}) => {
  const { t } = useTranslation()

  return (
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
  )
}

const Send = ({
  setMessageSent,
}: {
  setMessageSent: Set<boolean>
}) => {
  const { t } = useTranslation()

  return (
    <Button variant="contained" onClick={() => setMessageSent(true)}>
      {t('send')}
    </Button>
  )
}

const NewMessage = ({
  message,
  setMessage,
  setMessageSent,
}: {
  message: string
  setMessage: Set<string>
  setMessageSent: Set<boolean>
}) => {
  const { t } = useTranslation()

  return (
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
      <Send setMessageSent={setMessageSent} />
    </Box>
  )
}

const Response = ({
  system,
  message,
  messages,
  setMessages,
  setMessageSent,
}: {
  system: string
  message: string
  messages: Message[]
  setMessages: Set<Message[]>
  setMessageSent: Set<boolean>
}) => {
  const { completion, isLoading } = useChatCompletion(system, message)

  if (isLoading) return null

  const response = getResponse(completion)
  const isNewResponse = !messages.find((m) => m.id === response.id)

  if (isNewResponse) {
    setMessages([...messages, response])
    setMessageSent(false)
  }

  return (
    <Box mb={2}>
      <p>last response:</p>
      <Typography variant="body1">{response.content}</Typography>
    </Box>
  )
}

const Chat = () => {
  const [system, setSystem] = useState('')
  const [message, setMessage] = useState('')
  const [messageSent, setMessageSent] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])

  return (
    <Box
      m={2}
      sx={{
        margin: 'auto',
        width: '80%',
        padding: '5%',
      }}
    >
      <SystemMessage system={system} setSystem={setSystem} />
      <NewMessage
        message={message}
        setMessage={setMessage}
        setMessageSent={setMessageSent}
      />
      {messages.length > 1 && (
        <Conversation messages={messages.slice(0, -1)} />
      )}
      {messageSent || messages.length > 0 && (
        <Response
          system={system}
          message={message}
          messages={messages}
          setMessages={setMessages}
          setMessageSent={setMessageSent}
        />
      )}
    </Box>
  )
}

export default Chat
