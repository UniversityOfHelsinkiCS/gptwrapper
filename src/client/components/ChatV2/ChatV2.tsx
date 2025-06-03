import { useParams } from 'react-router-dom'
import useCourse from '../../hooks/useCourse'
import useUserStatus from '../../hooks/useUserStatus'
import { useRef, useState, useContext } from 'react'
import useLocalStorageState from '../../hooks/useLocalStorageState'
import { DEFAULT_MODEL } from '../../../config'
import useInfoTexts from '../../hooks/useInfoTexts'
import { Message } from '../../types'
import { FileSearchResult, ResponseStreamEventData } from '../../../shared/types'
import useRetryTimeout from '../../hooks/useRetryTimeout'
import { useTranslation } from 'react-i18next'
import { handleCompletionStreamError } from './error'
import { Box, Button, IconButton } from '@mui/material'
import { Disclaimer } from './Disclaimer'
import { Conversation } from './Conversation'
import { ChatBox } from './ChatBox'
import { getCompletionStream } from './util'
import { SystemPrompt } from './System'
import { AppContext } from '../../util/context'
import { Settings } from '@mui/icons-material'
import { SettingsModal } from './SettingsModal'
import { Link } from 'react-router-dom'
import { useScrollToBottom } from './useScrollToBottom'
import { CitationsBox } from './CitationsBox'
import { useRagIndices } from '../../hooks/useRagIndices'

export const ChatV2 = () => {
  const { courseId } = useParams()
  const { course } = useCourse(courseId)
  const { ragIndices } = useRagIndices(courseId)
  const { infoTexts, isLoading: infoTextsLoading } = useInfoTexts()

  const { userStatus, isLoading: statusLoading, refetch: refetchStatus } = useUserStatus(courseId)
  const [model, setModel] = useLocalStorageState<{ name: string }>('model-v2', {
    name: DEFAULT_MODEL,
  })
  const [system, setSystem] = useLocalStorageState<{ content: string }>('general-chat-system', { content: '' })
  const [message, setMessage] = useLocalStorageState<{ content: string }>('general-chat-current', { content: '' })
  const [messages, setMessages] = useLocalStorageState<Message[]>('general-chat-messages', [])
  const [prevResponse, setPrevResponse] = useLocalStorageState<{
    id: string
  }>('general-prev-response', { id: '' })

  const appContainerRef = useContext(AppContext)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const inputFileRef = useRef<HTMLInputElement>(null)

  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [activePromptId, setActivePromptId] = useState('')
  const [fileName, setFileName] = useState<string>('')
  const [completion, setCompletion] = useState('')
  const [fileSearchResult, setFileSearchResult] = useLocalStorageState<FileSearchResult>('last-file-search', null)
  const [streamController, setStreamController] = useState<AbortController>()
  const [alertOpen, setAlertOpen] = useState(false)
  const [disallowedFileType, setDisallowedFileType] = useState('')
  const [tokenUsageWarning, setTokenUsageWarning] = useState('')
  const [tokenWarningVisible, setTokenWarningVisible] = useState(false)
  const [modelTemperature, setModelTemperature] = useState(0.5)
  const [saveConsent, setSaveConsent] = useState(true)
  const [ragIndexId, setRagIndexId] = useState<number | null>(null)
  const ragIndex = ragIndices?.find((index) => index.id === ragIndexId) ?? null

  const [setRetryTimeout, clearRetryTimeout] = useRetryTimeout()

  const { t, i18n } = useTranslation()
  const { language } = i18n

  const disclaimerInfo = infoTexts?.find((infoText) => infoText.name === 'disclaimer')?.text[language] ?? null
  const systemMessageInfo = infoTexts?.find((infoText) => infoText.name === 'systemMessage')?.text[language] ?? null

  const decoder = new TextDecoder()

  const processStream = async (stream: ReadableStream) => {
    try {
      const reader = stream.getReader()

      let content = ''
      let fileSearchResult: FileSearchResult

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const data = decoder.decode(value)

        for (const chunk of data.split('\n')) {
          if (!chunk || chunk.trim().length === 0) continue

          let parsedChunk: ResponseStreamEventData = null
          try {
            parsedChunk = JSON.parse(chunk)
          } catch (_e) {
            console.error('Could not parse the chunk:', chunk)
          }

          switch (parsedChunk.type) {
            case 'writing':
              setCompletion((prev) => prev + parsedChunk.text)
              content += parsedChunk.text
              break

            case 'annotation':
              console.log('Received annotation:', parsedChunk.annotation)
              break

            case 'fileSearchDone':
              fileSearchResult = parsedChunk.fileSearch
              setFileSearchResult(parsedChunk.fileSearch)
              break

            case 'complete':
              console.log('Stream completed with response ID:', parsedChunk)
              setPrevResponse({ id: parsedChunk.prevResponseId })
              break

            case 'error':
              console.error('Somehing went wrong when streaming responses')
              break

            default:
              break
          }
        }
      }

      setMessages((prev: Message[]) => prev.concat({ role: 'assistant', content, fileSearchResult }))
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
    setPrevResponse({ id: '' })
    setCompletion('')
    setFileSearchResult(null)
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
        ragIndexId: ragIndexId ?? undefined,
        model: model.name,
        formData: new FormData(),
        userConsent: true,
        modelTemperature,
        courseId,
        abortController: streamController,
        saveConsent,
        prevResponseId: prevResponse.id,
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
    setPrevResponse({ id: '' })
    setCompletion('')
    setFileSearchResult(null)
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

  useScrollToBottom(chatContainerRef, appContainerRef, messages)

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <SettingsModal
        open={settingsModalOpen}
        setOpen={setSettingsModalOpen}
        model={model.name}
        setModel={(name) => setModel({ name })}
        setRagIndex={setRagIndexId}
        ragIndices={ragIndices}
        currentRagIndex={ragIndex}
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: '1rem' }}>
          {disclaimerInfo && <Disclaimer disclaimer={disclaimerInfo} />}
          <SystemPrompt content={system.content} setContent={(content) => setSystem({ content })} />
          <Button onClick={handleReset}>Reset</Button>
          <IconButton onClick={() => setSettingsModalOpen(true)} title="Settings">
            <Settings></Settings>
          </IconButton>
        </Box>
        {courseId ? <Link to={'/v2'}>CurreChat</Link> : <Link to={'/v2/sandbox'}>Ohtu Sandbox</Link>}
      </Box>
      <Box sx={{ display: 'flex' }}>
        <Box ref={chatContainerRef} flex={1}>
          <Conversation messages={messages} completion={completion} fileSearchResult={fileSearchResult} />
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
        {ragIndex && (
          <Box flex={1}>
            <CitationsBox messages={messages} fileSearchResult={fileSearchResult} />
          </Box>
        )}
      </Box>
    </Box>
  )
}
