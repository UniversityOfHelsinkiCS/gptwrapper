import { useState, useRef, useContext, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import useCourse from '../../hooks/useCourse'
import useUserStatus from '../../hooks/useUserStatus'
import useLocalStorageState from '../../hooks/useLocalStorageState'
import { validModels, DEFAULT_MODEL, FREE_MODEL, DEFAULT_ASSISTANT_INSTRUCTIONS, DEFAULT_MODEL_TEMPERATURE, ALLOWED_FILE_TYPES } from '../../../config'
import useInfoTexts from '../../hooks/useInfoTexts'
import { Message } from '../../types'
import { FileSearchResult, ResponseStreamEventData } from '../../../shared/types'
import useRetryTimeout from '../../hooks/useRetryTimeout'
import { useTranslation } from 'react-i18next'
import { handleCompletionStreamError } from './error'
import { getCompletionStream } from './util'

import { Box, Typography, Alert } from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings'
import EmailIcon from '@mui/icons-material/Email'
import DeleteIcon from '@mui/icons-material/Delete'
import HelpIcon from '@mui/icons-material/Help'

import { DisclaimerModal } from './Disclaimer'
import { Conversation } from './Conversation'
import { ChatBox } from './ChatBox'
import { SettingsModal } from './SettingsModal'
import { TokenUsageWarning } from './TokenUsageWarning'

import { CitationsBox } from './CitationsBox'
import { useRagIndices } from '../../hooks/useRagIndices'
import SettingsButton from './generics/SettingsButton'

import { AppContext } from '../../util/AppContext'
import { ChatInfo } from './generics/ChatInfo'

export const ChatV2 = () => {
  const { courseId } = useParams()
  const { course } = useCourse(courseId)

  const { ragIndices } = useRagIndices(courseId)
  const { infoTexts, isLoading: infoTextsLoading } = useInfoTexts()

  const { userStatus, isLoading: statusLoading, refetch: refetchStatus } = useUserStatus(courseId)

  // local storage states
  const localStoragePrefix = 'general'
  const [activeModel, setActiveModel] = useLocalStorageState<{ name: string }>('model-v2', {
    name: DEFAULT_MODEL,
  })
  const [disclaimerStatus, setDisclaimerStatus] = useLocalStorageState<{ open: boolean }>('disclaimer-status', { open: true })
  const [assistantInstructions, setAssistantInstructions] = useLocalStorageState<{ content: string }>(`${localStoragePrefix}-chat-instructions`, {
    content: DEFAULT_ASSISTANT_INSTRUCTIONS,
  })
  const [modelTemperature, setModelTemperature] = useLocalStorageState<{ value: number }>(`${localStoragePrefix}-chat-model-temperature`, {
    value: DEFAULT_MODEL_TEMPERATURE,
  })

  const [message, setMessage] = useLocalStorageState<{ content: string }>(`${localStoragePrefix}-chat-current`, { content: '' })
  const [messages, setMessages] = useLocalStorageState<Message[]>(`${localStoragePrefix}-chat-messages`, [])
  const [prevResponse, setPrevResponse] = useLocalStorageState<{ id: string }>(`${localStoragePrefix}-prev-response`, { id: '' })
  const [fileSearchResult, setFileSearchResult] = useLocalStorageState<FileSearchResult>('last-file-search', null)

  // App States
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false)
  const [fileName, setFileName] = useState<string>('')
  const [alertOpen, setAlertOpen] = useState<boolean>(false)
  const [disallowedFileType, setDisallowedFileType] = useState<string>('')
  const [tokenUsageWarning, setTokenUsageWarning] = useState<string>('')
  const [tokenWarningVisible, setTokenWarningVisible] = useState<boolean>(false)
  const [allowedModels, setAllowedModels] = useState<string[]>([])
  const [saveConsent, setSaveConsent] = useState<boolean>(true) // asking for consent for saving chats for research is not implemented in v1, so should it be implemented in v2?

  // Chat Streaming states
  const [completion, setCompletion] = useState<string>('')
  const [isCompletionDone, setIsCompletionDone] = useState<boolean>(true)
  const [streamController, setStreamController] = useState<AbortController>()

  // RAG states
  const [ragIndexId, setRagIndexId] = useState<number | null>(null)
  const ragIndex = ragIndices?.find((index) => index.id === ragIndexId) ?? null

  // Refs
  const appContainerRef = useContext(AppContext)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const conversationRef = useRef<HTMLElement>(null)
  const inputFieldRef = useRef<HTMLElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [setRetryTimeout, clearRetryTimeout] = useRetryTimeout()

  const decoder = new TextDecoder()
  const { t, i18n } = useTranslation()
  const { language } = i18n

  const disclaimerInfo = infoTexts?.find((infoText) => infoText.name === 'disclaimer')?.text[language] ?? null

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
          } catch (e: any) {
            console.error('Error', e)
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
      setIsCompletionDone(true)
      refetchStatus()
      setFileName('')
      clearRetryTimeout()
    }
  }

  const handleSubmit = async (message: string) => {
    const formData = new FormData()

    let file = fileInputRef.current.files[0] as File
    if (file) {
      if (ALLOWED_FILE_TYPES.includes(file.type)) {
        formData.append('file', file)
      } else {
        console.error('File not attached')
        file = null
      }
    }

    const newMessages = messages.concat({
      role: 'user',
      content: message,
      attachements: file && fileName ? fileName : undefined,
    })

    setMessages(newMessages)
    setMessage({ content: '' })
    setPrevResponse({ id: '' })
    setCompletion('')
    setIsCompletionDone(false)
    fileInputRef.current.value = null
    setFileName('')
    setFileSearchResult(null)
    setStreamController(new AbortController())
    setRetryTimeout(() => {
      if (streamController) {
        streamController.abort()
      }
    }, 5000)

    try {
      const { tokenUsageAnalysis, stream } = await getCompletionStream({
        assistantInstructions: assistantInstructions.content,
        messages: newMessages,
        ragIndexId: ragIndexId ?? undefined,
        model: activeModel.name,
        formData,
        userConsent: true, // this asks if the user wants to continue sending token expensive message despite warning
        modelTemperature: modelTemperature.value,
        courseId,
        abortController: streamController,
        saveConsent, // this asks if user allows saving the chat messaging for research purposes
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
    setIsCompletionDone(true)
    fileInputRef.current.value = null
    setFileName('')
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

  // const handleCancel = () => {
  //   setMessages(messages.slice(0, -1))
  //   setMessage({ content: '' })
  //   setCompletion('')
  //   setIsCompletionDone(true)
  //   fileInputRef.current.value = null
  //   setFileName('')
  //   setFileSearchResult(null)
  //   setStreamController(undefined)
  //   setTokenUsageWarning('')
  //   setTokenWarningVisible(false)
  //   clearRetryTimeout()
  // }

  // const handleContinue = () => {
  //   handleSubmit(message.content)
  //   setTokenWarningVisible(false)
  // }

  useEffect(() => {
    // Scrolls to bottom on initial load only
    if (!appContainerRef.current || !conversationRef.current || messages.length === 0) return
    if (isCompletionDone) {
      const container = appContainerRef.current
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'instant',
        })
      }
    }
  }, [])

  useEffect(() => {
    // Scrolls to last assistant message on text generation
    if (!appContainerRef.current || !conversationRef.current || messages.length === 0) return

    const lastNode = conversationRef.current.lastElementChild as HTMLElement

    if (lastNode.classList.contains('message-role-assistant') && !isCompletionDone) {
      const container = appContainerRef.current

      const containerRect = container.getBoundingClientRect()
      const lastNodeRect = lastNode.getBoundingClientRect()

      const scrollTopPadding = 240
      const scrollOffset = lastNodeRect.top - containerRect.top + container.scrollTop - scrollTopPadding

      container.scrollTo({
        top: scrollOffset,
        behavior: 'smooth',
      })
    }
  }, [isCompletionDone])

  useEffect(() => {
    if (!userStatus) return

    const { usage, limit, model: defaultCourseModel, models: courseModels } = userStatus

    if (course && courseModels) {
      setAllowedModels(courseModels)

      if (courseModels.includes(activeModel.name)) {
        setActiveModel({ name: activeModel.name })
      } else {
        setActiveModel({ name: defaultCourseModel ?? courseModels[0] })
      }
    } else {
      const allowedModels = validModels.map((m) => m.name) // [gpt-4, gpt-4o, gpt-4o-mini] 22.8.2024
      setAllowedModels(allowedModels)
    }

    const tokenUseExceeded = usage >= limit

    if (tokenUseExceeded) {
      setActiveModel({ name: FREE_MODEL })
      return
    }
  }, [userStatus, course])

  if (statusLoading || infoTextsLoading) return null

  if (course && course.usageLimit === 0) {
    return (
      <Box>
        <ChatInfo course={course} />
        <Alert severity="warning" style={{ marginTop: 20 }}>
          <Typography variant="h6">{t('course:curreNotOpen')}</Typography>
        </Alert>
      </Box>
    )
  }

  if (course && course.activityPeriod) {
    const { startDate, endDate } = course && course.activityPeriod
    const start = new Date(startDate)
    const end = new Date(endDate)
    const now = new Date()

    if (now < start) {
      return (
        <Box>
          <ChatInfo course={course} />
          <Alert severity="warning" style={{ marginTop: 20 }}>
            <Typography variant="h6">{t('course:curreNotStarted')}</Typography>
          </Alert>
        </Box>
      )
    }

    if (now > end) {
      return (
        <Box>
          <ChatInfo course={course} />
          <Alert severity="warning" style={{ marginTop: 20 }}>
            <Typography variant="h6">{t('course:curreExpired')}</Typography>
          </Alert>
        </Box>
      )
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        height: '100%',
        minWidth: 1400,
        overflowX: 'clip',
      }}
    >
      {/* Chat side panel column -------------------------------------------------------------------------------------------*/}
      <Box sx={{ position: 'relative', flex: 1, borderRight: '1px solid rgba(0, 0, 0, 0.12)' }}>
        <Box sx={{ position: 'sticky', top: 80, padding: '2rem 1.5rem' }}>
          {course && <ChatInfo course={course} />}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <SettingsButton startIcon={<DeleteIcon />} onClick={handleReset}>
              Tyhjennä keskustelu
            </SettingsButton>
            <SettingsButton startIcon={<EmailIcon />} onClick={() => alert('Not yet supported')}>
              Tallenna sähköpostina
            </SettingsButton>
            <SettingsButton startIcon={<SettingsIcon />} onClick={() => setSettingsModalOpen(true)}>
              Keskustelun asetukset
            </SettingsButton>
            <SettingsButton startIcon={<HelpIcon />} onClick={() => setDisclaimerStatus({ open: true })}>
              Disclaimer
            </SettingsButton>
          </Box>
        </Box>
      </Box>

      {/* Chat view column ------------------------------------------------------------------------------------------------ */}
      <Box
        ref={chatContainerRef}
        sx={{
          flex: 3,
          display: 'flex',
          position: 'relative',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '80%',
            minWidth: 750,
            margin: 'auto',
            paddingTop: '1rem',
            paddingBottom: '8rem',
          }}
        >
          <Conversation
            courseName={course?.name[language]}
            courseDate={course?.activityPeriod}
            conversationRef={conversationRef}
            expandedNodeHeight={window.innerHeight - inputFieldRef.current?.clientHeight - 300}
            messages={messages}
            completion={completion}
            isCompletionDone={isCompletionDone}
            fileSearchResult={fileSearchResult}
            hasRagIndex={!!ragIndex}
          />
        </Box>

        <Box ref={inputFieldRef} sx={{ position: 'sticky', bottom: 0, paddingBottom: '1rem', width: '80%', minWidth: 750, margin: 'auto', backgroundColor: 'white' }}>
          {alertOpen && (
            <Alert severity="warning">
              <Typography>{`File of type "${disallowedFileType}" not supported currently`}</Typography>
              <Typography>{`Currenlty there is support for formats ".pdf" and plain text such as ".txt", ".csv", and ".md"`}</Typography>
            </Alert>
          )}

          <ChatBox
            disabled={!isCompletionDone}
            currentModel={activeModel.name}
            availableModels={allowedModels}
            fileInputRef={fileInputRef}
            fileName={fileName}
            setFileName={setFileName}
            setDisallowedFileType={setDisallowedFileType}
            setAlertOpen={setAlertOpen}
            setModel={(name) => setActiveModel({ name })}
            onSubmit={(message) => {
              if (message.trim()) {
                handleSubmit(message)
                setMessage({ content: '' })
              }
            }}
          />
        </Box>

        {/* <TokenUsageWarning tokenUsageWarning={tokenUsageWarning} handleCancel={handleCancel} handleContinue={handleContinue} visible={tokenWarningVisible} /> */}
      </Box>

      {/* Annotations columns ----------------------------------------------------------------------------------------------------- */}
      <Box
        sx={{
          position: 'relative',
          flex: 1,
          transform: course ? 'translateX(0%)' : 'translateX(100%)',
          transition: 'transform 200ms ease-in-out 200ms', // 0.2s duration, no delay
        }}
      >
        <Box sx={{ position: 'sticky', top: 80, padding: '4rem 2rem 2rem 0' }}>
          {ragIndex && course && (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <Typography variant="h6">Lähteet</Typography>
              {/* <CitationsBox messages={messages} fileSearchResult={fileSearchResult} /> */}
              <Box sx={{ borderLeft: '4px solid #3f51b5', paddingLeft: '1rem', backgroundColor: 'white', borderRadius: '4px' }}>
                <Typography variant="body2" color="rgba(0,0,0,0.4)">
                  Make sure your ref is attached to a real DOM element (component="div" for MUI Box). Only access .current.clientHeight after the DOM is rendered...
                </Typography>
              </Box>
              <Box sx={{ borderLeft: '4px solid #3f51b5', paddingLeft: '1rem', backgroundColor: 'white', borderRadius: '4px' }}>
                <Typography variant="body2" color="rgba(0,0,0,0.4)">
                  Make sure your ref is attached to a real DOM element (component="div" for MUI Box). Only access .current.clientHeight after the DOM is rendered...
                </Typography>
              </Box>
              <Box sx={{ borderLeft: '4px solid #3f51b5', paddingLeft: '1rem', backgroundColor: 'white', borderRadius: '4px' }}>
                <Typography variant="body2" color="rgba(0,0,0,0.4)">
                  Make sure your ref is attached to a real DOM element (component="div" for MUI Box). Only access .current.clientHeight after the DOM is rendered...
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* Modals --------------------------------------*/}
      <SettingsModal
        open={settingsModalOpen}
        setOpen={setSettingsModalOpen}
        assistantInstructions={assistantInstructions.content}
        setAssistantInstructions={(updatedInstructions) => setAssistantInstructions({ content: updatedInstructions })}
        modelTemperature={modelTemperature.value}
        setModelTemperature={(updatedTemperature) => setModelTemperature({ value: updatedTemperature })}
        model={activeModel.name}
        setModel={(name) => setActiveModel({ name })}
        setRagIndex={setRagIndexId}
        ragIndices={ragIndices}
        currentRagIndex={ragIndex}
        course={course}
      />

      <DisclaimerModal disclaimer={disclaimerInfo} disclaimerStatus={disclaimerStatus} setDisclaimerStatus={setDisclaimerStatus} />
    </Box>
  )
}
