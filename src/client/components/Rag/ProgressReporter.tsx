import { Box, Typography } from '@mui/material'
import { useEffect, useReducer } from 'react'

type ProgressEvent = {
  stage: string
  item?: string
  done?: boolean
  error?: string
}

type ProgressState = {
  [fileName: string]: {
    [stage: string]: {
      count: number
      done: boolean
    }
  }
}

type Action = { type: 'UPDATE'; payload: ProgressEvent } | { type: 'RESET' }

const progressReducer = (state: ProgressState, action: Action): ProgressState => {
  switch (action.type) {
    case 'UPDATE': {
      const { stage, item, done } = action.payload
      if (done) {
        // mark all items at this stage as done
        const newState = { ...state }
        for (const file in newState) {
          if (newState[file][stage]) {
            newState[file][stage].done = true
          }
        }
        return newState
      }
      if (!item) return state

      const fileStages = state[item] || {}
      const stageData = fileStages[stage] || { count: 0, done: false }

      return {
        ...state,
        [item]: {
          ...fileStages,
          [stage]: {
            count: stageData.count + 1,
            done: stageData.done || false,
          },
        },
      }
    }

    case 'RESET':
      return {}

    default:
      return state
  }
}

export const ProgressReporter: React.FC<{ stream: ReadableStream | null }> = ({ stream }) => {
  const [progress, dispatch] = useReducer(progressReducer, {})

  useEffect(() => {
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null
    if (stream) {
      // Check if the stream is readable
      try {
        reader = stream.getReader()
      } catch (error) {
        console.error('Error getting reader from stream:', error)
        return
      }

      const decoder = new TextDecoder('utf-8')

      const readStream = async () => {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break

          const chunkText = decoder.decode(value, { stream: true })
          const lines = chunkText.split('\n')

          for (const line of lines) {
            if (line.trim()) {
              console.log('Received chunk:', line)
              try {
                const jsonChunk = JSON.parse(line)
                dispatch({ type: 'UPDATE', payload: jsonChunk })
              } catch (err) {
                console.error('Invalid chunk:', line, err)
              }
            }
          }
        }
      }

      readStream()

      return () => {
        if (reader) {
          reader.releaseLock()
        }
      }
    }
  }, [stream])

  return (
    <Box>
      {Object.entries(progress).map(([file, stages]) => (
        <div key={file} className="border p-2 rounded shadow">
          <h3 className="font-bold text-lg">{file}</h3>
          <ul className="ml-4 list-disc">
            {Object.entries(stages).map(([stage, { count, done }]) => (
              <li key={stage}>
                <span className="font-medium">{stage}:</span> {done ? "✅ Done" : `🔄 Processing (${count}x)`}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Box>
  )
}
