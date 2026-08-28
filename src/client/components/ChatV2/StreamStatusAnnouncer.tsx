import { Box } from '@mui/material'
import { visuallyHidden } from '@mui/utils'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

/*
 The meaningful states of an assistant turn, from a screen reader's point of view.
 Tokens arriving cannot produce a new state.
*/
export type StreamAnnouncementState = 'idle' | 'processing' | 'writing' | 'ready' | 'canceled' | 'error'
export type StreamEndState = 'none' | 'canceled' | 'error'

export const resolveAnnouncementState = ({
  isStreaming,
  hasCompletion,
  hasStreamed,
  endState,
}: {
  isStreaming: boolean
  hasCompletion: boolean
  hasStreamed: boolean
  endState: StreamEndState
}): StreamAnnouncementState => {
  if (isStreaming) {
    return hasCompletion ? 'writing' : 'processing'
  }

  if (endState === 'canceled') {
    return 'canceled'
  }

  if (endState === 'error') {
    return 'error'
  }

  return hasStreamed ? 'ready' : 'idle'
}

export const StreamStatusAnnouncer = ({
  isStreaming,
  hasCompletion,
  endState,
}: {
  isStreaming: boolean
  hasCompletion: boolean
  endState: StreamEndState
}) => {
  const { t } = useTranslation()
  const [state, setState] = useState<StreamAnnouncementState>('idle')
  const hasStreamedRef = useRef(false)

  useEffect(() => {
    if (isStreaming) {
      hasStreamedRef.current = true
    }

    setState(resolveAnnouncementState({ isStreaming, hasCompletion, hasStreamed: hasStreamedRef.current, endState }))
  }, [isStreaming, hasCompletion, endState])

  const messages: Record<StreamAnnouncementState, string> = {
    idle: '',
    processing: t('chat:processingRequest'),
    writing: t('chat:writingResponse'),
    ready: t('chat:responseReady'),
    canceled: t('chat:responseCanceled'),
    error: t('chat:responseFailed'),
  }

  return (
    <Box component="p" role="status" aria-live="polite" aria-atomic="true" data-testid="stream-status-announcer" sx={visuallyHidden}>
      {messages[state]}
    </Box>
  )
}
