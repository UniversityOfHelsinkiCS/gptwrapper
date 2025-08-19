import { useState } from 'react'
import type { FileSearchCompletedData, ResponseStreamEventData } from '../../../shared/types'
import type { Message } from '../../types'
import { ChatToolDef } from '../../../shared/tools'

type ToolCallState = { id: string; name: ChatToolDef['name'] } & (
  | {
      status: 'starting'
    }
  | {
      input: ChatToolDef['input']
      status: 'started'
    }
  | {
      status: 'completed'
      input?: ChatToolDef['input'] // Have to allow optional because it is possible "started" state was not reached before completed.
      artifacts: ChatToolDef['artifacts']
    }
)

export const useChatStream = ({
  onFileSearchComplete,
  onComplete,
  onError,
  onText,
}: {
  onFileSearchComplete: (data: FileSearchCompletedData) => void
  onComplete: ({ previousResponseId, message }: { previousResponseId: string | undefined; message: Message }) => void
  onError: (error: unknown) => void
  onText: () => void
}) => {
  const [completion, setCompletion] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [toolCalls, setToolCalls] = useState<ToolCallState[]>([])
  const [streamController, setStreamController] = useState<AbortController>()

  const decoder = new TextDecoder()

  const processStream = async (stream: ReadableStream) => {
    let content = ''
    let error = ''
    let fileSearch: FileSearchCompletedData | undefined
    let previousResponseId: string | undefined

    try {
      const reader = stream.getReader()

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

          onText()
          switch (parsedChunk.type) {
            case 'writing':
              setCompletion((prev) => prev + parsedChunk.text)
              content += parsedChunk.text
              break

            case 'toolCallStarting':
              setToolCalls((prev) => [
                ...prev,
                {
                  id: parsedChunk.id,
                  name: parsedChunk.name,
                  status: 'starting',
                },
              ])
              break

            case 'toolCallStarted':
              setToolCalls((prev) =>
                prev.map((call) =>
                  call.id === parsedChunk.id && call.status === 'starting' ? { ...call, status: 'started', input: parsedChunk.input } : call,
                ),
              )
              break

            case 'toolCallCompleted':
              setToolCalls((prev) =>
                prev.map((call) => (call.id === parsedChunk.id ? { ...call, status: 'completed', artifacts: parsedChunk.artifacts } : call)),
              )
              break

            case 'error':
              error += parsedChunk.error
              break

            case 'complete':
              previousResponseId = parsedChunk.prevResponseId
              break

            default:
              break
          }
        }
      }
    } catch (err: unknown) {
      error += '\nResponse stream was interrupted'
      onError(err)
    } finally {
      setStreamController(undefined)
      setCompletion('')
      setToolCalls([])
      setIsStreaming(false)

      onComplete({
        previousResponseId,
        message: {
          role: 'assistant',
          content,
          error: error.length > 0 ? error : undefined,
          fileSearchResult: fileSearch,
        },
      })
    }
  }

  return {
    processStream,
    completion,
    isStreaming,
    setIsStreaming,
    toolCalls,
    streamController,
  }
}
