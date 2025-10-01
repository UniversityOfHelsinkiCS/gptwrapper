import { useRef, useState } from 'react'
import type { AssistantMessage, ChatEvent, MessageGenerationInfo, ToolCallResultEvent, ToolCallStatusEvent } from '../../../shared/chat'

export type StreamAbortReason = 'timeout_error' | 'user_aborted' | 'conversation_cleared' | 'error'
export class TypedAbortController<Reason extends string> {
  private inner = new AbortController()
  signal: AbortSignal

  constructor() {
    this.signal = this.inner.signal
  }

  abort(reason: Reason) {
    this.inner.abort(reason)
  }
}

type ToolCallState = ToolCallStatusEvent

export const useChatStream = ({
  onComplete,
  onToolCallComplete,
  onError,
  onText,
}: {
  onComplete: ({ message }: { message: AssistantMessage }) => void
  onToolCallComplete: (toolResult: ToolCallResultEvent) => void
  onError: (error: unknown) => void
  onText: () => void
}) => {
  const [completion, setCompletion] = useState('')
  const [generationInfo, setGenerationInfo] = useState<MessageGenerationInfo | undefined>()
  const [isStreaming, setIsStreaming] = useState(false)
  const [toolCalls, setToolCalls] = useState<Record<string, ToolCallState>>({})
  const streamControllerRef = useRef<TypedAbortController<StreamAbortReason>>(null)

  const decoder = new TextDecoder()

  const processStream = async (stream: ReadableStream, baseGenerationInfo: MessageGenerationInfo) => {
    let content = ''
    let error = ''
    const toolCallResultsAccum: Record<string, ToolCallResultEvent> = {}
    setGenerationInfo(baseGenerationInfo)

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
                onToolCallComplete(parsedChunk)
              }
              setToolCalls((prev) => ({ ...prev, [parsedChunk.callId]: parsedChunk }))
              break

            case 'error':
              error += parsedChunk.error
              break

            default:
              break
          }
        }
      }

      onComplete({
        message: {
          role: 'assistant',
          content,
          error: error.length > 0 ? error : undefined,
          toolCalls: toolCallResultsAccum,
          generationInfo: baseGenerationInfo,
        },
      })
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        const reason = streamControllerRef.current?.signal.reason as StreamAbortReason | undefined

        switch (reason) {
          case 'timeout_error':
            error += '\nTimeout error'
            break

          case 'user_aborted':
            onComplete({
              message: {
                role: 'assistant',
                content,
                error: error.length > 0 ? error : undefined,
                toolCalls: toolCallResultsAccum,
                generationInfo: baseGenerationInfo,
              },
            })
            return

          case 'conversation_cleared':
            setCompletion('')
            return
        }
      } else {
        error += '\nResponse stream was interrupted'
      }

      onError(err)
    } finally {
      streamControllerRef.current = null
      setCompletion('')
      setToolCalls({})
      setIsStreaming(false)
      setGenerationInfo(undefined)
    }
  }

  return {
    processStream,
    completion,
    generationInfo,
    isStreaming,
    setIsStreaming,
    toolCalls,
    streamControllerRef,
  }
}
