/* eslint-disable no-await-in-loop, no-constant-condition */
import React, { useState, useEffect } from 'react'
import { Box, Paper } from '@mui/material'
import { enqueueSnackbar } from 'notistack'
import { useParams } from 'react-router-dom'

import { Message, Prompt } from '../../types'
import { getCompletionStream } from './util'
import useCourse from '../../hooks/useCourse'
import useUserStatus from '../../hooks/useUserStatus'
import Banner from '../Banner'
import PromptSelector from './PromptSelector'
import SystemMessage from './SystemMessage'
import Conversation from './Conversation'
import SendMessage from './SendMessage'
import Email from './Email'
import Status from './Status'

const Chat = () => {
  const { courseId } = useParams()

  const [activePromptId, setActivePromptId] = useState('')
  const [system, setSystem] = useState('')
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [completion, setCompletion] = useState('')
  const [model, setModel] = useState('')
  const [streamController, setStreamController] = useState<AbortController>()

  const { course, isLoading } = useCourse(courseId)
  const {
    userStatus,
    isLoading: statusLoading,
    refetch,
  } = useUserStatus(course?.id)

  useEffect(() => {
    if (statusLoading || model) return
    setModel(userStatus.model)
  }, [userStatus])

  if (isLoading || statusLoading) return null
  if (!userStatus) return null

  const { usage, limit, models } = userStatus

  const hasPrompts = course && course.prompts.length > 0
  const activePrompt = course?.prompts.find(({ id }) => id === activePromptId)
  const hidePrompt = activePrompt?.hidden ?? false

  const getVisibleMessages = (): Message[] => {
    if (!hidePrompt) return messages

    const hideCount = activePrompt?.messages.length ?? 0

    return messages.slice(hideCount)
  }

  const visibleMessages = getVisibleMessages()

  const handleSend = async () => {
    const newMessage: Message = { role: 'user', content: message }
    setMessages((prev) => [...prev, newMessage])
    setMessage('')

    try {
      const { stream, controller } = await getCompletionStream(
        course?.id || 'chat',
        system,
        messages.concat(newMessage),
        model,
        courseId
      )
      const reader = stream.getReader()
      setStreamController(controller)

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
      if (err?.name === 'AbortError') return
      const error = err?.response?.data || err.message
      enqueueSnackbar(error, { variant: 'error' })
    }

    setStreamController(undefined)
    setCompletion('')
    refetch()
  }

  const handleReset = () => {
    if (streamController) streamController.abort()

    setStreamController(undefined)
    setMessages([])
    setSystem('')
    setMessage('')
    setCompletion('')
    setActivePromptId('')
  }

  const handleChangePrompt = (promptId: string) => {
    const { systemMessage, messages: promptMessages } = course?.prompts.find(
      ({ id }) => id === promptId
    ) as Prompt

    setSystem(systemMessage)
    setMessages(promptMessages)
    setActivePromptId(promptId)
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
            prompts={course.prompts}
            activePrompt={activePromptId}
            setActivePrompt={handleChangePrompt}
          />
        )}
        {!hidePrompt && (
          <SystemMessage
            system={system}
            setSystem={setSystem}
            disabled={activePromptId.length > 0 || messages.length > 0}
          />
        )}
        <Conversation messages={visibleMessages} completion={completion} />
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
      <Status
        model={model}
        setModel={setModel}
        models={models}
        usage={usage}
        limit={limit}
      />
    </Box>
  )
}

export default Chat
