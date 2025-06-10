import { useState, useRef, useContext, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import useCourse from '../../hooks/useCourse'
import useUserStatus from '../../hooks/useUserStatus'
import useLocalStorageState from '../../hooks/useLocalStorageState'
import { DEFAULT_MODEL, DEFAULT_ASSISTANT_INSTRUCTIONS, DEFAULT_MODEL_TEMPERATURE } from '../../../config'
import useInfoTexts from '../../hooks/useInfoTexts'
import { Message } from '../../types'
import { FileSearchResult, ResponseStreamEventData } from '../../../shared/types'
import useRetryTimeout from '../../hooks/useRetryTimeout'
import { useTranslation } from 'react-i18next'
import { handleCompletionStreamError } from './error'
import { getCompletionStream } from './util'

import { Box, Typography, Fade, Collapse } from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings'
import EmailIcon from '@mui/icons-material/Email'
import DeleteIcon from '@mui/icons-material/Delete'

import { Disclaimer } from './Disclaimer'
import { Conversation } from './Conversation'
import { ChatBox } from './ChatBox'
import { SystemPrompt } from './System'
import { SettingsModal } from './SettingsModal'

import { CitationsBox } from './CitationsBox'
import { useRagIndices } from '../../hooks/useRagIndices'
import CourseOption from './generics/CourseOption'
import SettingsButton from './generics/SettingsButton'

import { AppContext } from '../../util/AppContext'

export const ChatV2 = () => {
  const { courseId } = useParams()
  const { course } = useCourse(courseId)
  const { ragIndices } = useRagIndices(courseId)
  const { infoTexts, isLoading: infoTextsLoading } = useInfoTexts()

  const { userStatus, isLoading: statusLoading, refetch: refetchStatus } = useUserStatus(courseId)

  // local storage states
  const localStoragePrefix = 'general'
  const [model, setModel] = useLocalStorageState<{ name: string }>('model-v2', {
    name: DEFAULT_MODEL,
  })
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

  // UI States
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false)
  const [fileName, setFileName] = useState<string>('')
  const [alertOpen, setAlertOpen] = useState<boolean>(false)
  const [disallowedFileType, setDisallowedFileType] = useState<string>('')
  const [tokenUsageWarning, setTokenUsageWarning] = useState<string>('')
  const [tokenWarningVisible, setTokenWarningVisible] = useState<boolean>(false)
  const [saveConsent, setSaveConsent] = useState<boolean>(true)

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
  const chatHeaderRef = useRef<HTMLElement>(null)
  const inputFieldRef = useRef<HTMLElement>(null)

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
    const newMessages = messages.concat({ role: 'user', content: message })
    setMessages(newMessages)
    setMessage({ content: '' })
    setPrevResponse({ id: '' })
    setCompletion('')
    setIsCompletionDone(false)
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
        model: model.name,
        formData: new FormData(),
        userConsent: true,
        modelTemperature: modelTemperature.value,
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
    setIsCompletionDone(true)
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

  useEffect(() => {
    // Fethces data from local storage according to chat
    console.log('course changed')
  }, [course])

  useEffect(() => {
    // Scrolls to bottom on initial load only
    if (!appContainerRef.current || !conversationRef.current || !chatHeaderRef.current || messages.length === 0) return
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
    if (!appContainerRef.current || !conversationRef.current || !chatHeaderRef.current || messages.length === 0) return

    const lastNode = conversationRef.current.lastElementChild as HTMLElement

    if (lastNode.classList.contains('message-role-assistant') && !isCompletionDone) {
      const container = appContainerRef.current
      const settingsHeight = chatHeaderRef.current.clientHeight

      const containerRect = container.getBoundingClientRect()
      const lastNodeRect = lastNode.getBoundingClientRect()

      const scrollTopPadding = 200
      const scrollOffset = lastNodeRect.top - containerRect.top + container.scrollTop - settingsHeight - scrollTopPadding

      container.scrollTo({
        top: scrollOffset,
        behavior: 'smooth',
      })
    }
  }, [isCompletionDone])

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
      {/* Chat selection column -------------------------------------------------------------------------------------------*/}
      <Box sx={{ position: 'relative', flex: 1, borderRight: '1px solid rgba(0, 0, 0, 0.12)' }}>
        <Box sx={{ position: 'sticky', top: 80, padding: '2rem 1.5rem' }}>
          <Typography variant="h6" fontWeight="light">
            Currechat
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', padding: '0.5rem' }}>
            <CourseOption link="/v2" isActive={!course}>
              Tavallinen
            </CourseOption>
          </Box>

          <Typography variant="h6" fontWeight="light" mt={'2rem'} mb="0.2rem">
            Kurssichatit
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', padding: '0.5rem' }}>
            <CourseOption link="/v2/sandbox" isActive={!!course}>
              Sandbox
            </CourseOption>
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
          ref={chatHeaderRef}
          sx={{
            position: 'sticky',
            top: 80,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'white',
            padding: '1.8rem 1rem 0.8rem 1rem',
            zIndex: 10,
          }}
        >
          <Collapse in={!!course} timeout={100}>
            <Fade in={true} timeout={800}>
              <Typography variant="h5" sx={{ textAlign: 'center', fontWeight: 'bold', mb: '1.5rem' }}>
                {course?.id === 'sandbox' ? 'Sandbox' : course?.id}
              </Typography>
            </Fade>
          </Collapse>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
            {/* {disclaimerInfo && <Disclaimer disclaimer={disclaimerInfo} />}
          {/* <SettingsButton startIcon={<AddCommentIcon />}>Alustus</SettingsButton> */}
            <SettingsButton startIcon={<SettingsIcon />} onClick={() => setSettingsModalOpen(true)}>
              Keskustelun asetukset
            </SettingsButton>
            <SettingsButton startIcon={<EmailIcon />} onClick={() => alert('Ei toimi vielä')}>
              Tallenna sähköpostina
            </SettingsButton>
            <SettingsButton startIcon={<DeleteIcon />} onClick={handleReset}>
              Tyhjennä
            </SettingsButton>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '70%',
            margin: 'auto',
            paddingTop: '1rem',
            paddingBottom: '8rem',
          }}
        >
          <Conversation
            conversationRef={conversationRef}
            expandedNodeHeight={window.innerHeight - chatHeaderRef.current?.clientHeight - inputFieldRef.current?.clientHeight}
            messages={messages}
            completion={completion}
            isCompletionDone={isCompletionDone}
            fileSearchResult={fileSearchResult}
            hasRagIndex={!!ragIndex}
          />
        </Box>

        <Box ref={inputFieldRef} sx={{ position: 'sticky', bottom: 0, backgroundColor: 'white', paddingBottom: '1.5rem' }}>
          <ChatBox
            disabled={!isCompletionDone}
            currentModel={model.name}
            setModel={(name) => setModel({ name })}
            onSubmit={(message) => {
              if (message.trim()) {
                handleSubmit(message)
                setMessage({ content: '' })
              }
            }}
          />
        </Box>
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

      {/* Modal --------------------------------------*/}
      <SettingsModal
        open={settingsModalOpen}
        setOpen={setSettingsModalOpen}
        assistantInstructions={assistantInstructions.content}
        setAssistantInstructions={(updatedInstructions) => setAssistantInstructions({ content: updatedInstructions })}
        modelTemperature={modelTemperature.value}
        setModelTemperature={(updatedTemperature) => setModelTemperature({ value: updatedTemperature })}
        model={model.name}
        setModel={(name) => setModel({ name })}
        setRagIndex={setRagIndexId}
        ragIndices={ragIndices}
        currentRagIndex={ragIndex}
      />
    </Box>
  )
}
