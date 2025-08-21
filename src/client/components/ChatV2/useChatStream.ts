import { useState } from 'react'
import type { Message } from '../../types'
import type { ChatEvent, ToolCallResultEvent, ToolCallStatusEvent } from '../../../shared/chat'

type ToolCallState = ToolCallStatusEvent

export const useChatStream = ({
  onComplete,
  onError,
  onText,
}: {
  onComplete: ({ previousResponseId, message }: { previousResponseId: string | undefined; message: Message }) => void
  onError: (error: unknown) => void
  onText: () => void
}) => {
  const [completion, setCompletion] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [toolCalls, setToolCalls] = useState<Record<string, ToolCallState>>({})
  const [streamController, setStreamController] = useState<AbortController>()

  const decoder = new TextDecoder()

  const processStream = async (stream: ReadableStream) => {
    let content = ''
    let error = ''
    const toolCallResultsAccum: Record<string, ToolCallResultEvent> = {}
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

          let parsedChunk: ChatEvent | undefined
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

            case 'toolCallStatus':
              if ('result' in parsedChunk) {
                toolCallResultsAccum[parsedChunk.callId] = parsedChunk
              }
              setToolCalls((prev) => ({ ...prev, [parsedChunk.callId]: parsedChunk }))
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
      setToolCalls({})
      setIsStreaming(false)

      onComplete({
        previousResponseId,
        message: {
          role: 'assistant',
          content,
          error: error.length > 0 ? error : undefined,
          toolCalls: toolCallResultsAccum,
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
