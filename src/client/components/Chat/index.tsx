/* eslint-disable no-await-in-loop, no-constant-condition */
import React, { useState, useRef, useEffect } from 'react'
import { Alert, Box, Typography, Slider } from '@mui/material'
import { enqueueSnackbar } from 'notistack'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'

import { validModels } from '../../../config'
import { Message, Prompt, SetState } from '../../types'
import { getCompletionStream } from './util'
import Banner from '../Banner'
import SystemMessage from './SystemMessage'
import Conversation from './Conversation'
import SendMessage from './SendMessage'
import Email from './Email'
import Status from './Status'
import '../../styles.css'
import useCourse from '../../hooks/useCourse'
import useUserStatus from '../../hooks/useUserStatus'
import PromptSelector from './PromptSelector'
import TokenUsageWarning from './TokenUsageWarning'

const chatPersistingEnabled = false // import.meta.env.VITE_CHAT_PERSISTING

const sliderMarks = [
  {
    value: 0,
    label: 'More precise',
  },
  {
    value: 0.5,
    label: 'More balanced',
  },
  {
    value: 1,
    label: 'More creative',
  },
]

/**
 * Chat state persisting is not yet ready for production use, there are privacy concerns.
 * It is therefore guarded by a feature flag only set in development.
 */
function usePersistedState<T>(key: string, defaultValue: T): [T, SetState<T>] {
  const [state, setState] = useState<T>(() => {
    const persistedValue = chatPersistingEnabled
      ? localStorage.getItem(key)
      : null
    return persistedValue ? JSON.parse(persistedValue) : defaultValue
  })

  useEffect(() => {
    if (chatPersistingEnabled) {
      localStorage.setItem(key, JSON.stringify(state))
    }
  }, [key, state])

  return [state, setState]
}

const Chat = () => {
  // Null when in general chat
  const { courseId } = useParams()

  const { course } = useCourse(courseId)
  const {
    userStatus,
    isLoading: statusLoading,
    refetch: refetchStatus,
  } = useUserStatus(courseId)

  const [activePromptId, setActivePromptId] = useState('')
  const [system, setSystem] = usePersistedState('general-chat-system', '')
  const [message, setMessage] = usePersistedState('general-chat-current', '')
  const [messages, setMessages] = usePersistedState<Message[]>(
    'general-chat-messages',
    []
  )
  const inputFileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string>('')
  const [completion, setCompletion] = useState('')
  const [model, setModel] = useState(localStorage.getItem('model') ?? 'gpt-4')
  const [streamController, setStreamController] = useState<AbortController>()
  const [alertOpen, setAlertOpen] = useState(false)
  const [disallowedFileType, setDisallowedFileType] = useState('')
  const [tokenUsageWarning, setTokenUsageWarning] = useState('')
  const [tokenWarningVisible, setTokenWarningVisible] = useState(false)
  const [modelTemperature, setModelTemperature] = useState(0.5)

  const { t } = useTranslation()
  if (statusLoading) return null
  const { usage, limit, models: courseModels } = userStatus

  const models = courseModels ?? validModels.map((m) => m.name)

  const hasPrompts = course && course.prompts.length > 0
  const activePrompt = (course?.prompts ?? []).find(
    ({ id }) => id === activePromptId
  )
  const hidePrompt = activePrompt?.hidden ?? false

  const handleSetModel = (newModel: string) => {
    setModel(newModel)
    localStorage.setItem('model', newModel)
  }

  const handleCancel = () => {
    setFileName('')
    setMessage('')
    setMessages(messages.slice(0, -1))
    setTokenWarningVisible(false)
  }

  const handleSend = async (userConsent: boolean) => {
    const formData = new FormData()

    let file = inputFileRef.current.files[0] as File

    const allowedFileTypes = [
      'text/plain',
      'text/html',
      'text/css',
      'text/csv',
      'text/markdown',
      'text/md',
      'application/pdf',
    ]

    if (file) {
      if (allowedFileTypes.includes(file.type)) {
        formData.append('file', file)
      } else {
        file = null
      }
    }

    const userMessage: Message = {
      role: 'user',
      content: message + (file ? `${t('fileInfoPrompt')}` : ''),
    }

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: message + (file ? `\n\n${file.name}` : '') },
    ])

    setMessage('')
    const { tokenUsageAnalysis, stream, controller } =
      await getCompletionStream(
        system,
        messages.concat(userMessage),
        model,
        formData,
        userConsent,
        modelTemperature,
        courseId
      )

    if (tokenUsageAnalysis && tokenUsageAnalysis.message) {
      setTokenUsageWarning(tokenUsageAnalysis.message)
      setTokenWarningVisible(true)
      return
    }

    try {
      const reader = stream.getReader()
      setStreamController(controller)

      let content = ''
      const decoder = new TextDecoder()

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
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
    } finally {
      setStreamController(undefined)
      setCompletion('')
      refetchStatus()
      inputFileRef.current.value = ''
      setFileName('')
    }
  }

  const handleContinue = () => {
    handleSend(true)
    setTokenWarningVisible(false)
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
    setMessages((prev) => [...prev, { role: 'assistant', content: completion }])
    setCompletion('')
  }

  const handleChangePrompt = (promptId: string) => {
    const { systemMessage, messages: promptMessages } = course?.prompts.find(
      ({ id }) => id === promptId
    ) as Prompt

    setSystem(systemMessage)
    setMessages(promptMessages)
    setActivePromptId(promptId)
  }

  const handleSlider = (event: Event, newValue: number | number[]) => {
    setModelTemperature(newValue as number)
  }

  return (
    <Box>
      <Banner />
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
      <Box sx={{ mb: 3 }} />
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
        setDisallowedFileType={setDisallowedFileType}
        setAlertOpen={setAlertOpen}
      />
      <Email
        system={system}
        messages={messages}
        disabled={messages.length === 0 || completion !== ''}
      />
      {alertOpen && (
        <Alert
          severity="warning"
          sx={{
            maxWidth: '500px',
          }}
        >
          <Typography>
            {`File of type "${disallowedFileType}" not supported currently`}
          </Typography>
          <Typography>
            {`Currenlty there is support for formats ".pdf" and plain text such as ".txt", ".csv", and ".md"`}
          </Typography>
        </Alert>
      )}
      <TokenUsageWarning
        tokenUsageWarning={tokenUsageWarning}
        handleCancel={handleCancel}
        handleContinue={handleContinue}
        visible={tokenWarningVisible}
      />
      <Typography>{`Set model's temperature`}</Typography>
      <Box sx={{ my: 4, px: 5.5 }}>
        <Slider
          onChange={handleSlider}
          value={modelTemperature}
          step={0.05}
          valueLabelDisplay="auto"
          marks={sliderMarks}
          min={0}
          max={1}
          sx={{ width: '50%' }}
        />
      </Box>
      <Status
        model={model}
        setModel={handleSetModel}
        models={models}
        usage={usage}
        limit={limit}
      />
    </Box>
  )
}

export default Chat
