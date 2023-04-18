import React, { useState } from 'react'
import { Box, TextField, Button, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import useChatCompletion from '../../hooks/useChatCompletion'
import { getResponse } from './util'

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
  setShowConversation,
}: {
  setShowConversation: Set<boolean>
}) => {
  const { t } = useTranslation()

  return (
    <Button variant="contained" onClick={() => setShowConversation(true)}>
      {t('send')}
    </Button>
  )
}

const NewMessage = ({
  message,
  setMessage,
  setShowConversation,
}: {
  message: string
  setMessage: Set<string>
  setShowConversation: Set<boolean>
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
      <Send setShowConversation={setShowConversation} />
    </Box>
  )
}

const Conversation = ({
  system,
  message,
}: {
  system: string
  message: string
}) => {
  const { completion, isLoading } = useChatCompletion(system, message)

  if (isLoading) return null

  return (
    <Box>
      <Typography variant="h5">{getResponse(completion)}</Typography>
    </Box>
  )
}

const Chat = () => {
  const [system, setSystem] = useState('')
  const [message, setMessage] = useState('')
  const [showConversation, setShowConversation] = useState(false)

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
        setShowConversation={setShowConversation}
      />
      {showConversation && <Conversation system={system} message={message} />}
    </Box>
  )
}

export default Chat
