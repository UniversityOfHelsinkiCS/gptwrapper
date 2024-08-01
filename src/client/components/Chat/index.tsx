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
import useInfoTexts from '../../hooks/useInfoTexts'
import useRetryTimeout from '../../hooks/useRetryTimeout'

const WAIT_FOR_STREAM_TIMEOUT = 4000
const ALLOWED_FILE_TYPES = [
  'text/plain',
  'text/html',
  'text/css',
  'text/csv',
  'text/markdown',
  'text/md',
  'application/pdf',
]
const chatPersistingEnabled = false // import.meta.env.VITE_CHAT_PERSISTING

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

  const { infoTexts, isLoading: infoTextsLoading } = useInfoTexts()

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
  const [model, setModel] = useState(
    localStorage.getItem('model') ?? 'gpt-3.5-turbo'
  )
  const [streamController, setStreamController] = useState<AbortController>()
  const [alertOpen, setAlertOpen] = useState(false)
  const [disallowedFileType, setDisallowedFileType] = useState('')
  const [tokenUsageWarning, setTokenUsageWarning] = useState('')
  const [tokenWarningVisible, setTokenWarningVisible] = useState(false)
  const [modelTemperature, setModelTemperature] = useState(0.5)
  const [setRetryTimeout, clearRetryTimeout] = useRetryTimeout()

  const { t, i18n } = useTranslation()
  const { language } = i18n

  if (statusLoading || infoTextsLoading) return null

  const disclaimer = infoTexts.find(
    (infoText) => infoText.name === 'disclaimer'
  ).text[language]
  const systemMessageInfo = infoTexts.find(
    (infoText) => infoText.name === 'systemMessage'
  ).text[language]

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
    inputFileRef.current.value = ''
    setMessage('')
    setMessages(messages.slice(0, -1))
    setTokenWarningVisible(false)
    clearRetryTimeout()
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
    clearRetryTimeout()
  }

  const processStream = async (stream: ReadableStream) => {
    try {
      const reader = stream.getReader()

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
      clearRetryTimeout()
    }
  }

  const handleRetry = async (
    getCompletionParams: Parameters<typeof getCompletionStream>[0],
    abortController: AbortController
  ) => {
    if (!abortController || abortController.signal.aborted) return

    abortController?.abort('Creating a stream took too long')
    const newAbortController = new AbortController()
    setStreamController(newAbortController)

    const { stream: retriedStream } = await getCompletionStream({
      ...getCompletionParams,
      abortController: newAbortController,
    })

    await processStream(retriedStream)
  }

  const handleSend = async (userConsent: boolean) => {
    const formData = new FormData()
    let file = inputFileRef.current.files[0] as File
    if (file) {
      if (ALLOWED_FILE_TYPES.includes(file.type)) {
        formData.append('file', file)
      } else {
        file = null
      }
    }

    if (!userConsent) {
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: message + (file ? `\n\n${file.name}` : '') },
      ])
    }

    // Abort the old request if a new one is sent
    // Also clear the retry timeout and message
    streamController?.abort('Sending a new request, aborting the old one')
    clearRetryTimeout()
    setMessage('')

    const abortController = new AbortController()
    setStreamController(abortController)

    const getCompletionsArgs = {
      system,
      messages: messages.concat(
        userConsent
          ? []
          : [
              {
                role: 'user',
                content: message + (file ? `${t('fileInfoPrompt')}` : ''),
              },
            ]
      ),
      model,
      formData,
      userConsent,
      modelTemperature,
      courseId,
      abortController,
    }
    // Retry the request if the server is stuck for WAIT_FOR_STREAM_TIMEOUT seconds
    setRetryTimeout(
      () => handleRetry(getCompletionsArgs, abortController),
      WAIT_FOR_STREAM_TIMEOUT
    )

    const { tokenUsageAnalysis, stream } =
      await getCompletionStream(getCompletionsArgs)

    if (tokenUsageAnalysis && tokenUsageAnalysis.message) {
      setTokenUsageWarning(tokenUsageAnalysis.message)
      setTokenWarningVisible(true)
      return
    }

    clearRetryTimeout()
    await processStream(stream)
  }

  const handleContinue = () => {
    handleSend(true)
    setTokenWarningVisible(false)
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

  const handleSlider = (_: Event, newValue: number | number[]) => {
    setModelTemperature(newValue as number)
  }

  return (
    <Box>
      <Banner disclaimer={disclaimer} />
      {hasPrompts && (
        <PromptSelector
          prompts={course.prompts}
          activePrompt={activePromptId}
          setActivePrompt={handleChangePrompt}
        />
      )}
      {!hidePrompt && (
        <SystemMessage
          infoText={systemMessageInfo}
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
        setMessage={setMessage}
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
      <Box sx={{ px: 4, my: 4, maxWidth: '40rem' }}>
        <Typography>{t('chat:temperature')}</Typography>
        <Slider
          onChange={handleSlider}
          value={modelTemperature}
          step={0.05}
          valueLabelDisplay="auto"
          marks={[
            {
              value: 0,
              label: t('chat:preciseTemperature'),
            },
            {
              value: 0.5,
              label: t('chat:balancedTemperature'),
            },
            {
              value: 1,
              label: t('chat:creativeTemperature'),
            },
          ]}
          min={0}
          max={1}
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
