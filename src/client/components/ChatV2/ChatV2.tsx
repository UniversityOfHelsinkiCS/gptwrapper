import { useParams } from 'react-router-dom'
import useCourse from '../../hooks/useCourse'
import useUserStatus from '../../hooks/useUserStatus'
import { useRef, useState } from 'react'
import useLocalStorageState from '../../hooks/useLocalStorageState'
import { DEFAULT_MODEL } from '../../../config'
import useInfoTexts from '../../hooks/useInfoTexts'
import { Message } from '../../types'
import useRetryTimeout from '../../hooks/useRetryTimeout'
import { useTranslation } from 'react-i18next'
import { handleCompletionStreamError } from './error'
import { Box, Button } from '@mui/material'
import { Disclaimer } from './Disclaimer'
import { Conversation } from './Conversation'
import { ChatBox } from './ChatBox'
import { getCompletionStream } from './util'
import { SystemPrompt } from './System'

export const ChatV2 = () => {
  const { courseId } = useParams()

  const { course } = useCourse(courseId)
  const { userStatus, isLoading: statusLoading, refetch: refetchStatus } = useUserStatus(courseId)
  const [model, setModel] = useLocalStorageState<{ name: string }>('model', {
    name: DEFAULT_MODEL,
  })
  const { infoTexts, isLoading: infoTextsLoading } = useInfoTexts()
  const [activePromptId, setActivePromptId] = useState('')
  const [system, setSystem] = useLocalStorageState<{ content: string }>('general-chat-system', { content: '' })
  const [message, setMessage] = useLocalStorageState<{ content: string }>('general-chat-current', { content: '' })
  const [messages, setMessages] = useLocalStorageState<Message[]>('general-chat-messages', [])
  const inputFileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string>('')
  const [completion, setCompletion] = useState('')
  const [streamController, setStreamController] = useState<AbortController>()
  const [alertOpen, setAlertOpen] = useState(false)
  const [disallowedFileType, setDisallowedFileType] = useState('')
  const [tokenUsageWarning, setTokenUsageWarning] = useState('')
  const [tokenWarningVisible, setTokenWarningVisible] = useState(false)
  const [modelTemperature, setModelTemperature] = useState(0.5)
  const [setRetryTimeout, clearRetryTimeout] = useRetryTimeout()
  const [saveConsent, setSaveConsent] = useState(true)

  const { t, i18n } = useTranslation()
  const { language } = i18n

  const disclaimerInfo = infoTexts?.find((infoText) => infoText.name === 'disclaimer')?.text[language] ?? null
  const systemMessageInfo = infoTexts?.find((infoText) => infoText.name === 'systemMessage')?.text[language] ?? null

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
        console.log(text)
      }

      setMessages((prev: Message[]) => prev.concat({ role: 'assistant', content }))
    } catch (err: any) {
      handleCompletionStreamError(err, fileName)
    } finally {
      setStreamController(undefined)
      setCompletion('')
      refetchStatus()
      // inputFileRef.current.value = ''
      setFileName('')
      clearRetryTimeout()
    }
  }

  const handleSubmit = async (message: string) => {
    const newMessages = messages.concat({ role: 'user', content: message })
    setMessages(newMessages)
    setMessage({ content: '' })
    setCompletion('')
    setStreamController(new AbortController())
    setRetryTimeout(() => {
      if (streamController) {
        streamController.abort()
      }
    }, 5000)

    try {
      const { tokenUsageAnalysis, stream } = await getCompletionStream({
        system: system.content,
        messages: newMessages,
        model: model.name,
        formData: new FormData(),
        userConsent: true,
        modelTemperature,
        courseId,
        abortController: streamController,
        saveConsent,
      })

      if (tokenUsageAnalysis && tokenUsageAnalysis.message) {
        setTokenUsageWarning(tokenUsageAnalysis.message)
        setTokenWarningVisible(true)
        return
      }

      clearRetryTimeout()
      await processStream(stream)
    } catch (err: any) {
      console.error(err)
    }
  }

  const handleReset = () => {
    setMessages([])
    setMessage({ content: '' })
    setCompletion('')
    setStreamController(undefined)
    setTokenUsageWarning('')
    setTokenWarningVisible(false)
    setRetryTimeout(() => {
      if (streamController) {
        streamController.abort()
      }
    }, 5000)
    clearRetryTimeout()
  }

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          gap: '1rem',
        }}
      >
        {disclaimerInfo && <Disclaimer disclaimer={disclaimerInfo} />}
        <SystemPrompt content={system.content} setContent={(content) => setSystem({ content })} />
        <Button onClick={handleReset}>Reset</Button>
      </Box>
      <Conversation messages={messages} completion={completion} />
      <ChatBox
        disabled={false}
        onSubmit={(message) => {
          if (message.trim()) {
            handleSubmit(message)
            setMessage({ content: '' })
          }
        }}
      />
    </Box>
  )
}
