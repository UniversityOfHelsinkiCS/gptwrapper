/* eslint-disable no-await-in-loop, no-constant-condition */
import React, { useState, useRef } from 'react'
import { Box, Paper } from '@mui/material'
import { enqueueSnackbar } from 'notistack'
import { useTranslation } from 'react-i18next'

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
import '../../styles.css'

const Chat = () => {
  const [system, setSystem] = useState('')
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const inputFileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string>('')
  const [completion, setCompletion] = useState('')
  const [model, setModel] = useState(localStorage.getItem('model') ?? 'gpt-4')
  const [streamController, setStreamController] = useState<AbortController>()

  const { t } = useTranslation()

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
    if (file) {
      if (file.type === 'text/plain') {
        formData.append('file', file)
      } else {
        enqueueSnackbar(t('error:invalidFileType'), { variant: 'error' })
        return
      }
    }
    const newMessage: Message = {
      role: 'user',
      content: message + (file ? `${t('fileInfoPrompt')}` : ''),
    }
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
      if (error === 'Model maximum context reached' && fileName) {
        enqueueSnackbar(t('error:tooLargeFile'), { variant: 'error' })
      } else if (error === 'Error parsing file' && fileName) {
        enqueueSnackbar(t('error:fileParsingError'), { variant: 'error' })
      } else {
        enqueueSnackbar(error, { variant: 'error' })
      }
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

  const handleStop = () => {
    if (streamController) streamController.abort()
    setStreamController(undefined)
    setCompletion('')
    setMessages(messages.slice(0, -1))
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
        <Conversation
          messages={messages}
          completion={completion}
          handleStop={handleStop}
        />
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
