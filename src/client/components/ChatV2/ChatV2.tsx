import DeleteIcon from '@mui/icons-material/Delete'
import EmailIcon from '@mui/icons-material/Email'
import HelpIcon from '@mui/icons-material/Help'
import SettingsIcon from '@mui/icons-material/Settings'
import { Alert, Box, Typography } from '@mui/material'
import { useContext, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { ALLOWED_FILE_TYPES, DEFAULT_ASSISTANT_INSTRUCTIONS, DEFAULT_MODEL, DEFAULT_MODEL_TEMPERATURE, FREE_MODEL, validModels } from '../../../config'
import type { FileSearchCompletedData, ResponseStreamEventData } from '../../../shared/types'
import { getLanguageValue } from '../../../shared/utils'
import useCourse from '../../hooks/useCourse'
import useInfoTexts from '../../hooks/useInfoTexts'
import useLocalStorageState from '../../hooks/useLocalStorageState'
import { useRagIndices } from '../../hooks/useRagIndices'
import useRetryTimeout from '../../hooks/useRetryTimeout'
import useUserStatus from '../../hooks/useUserStatus'
import type { Message } from '../../types'
import { AppContext } from '../../util/AppContext'
import { ChatBox } from './ChatBox'
import { FileSearchInfo } from './CitationsBox'
import { Conversation } from './Conversation'
import { DisclaimerModal } from './Disclaimer'
import { handleCompletionStreamError } from './error'
import { ChatInfo } from './generics/ChatInfo'
import SettingsButton from './generics/SettingsButton'
import RagSelector from './RagSelector'
import { SettingsModal } from './SettingsModal'
import { getCompletionStream } from './util'

export const ChatV2 = () => {
  const { courseId } = useParams()

  const { data: course } = useCourse(courseId)

  const { ragIndices } = useRagIndices(courseId)
  const { infoTexts, isLoading: infoTextsLoading } = useInfoTexts()

  const { userStatus, isLoading: statusLoading, refetch: refetchStatus } = useUserStatus(courseId)

  // local storage states
  const localStoragePrefix = courseId ? `course-${courseId}` : 'general'
  const [activeModel, setActiveModel] = useLocalStorageState<{ name: string }>('model-v2', {
    name: DEFAULT_MODEL,
  })
  const [disclaimerStatus, setDisclaimerStatus] = useLocalStorageState<{
    open: boolean
  }>('disclaimer-status', { open: true })
  const [assistantInstructions, setAssistantInstructions] = useLocalStorageState<{ content: string }>(`${localStoragePrefix}-chat-instructions`, {
    content: DEFAULT_ASSISTANT_INSTRUCTIONS,
  })
  const [modelTemperature, setModelTemperature] = useLocalStorageState<{
    value: number
  }>(`${localStoragePrefix}-chat-model-temperature`, {
    value: DEFAULT_MODEL_TEMPERATURE,
  })

  const [messages, setMessages] = useLocalStorageState(`${localStoragePrefix}-chat-messages`, [] as Message[])
  const [prevResponse, setPrevResponse] = useLocalStorageState(`${localStoragePrefix}-prev-response`, { id: '' })
  const [fileSearch, setFileSearch] = useLocalStorageState<FileSearchCompletedData>(`${localStoragePrefix}-last-file-search`)

  // App States
  const [isFileSearching, setIsFileSearching] = useState<boolean>(false)
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false)
  const [fileName, setFileName] = useState<string>('')
  const [tokenUsageWarning, setTokenUsageWarning] = useState<string>('')
  const [tokenUsageAlertOpen, setTokenUsageAlertOpen] = useState<boolean>(false)
  const [allowedModels, setAllowedModels] = useState<string[]>([])
  const [saveConsent, setSaveConsent] = useState<boolean>(false)

  // Chat Streaming states
  const [completion, setCompletion] = useState<string>('')
  const [isCompletionDone, setIsCompletionDone] = useState<boolean>(true)
  const [streamController, setStreamController] = useState<AbortController>()

  // RAG states
  const [ragIndexId, setRagIndexId] = useState<number | undefined>()
  const [ragDisplay, setRagDisplay] = useState<boolean>(true)
  const ragIndex = ragIndices?.find((index) => index.id === ragIndexId)

  // Refs
  const appContainerRef = useContext(AppContext)
  const chatContainerRef = useRef<HTMLDivElement | null>(null)
  const conversationRef = useRef<HTMLElement | null>(null)
  const inputFieldRef = useRef<HTMLElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [setRetryTimeout, clearRetryTimeout] = useRetryTimeout()

  const decoder = new TextDecoder()
  const { t, i18n } = useTranslation()
  const { language } = i18n

  const disclaimerInfo = infoTexts?.find((infoText) => infoText.name === 'disclaimer')?.text[language] ?? null

  const processStream = async (stream: ReadableStream) => {
    try {
      const reader = stream.getReader()

      let content = ''
      let error = ''
      let fileSearch: FileSearchCompletedData

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const data = decoder.decode(value)

        let accumulatedChunk = ''
        for (const chunk of data.split('\n')) {
          if (!chunk || chunk.trim().length === 0) continue

          let parsedChunk: ResponseStreamEventData | undefined
          try {
            parsedChunk = JSON.parse(chunk)
          } catch (e: any) {
            console.error('Error', e)
            console.error('Could not parse the chunk:', chunk)
            accumulatedChunk += chunk

            try {
              parsedChunk = JSON.parse(accumulatedChunk)
              accumulatedChunk = ''
            } catch (e: any) {
              console.error('Error', e)
              console.error('Could not parse the accumulated chunk:', accumulatedChunk)
            }
          }

          if (!parsedChunk) continue

          switch (parsedChunk.type) {
            case 'writing':
              setCompletion((prev) => prev + parsedChunk.text)
              content += parsedChunk.text
              break

            case 'annotation':
              console.log('Received annotation:', parsedChunk.annotation)
              break

            case 'fileSearchStarted':
              setIsFileSearching(true)
              break

            case 'fileSearchDone':
              fileSearch = parsedChunk.fileSearch
              setFileSearch(parsedChunk.fileSearch)
              setIsFileSearching(false)
              break

            case 'error':
              error += parsedChunk.error
              break

            case 'complete':
              setPrevResponse({ id: parsedChunk.prevResponseId })
              break

            default:
              break
          }
        }
      }

      setMessages((prev: Message[]) =>
        prev.concat({
          role: 'assistant',
          content,
          error,
          fileSearchResult: fileSearch,
        }),
      )
    } catch (err: any) {
      handleCompletionStreamError(err, fileName)
    } finally {
      setStreamController(undefined)
      setCompletion('')
      setIsCompletionDone(true)
      refetchStatus()
      setFileName('')
      setIsFileSearching(false)
      clearRetryTimeout()
    }
  }

  const handleSubmit = async (message: string, ignoreTokenUsageWarning: boolean) => {
    const formData = new FormData()

    let file = fileInputRef.current?.files?.[0]
    if (file) {
      if (ALLOWED_FILE_TYPES.includes(file.type)) {
        formData.append('file', file)
      } else {
        console.error('File not attached')
        file = undefined
      }
    }

    const newMessages = messages.concat({
      role: 'user',
      content: message,
      attachements: file && fileName ? fileName : undefined,
    })

    setMessages(newMessages)
    setPrevResponse({ id: '' })
    setCompletion('')
    setIsCompletionDone(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setFileName('')
    setFileSearch(undefined)
    setIsFileSearching(false)
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
        modelTemperature: modelTemperature.value,
        courseId,
        abortController: streamController,
        saveConsent,
        prevResponseId: prevResponse.id,
      })

      if (!stream) {
        console.error('Stream is undefined')
        return
      }

      if (ignoreTokenUsageWarning) {
        setTokenUsageWarning('')
        setTokenUsageAlertOpen(false)
      } else if (tokenUsageAnalysis?.tokenUsageWarning) {
        setTokenUsageWarning(tokenUsageAnalysis.message)
        setTokenUsageAlertOpen(true)
        return
      }

      clearRetryTimeout()
      if (stream) {
        await processStream(stream)
      }
    } catch (err: any) {
      console.error(err)
    }
  }

  const handleRagDisplay = () => {
    setRagDisplay((prev) => !prev)
  }

  const handleReset = () => {
    if (window.confirm('Are you sure you want to empty this conversation?')) {
      setMessages([])
      setPrevResponse({ id: '' })
      setCompletion('')
      setIsCompletionDone(true)
      if (!ragDisplay) {
        handleRagDisplay()
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setFileName('')
      setFileSearch(undefined)
      setStreamController(undefined)
      setTokenUsageWarning('')
      setTokenUsageAlertOpen(false)
      setRetryTimeout(() => {
        if (streamController) {
          streamController.abort()
        }
      }, 5000)
      clearRetryTimeout()
    }
  }

  const handleCancel = () => {
    setIsCompletionDone(true)
    setStreamController(undefined)
    setTokenUsageWarning('')
    setTokenUsageAlertOpen(false)
    clearRetryTimeout()
  }

  useEffect(() => {
    // Scrolls to bottom on initial load only
    if (!appContainerRef?.current || !conversationRef.current || messages.length === 0) return
    if (isCompletionDone) {
      const container = appContainerRef?.current
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'instant',
        })
      }
    }
  }, [])

  // @todo fix this shit when having long file search results
  useEffect(() => {
    // Scrolls to last assistant message on text generation
    if (!appContainerRef?.current || !conversationRef.current || messages.length === 0) return

    const lastNode = conversationRef.current.lastElementChild as HTMLElement

    if (lastNode.classList.contains('message-role-assistant') && !isCompletionDone) {
      const container = appContainerRef.current

      const containerRect = container.getBoundingClientRect()
      const lastNodeRect = lastNode.getBoundingClientRect()

      const scrollTopPadding = 220
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
      const allowedModels = validModels.map((m) => m.name) // [gpt-4.1, gpt-4o, gpt-4o-mini] 25.6.2025
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

  if (course?.activityPeriod) {
    const { startDate, endDate } = course.activityPeriod
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

  const showFileSearch = isFileSearching || messages.some((m) => m.fileSearchResult) || fileSearch
  const showRagSelector = (ragIndices?.length ?? 0) > 0

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        height: '100%',
        width: '100%',
        maxWidth: '100%',
        overflowX: 'clip',
      }}
    >
      {/* Chat side panel column -------------------------------------------------------------------------------------------*/}
      <Box
        sx={{
          flex: 1,
          minWidth: 300,
          position: 'relative',
          borderRight: '1px solid rgba(0, 0, 0, 0.12)',
        }}
      >
        <Box sx={{ position: 'sticky', top: 70, padding: '2rem 1.5rem' }}>
          {course && <ChatInfo course={course} />}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', mb: '2rem' }}>
            <SettingsButton startIcon={<DeleteIcon />} onClick={handleReset}>
              {t('chat:emptyConversation')}
            </SettingsButton>
            <SettingsButton startIcon={<EmailIcon />} onClick={() => alert('Not yet supported')}>
              {t('email:save')}
            </SettingsButton>
            <SettingsButton startIcon={<SettingsIcon />} onClick={() => setSettingsModalOpen(true)}>
              {t('chat:settings')}
            </SettingsButton>
            <SettingsButton startIcon={<HelpIcon />} onClick={() => setDisclaimerStatus({ open: true })}>
              {t('info:title')}
            </SettingsButton>
          </Box>
          {course && showRagSelector && (
            <>
              <Typography variant="h6" mb={'0.5rem'} fontWeight="bold">
                {t('settings:courseMaterials')}
              </Typography>
              <RagSelector currentRagIndex={ragIndex} setRagIndex={setRagIndexId} ragIndices={ragIndices ?? []} />
            </>
          )}
        </Box>
      </Box>

      {/* Chat view column ------------------------------------------------------------------------------------------------ */}
      <Box
        ref={chatContainerRef}
        sx={{
          flex: 3,
          minWidth: 800,
          width: '100%',
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
            maxWidth: '80%',
            margin: 'auto',
            paddingTop: '1rem',
            paddingBottom: '8rem',
            overflowY: 'auto',
          }}
        >
          <Alert severity="info">{t('chat:testUseInfo')}</Alert>
          <Conversation
            courseName={course && getLanguageValue(course.name, language)}
            courseDate={course?.activityPeriod}
            conversationRef={conversationRef}
            expandedNodeHeight={window.innerHeight - (inputFieldRef.current?.clientHeight ?? 0) - 300}
            messages={messages}
            completion={completion}
            isCompletionDone={isCompletionDone}
            fileSearchResult={fileSearch}
            hasRagIndex={!!ragIndex}
            ragDisplay={ragDisplay}
            toggleRagDisplay={handleRagDisplay}
          />
        </Box>

        <Box
          ref={inputFieldRef}
          sx={{
            position: 'sticky',
            bottom: 0,
            paddingBottom: '1rem',
            width: '80%',
            minWidth: 750,
            margin: 'auto',
            backgroundColor: 'white',
          }}
        >
          <ChatBox
            disabled={!isCompletionDone}
            currentModel={activeModel.name}
            availableModels={allowedModels}
            fileInputRef={fileInputRef}
            fileName={fileName}
            setFileName={setFileName}
            saveConsent={saveConsent}
            setSaveConsent={setSaveConsent}
            tokenUsageWarning={tokenUsageWarning}
            tokenUsageAlertOpen={tokenUsageAlertOpen}
            saveChat={!!course && course.saveDiscussions}
            notOptoutSaving={!!course && course.notOptoutSaving}
            setModel={(name) => setActiveModel({ name })}
            handleCancel={handleCancel}
            handleContinue={(newMessage) => handleSubmit(newMessage, true)}
            handleSubmit={(newMessage) => handleSubmit(newMessage, false)}
          />
        </Box>
      </Box>

      {/* Annotations columns ----------------------------------------------------------------------------------------------------- */}
      <Box
        sx={{
          flex: 1,
          minWidth: 300,
          height: '100vh',
          position: 'sticky',
          top: 70,
        }}
      >
        {showFileSearch && (
          <FileSearchInfo
            isFileSearching={isFileSearching}
            fileSearchResult={fileSearch}
            messages={messages}
            ragDisplay={ragDisplay}
            toggleRagDisplay={handleRagDisplay}
          />
        )}
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
        showRagSelector={showRagSelector}
        setRagIndex={setRagIndexId}
        ragIndices={ragIndices}
        currentRagIndex={ragIndex}
        course={course}
      />

      <DisclaimerModal disclaimer={disclaimerInfo} disclaimerStatus={disclaimerStatus} setDisclaimerStatus={setDisclaimerStatus} />
    </Box>
  )
}
