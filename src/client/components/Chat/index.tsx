/* eslint-disable no-await-in-loop, no-constant-condition */
import React, { useState, useRef } from 'react'
import { Box, Paper } from '@mui/material'
import { enqueueSnackbar } from 'notistack'

import { DEFAULT_TOKEN_LIMIT } from '../../../config'
import { Message } from '../../types'
import { getCompletionStream } from './util'
import useCurrentUser from '../../hooks/useCurrentUser'
import Banner from '../Banner'
import SystemMessage from './SystemMessage'
import Conversation from './Conversation'
import SendMessage from './SendMessage'
import Email from './Email'
import Status from './Status'

const Chat = () => {
  const [system, setSystem] = useState('')
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const inputFileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string>('')
  const [completion, setCompletion] = useState('')
  const [model, setModel] = useState(localStorage.getItem('model') ?? 'gpt-4')
  const [streamController, setStreamController] = useState<AbortController>()

  const { user, isLoading, refetch } = useCurrentUser()

  if (isLoading) return null

  const { usage, isPowerUser } = user

  const handleSetModel = (newModel: string) => {
    setModel(newModel)
    localStorage.setItem('model', newModel)
  }

  const handleSend = async () => {
    const formData = new FormData()
    const file = inputFileRef.current.files[0] as File
    formData.append('file', file)
    const newMessage: Message = { role: 'user', content: message }
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: message + (file ? `\n\n${file.name}` : '') },
    ])
    setMessage('')

    try {
      const { stream, controller } = await getCompletionStream(
        system,
        messages.concat(newMessage),
        model,
        formData
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
    inputFileRef.current.value = ''
    setFileName('')
  }

  const handleReset = () => {
    if (streamController) streamController.abort()

    setStreamController(undefined)
    setMessages([])
    setSystem('')
    setMessage('')
    setCompletion('')
    inputFileRef.current.value = ''
    setFileName('')
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
          inputFileRef={inputFileRef}
          fileName={fileName}
          setFileName={setFileName}
        />
        <Email
          system={system}
          messages={messages}
          disabled={messages.length === 0 || completion !== ''}
        />
      </Paper>
      <Status
        model={model}
        setModel={handleSetModel}
        usage={usage}
        limit={isPowerUser ? DEFAULT_TOKEN_LIMIT * 10 : DEFAULT_TOKEN_LIMIT}
      />
    </Box>
  )
}

export default Chat
