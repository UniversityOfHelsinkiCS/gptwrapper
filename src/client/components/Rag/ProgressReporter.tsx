import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { orderBy } from 'lodash'
import { useEffect, useReducer } from 'react'
import { IngestionPipelineStageKey, IngestionPipelineStageKeys, IngestionPipelineStages } from '../../../shared/constants'

type ProgressEvent = {
  stage: string
  items?: string[]
  done?: boolean
  error?: string
}

type ProgressState = Record<
  IngestionPipelineStageKey,
  {
    count: number
    done: boolean
    error: boolean
    files: {
      [fileName: string]: {
        count: number
        done: boolean
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
        done: false,
        error: false,
        files: {},
      },
    ]),
  ) as ProgressState

type Action = { type: 'UPDATE'; payload: ProgressEvent } | { type: 'RESET' }

const progressReducer = (state: ProgressState, action: Action): ProgressState => {
  switch (action.type) {
    case 'UPDATE': {
      const { stage, items, done, error } = action.payload

      if (done) {
        return {
          ...state,
          [stage]: {
            ...state[stage],
            done: true,
            error: !!error || false,
          },
        }
      }

      if (!items) return state

      const updatedFiles = items.reduce(
        (acc, fileName) => {
          if (!acc[fileName]) {
            acc[fileName] = { count: 0, done: done || false, error: !!error || false }
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
          done: done || state[stage]?.done,
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

  console.log('Progress state:', progress)

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>File</TableCell>
          {IngestionPipelineStageKeys.map((stage) => (
            <TableCell key={stage}>
              <Typography variant="body2">{IngestionPipelineStages[stage].name}</Typography>
              <Typography variant="caption" color="textSecondary">
                {progress[stage].count}{' '}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {progress[stage].done ? 'Done' : progress[stage].error ? 'Error' : 'In Progress'}
              </Typography>
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {filenames.map((filename) => (
          <TableRow key={filename}>
            <TableCell component="th" scope="row">
              {filename}
            </TableCell>
            {IngestionPipelineStageKeys.map((stage) => (
              <TableCell
                key={stage}
                sx={{
                  transition: 'background-color 0.3s',
                  backgroundColor: progress[stage]?.error
                    ? 'error.light'
                    : progress[stage]?.done
                      ? 'success.light'
                      : progress[stage]?.files[filename]?.error
                        ? 'error.light'
                        : progress[stage]?.files[filename]?.count
                          ? 'info.light'
                          : 'inherit',
                }}
              >
                <Box display="flex" gap={2}>
                  <Typography variant="body2">{progress[stage].files[filename]?.count > 1 || ''}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    {progress[stage]?.files[filename]?.done ? 'Done' : progress[stage].files[filename]?.error ? 'Error' : ''}
                  </Typography>
                </Box>
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
