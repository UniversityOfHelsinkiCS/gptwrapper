import { LinearProgress, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { useEffect, useReducer } from 'react'
import { IngestionPipelineStageKey, IngestionPipelineStageKeys, IngestionPipelineStages } from '../../../shared/constants'

type ProgressEvent = {
  stage: string
  items?: string[]
  error?: string
}

type ProgressState = Record<
  IngestionPipelineStageKey,
  {
    count: number
    error: boolean
    files: {
      [fileName: string]: {
        count: number
        error: boolean
      }
    }
  }
>

const getInitialProgressState = () =>
  Object.fromEntries(
    IngestionPipelineStageKeys.map((stage) => [
      stage,
      {
        count: 0,
        error: false,
        files: {},
      },
    ]),
  ) as ProgressState

type Action = { type: 'UPDATE'; payload: ProgressEvent } | { type: 'RESET' }

const progressReducer = (state: ProgressState, action: Action): ProgressState => {
  switch (action.type) {
    case 'UPDATE': {
      const { stage, items, error } = action.payload

      if (!items) return state

      const updatedFiles = items.reduce(
        (acc, fileName) => {
          if (!acc[fileName]) {
            acc[fileName] = { count: 0, error: !!error || false }
          }
          acc[fileName].count += 1
          return acc
        },
        { ...state[stage].files },
      )

      return {
        ...state,
        [stage]: {
          ...state[stage],
          error: !!error || state[stage]?.error,
          count: state[stage]?.count + items.length,
          files: updatedFiles,
        },
      }
    }

    case 'RESET':
      return getInitialProgressState()

    default:
      return state
  }
}

export const ProgressReporter: React.FC<{ filenames: string[]; stream: ReadableStream | null; onError: () => void }> = ({ filenames, stream, onError }) => {
  const [progress, dispatch] = useReducer(progressReducer, getInitialProgressState())

  useEffect(() => {
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null
    if (stream) {
      // Check if the stream is readable
      try {
        reader = stream.getReader()
      } catch (error) {
        console.error('Error getting reader from stream:', error)
        dispatch({ type: 'RESET' })
        onError()
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
                onError()
              }
            }
          }
        }
      }

      readStream()
    } else {
      dispatch({ type: 'RESET' })
    }

    return () => {
      if (reader) {
        reader.releaseLock()
        dispatch({ type: 'RESET' })
      }
    }
  }, [stream])

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>File</TableCell>
          {IngestionPipelineStageKeys.map((stage) => (
            <TableCell key={stage}>
              <Typography variant="body2">{IngestionPipelineStages[stage].name}</Typography>
              <Typography variant="caption" color="textSecondary">
                {progress[stage].count}/{filenames.length}
              </Typography>
              {progress[stage].error && (
                <Typography variant="caption" color="error">
                  Error
                </Typography>
              )}
            </TableCell>
          ))}
          <TableCell>Status</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {filenames.map((filename) => (
          <TableRow key={filename}>
            <TableCell component="th" scope="row">
              {filename}
            </TableCell>
            <TableCell colSpan={IngestionPipelineStageKeys.length}>
              <LinearProgress
                variant="determinate"
                value={(IngestionPipelineStageKeys.reduce((acc, stage) => acc + (progress[stage].files[filename]?.count ? 1 : 0), 0) / IngestionPipelineStageKeys.length) * 100}
              />
            </TableCell>
            <TableCell>
              {IngestionPipelineStageKeys.some((stage) => progress[stage].files[filename]?.error) ? (
                <Typography variant="body2" color="error">
                  Error
                </Typography>
              ) : progress['store']?.files[filename]?.count > 0 ? (
                <Typography variant="body2" color="textSecondary">
                  Completed
                </Typography>
              ) : IngestionPipelineStageKeys.some((stage) => progress[stage].files[filename]?.count) ? (
                <Typography variant="body2" color="textSecondary">
                  In Progress
                </Typography>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  Not Started
                </Typography>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
