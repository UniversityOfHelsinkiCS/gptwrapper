/* eslint-disable jsx-a11y/aria-role */
import React from 'react'
import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import { Person, Assistant, Stop } from '@mui/icons-material'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useTranslation } from 'react-i18next'
import CopyToClipboardButton from './CopyToClipboardButton'

import { Message, Role } from '../../types'

export const Response = ({
  role,
  content,
  setMessage,
}: {
  role: Role
  content: string
  setMessage?: any
}) => {
  const isUser = role === 'user'

  return (
    <Box mb={2} overflow="auto">
      <Box display="inline-block">
        <Paper variant="outlined">
          <Box display="flex">
            {isUser ? (
              <>
                {setMessage && <CopyToClipboardButton copied={content} />}
                <Person sx={{ mx: 3, my: 4 }} />
              </>
            ) : (
              <>
                {setMessage && <CopyToClipboardButton copied={content} />}
                <Assistant sx={{ mx: 3, my: 4 }} />
              </>
            )}
            <Box pr={7} py={2}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  )
}

const Conversation = ({
  messages,
  completion,
  handleStop = () => {},
  setMessage,
}: {
  messages: Message[]
  completion: string
  handleStop?: () => void
  setMessage?: any
}) => {
  const { t } = useTranslation()

  if (messages.length === 0 && !completion) return null

  return (
    <Box>
      <Box mb={1}>
        <Typography variant="h6">{t('chat:conversation')}</Typography>
      </Box>
      {messages.map(({ role, content }, index) => (
        <Response
          // eslint-disable-next-line react/no-array-index-key
          key={content + index}
          role={role}
          content={content}
          setMessage={setMessage}
        />
      ))}
      {completion && (
        <>
          <Stack direction="row" spacing={4} mb="1rem" mt="2rem">
            <div className="loader" />
            <Button
              onClick={handleStop}
              variant="outlined"
              color="error"
              size="small"
              endIcon={<Stop />}
            >
              {t('chat:stop')}
            </Button>
          </Stack>
          <Response role="assistant" content={completion} />
        </>
      )}
    </Box>
  )
}

export default Conversation
