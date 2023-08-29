/* eslint-disable no-await-in-loop, no-constant-condition */
import React, { useState } from 'react'
import { Box, Paper } from '@mui/material'
import { enqueueSnackbar } from 'notistack'
import { useParams } from 'react-router-dom'

import { Message, Prompt } from '../../types'
import { getCompletionStream } from './util'
import useCourse from '../../hooks/useCourse'
import Banner from '../Banner'
import PromptSelector from './PromptSelector'
import SystemMessage from './SystemMessage'
import Conversation from './Conversation'
import SendMessage from './SendMessage'
import Email from './Email'

const Chat = () => {
  const { courseId } = useParams()

  const [activePrompt, setActivePrompt] = useState('')
  const [system, setSystem] = useState('')
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [completion, setCompletion] = useState('')

  const { service, isLoading } = useCourse(courseId)

  if (isLoading) return null

  const hasPrompts = service && service.prompts.length > 0

  const handleSend = async () => {
    const newMessage: Message = { role: 'user', content: message }
    setMessages((prev) => [...prev, newMessage])
    setMessage('')

    try {
      const stream = await getCompletionStream(
        service?.id || 'chat',
        system,
        messages.concat(newMessage),
        courseId
      )
      const reader = stream.getReader()

      let content = ''
      while (true) {
        const { value, done } = await reader.read()

        if (done) break

        const text = new TextDecoder().decode(value)

        setCompletion((prev) => prev + text)
        content += text
      }

      setMessages((prev) => [...prev, { role: 'assistant', content }])
    } catch (err: any) {
      const error = err?.response?.data || err.message
      enqueueSnackbar(error, { variant: 'error' })
    }

    setCompletion('')
  }

  const handleReset = () => {
    setMessages([])
    setSystem('')
    setMessage('')
    setCompletion('')
    setActivePrompt('')
  }

  const handleChangePrompt = (promptId: string) => {
    const { systemMessage, messages: promptMessages } = service?.prompts.find(
      ({ id }) => id === promptId
    ) as Prompt

    setSystem(systemMessage)
    setMessages(promptMessages)
    setActivePrompt(promptId)
  }

  return (
    <Box
      sx={{
        margin: '0 auto',
        width: '90%',
        padding: '5%',
      }}
    >
      <Banner />
      <Paper
        variant="outlined"
        sx={{
          padding: '5% 10%',
          mt: 5,
        }}
      >
        {hasPrompts && (
          <PromptSelector
            prompts={service.prompts}
            activePrompt={activePrompt}
            setActivePrompt={handleChangePrompt}
          />
        )}
        <SystemMessage
          system={system}
          setSystem={setSystem}
          disabled={messages.length > 0}
        />
        <Conversation messages={messages} completion={completion} />
        <SendMessage
          message={message}
          setMessage={setMessage}
          handleReset={handleReset}
          handleSend={handleSend}
          disabled={message.length === 0 || completion !== ''}
          resetDisabled={
            messages.length === 0 && system.length === 0 && message.length === 0
          }
        />
        <Email
          system={system}
          messages={messages}
          disabled={messages.length === 0 || completion !== ''}
        />
      </Paper>
    </Box>
  )
}

export default Chat
