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
import { Box } from '@mui/material'
import { Disclaimer } from './Disclaimer'
import { Conversation } from './Conversation'
import { ChatBox } from './ChatBox'

export const ChatV2 = () => {
  const { courseId } = useParams()

  const { course } = useCourse(courseId)
  const {
    userStatus,
    isLoading: statusLoading,
    refetch: refetchStatus,
  } = useUserStatus(courseId)
  const [model, setModel] = useLocalStorageState(DEFAULT_MODEL, 'model')
  const { infoTexts, isLoading: infoTextsLoading } = useInfoTexts()
  const [activePromptId, setActivePromptId] = useState('')
  const [system, setSystem] = useLocalStorageState('general-chat-system', '')
  const [message, setMessage] = useLocalStorageState('general-chat-current', '')
  const [messages, setMessages] = useLocalStorageState<Message[]>(
    'general-chat-messages',
    []
  )
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

  const disclaimerInfo =
    infoTexts?.find((infoText) => infoText.name === 'disclaimer')?.text[
      language
    ] ?? null
  const systemMessageInfo =
    infoTexts?.find((infoText) => infoText.name === 'systemMessage')?.text[
      language
    ] ?? null

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

      setMessages(messages.concat({ role: 'assistant', content }))
    } catch (err: any) {
      handleCompletionStreamError(err, fileName)
    } finally {
      setStreamController(undefined)
      setCompletion('')
      refetchStatus()
      inputFileRef.current.value = ''
      setFileName('')
      clearRetryTimeout()
    }
  }

  return (
    <Box>
      {disclaimerInfo && <Disclaimer disclaimer={disclaimerInfo} />}
      <Conversation messages={messages} />
      <ChatBox
        disabled={false}
        onSubmit={(message) => {
          if (message.trim()) {
            setMessages(messages.concat({ role: 'user', content: message }))
            setMessage('')
            setCompletion('')
            setStreamController(new AbortController())
            setRetryTimeout(() => {
              if (streamController) {
                streamController.abort()
              }
            }, 5000)
          }
        }}
      />
    </Box>
  )
}
