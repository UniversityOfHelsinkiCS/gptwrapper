import { useState } from 'react'
import type { FileSearchCompletedData, ResponseStreamEventData } from '../../../shared/types'
import type { Message } from '../../types'

export const useChatStream = ({
  onFileSearchComplete,
  onComplete,
  onError,
}: {
  onFileSearchComplete: (data: FileSearchCompletedData) => void
  onComplete: ({ previousResponseId, message }: { previousResponseId: string | undefined; message: Message }) => void
  onError: (error: unknown) => void
}) => {
  const [completion, setCompletion] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isFileSearching, setIsFileSearching] = useState(false)
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
              onFileSearchComplete(parsedChunk.fileSearch)
              setIsFileSearching(false)
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
      setIsFileSearching(false)
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
    isFileSearching,
    streamController,
  }
}
