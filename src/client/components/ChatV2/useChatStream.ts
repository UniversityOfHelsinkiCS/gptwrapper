import { useRef, useState } from 'react'
import type { MessageGenerationInfo } from '../../../shared/chat'
import type { AssistantMessageV2, AssistantPart, ChatEvent } from '../../../shared/agentChat'
import { applyEvent, finishParts } from './applyEvent'

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

/** Anything that can abort the current run with a reason, such as a `ChatTransport`. */
export type StreamAbortHandle = {
  readonly signal: AbortSignal
  abort(reason: StreamAbortReason): void
}

const NO_PARTS: AssistantPart[] = []

export const useChatStream = ({
  onComplete,
  onError,
  onText,
}: {
  onComplete: ({ message }: { message: AssistantMessageV2 }) => void
  onError: (error: unknown) => void
  onText: () => void
}) => {
  const [streamingParts, setStreamingParts] = useState<AssistantPart[]>(NO_PARTS)
  const [generationInfo, setGenerationInfo] = useState<MessageGenerationInfo | undefined>()
  const [isStreaming, setIsStreaming] = useState(false)
  const [hasPotentialError, setHasPotentialError] = useState(false)

  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const streamControllerRef = useRef<StreamAbortHandle>(null)

  const processStream = async (events: AsyncIterable<ChatEvent>, baseGenerationInfo: MessageGenerationInfo) => {
    let parts: AssistantPart[] = NO_PARTS
    let error = ''
    // The stream usually breaks right after an error event, which must not report the same failure again
    let errorReported = false
    setGenerationInfo(baseGenerationInfo)

    const message = (messageError: string | undefined): AssistantMessageV2 => ({
      role: 'assistant',
      // A model that only reasoned (aborted, or failed before answering) still gets its thinking time.
      parts: finishParts(parts, Date.now()),
      error: messageError,
      generationInfo: baseGenerationInfo,
    })

    try {
      for await (const event of events) {
        handleEvent(event)
      }

      onComplete({ message: message(error.length > 0 ? error : undefined) })
    } catch (err: unknown) {
      if (streamControllerRef.current?.signal.aborted) {
        const reason = streamControllerRef.current?.signal.reason as StreamAbortReason | undefined

        switch (reason) {
          case 'timeout_error':
            onComplete({ message: message('timeout_error') })
            return

          case 'user_aborted':
            onComplete({ message: message(error.length > 0 ? error : undefined) })
            return

          case 'conversation_cleared':
            setStreamingParts(NO_PARTS)
            return
        }
      } else {
        error += '\nResponse stream was interrupted'
      }
      if (!errorReported) onError(err)
      if (parts.length > 0) {
        onComplete({ message: message(error.length > 0 ? error : undefined) })
      }
    } finally {
      // A pending error timeout would otherwise abort the next stream's controller
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current)
        errorTimeoutRef.current = null
      }
      streamControllerRef.current = null
      setStreamingParts(NO_PARTS)
      setIsStreaming(false)
      setGenerationInfo(undefined)
    }

    function handleEvent(event: ChatEvent) {
      onText()

      // Successfully received something, so clear any existing error timeout
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current)
        errorTimeoutRef.current = null
        setHasPotentialError(false)
      }

      if (event.type === 'error') {
        error += event.error

        errorReported = true
        onError({ error: event.error })

        errorTimeoutRef.current = setTimeout(() => {
          console.error('Error timeout:', event)
          streamControllerRef.current?.abort('error')
        }, 3000)
        setHasPotentialError(true)
        return
      }

      const next = applyEvent(parts, event)
      if (next !== parts) {
        parts = next
        setStreamingParts(next)
      }
    }
  }

  return {
    processStream,
    streamingParts,
    generationInfo,
    isStreaming,
    setIsStreaming,
    streamControllerRef,
    hasPotentialError,
  }
}
