/* eslint-disable jsx-a11y/aria-role */
import React from 'react'
import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import { Person, Assistant, Stop } from '@mui/icons-material'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useTranslation } from 'react-i18next'

import { Message, Role } from '../../types'

export const Response = ({
  role,
  content,
}: {
  role: Role
  content: string
}) => {
  const isUser = role === 'user'

  return (
    <Box mb={2} overflow="auto">
      <Box display="inline-block">
        <Paper variant="outlined">
          <Box display="flex">
            {isUser ? (
              <Person sx={{ mx: 3, my: 4 }} />
            ) : (
              <Assistant sx={{ mx: 3, my: 4 }} />
            )}
            <Box pr={7} py={2}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                className="line-break-markdown"
              >
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
}: {
  messages: Message[]
  completion: string
  handleStop?: () => void
}) => {
  const { t } = useTranslation()

  if (messages.length === 0 && !completion) return null

  return (
    <Box>
      <Box mb={1}>
        <Typography variant="h6">{t('chat:conversation')}</Typography>
      </Box>
      {messages.map(({ role, content }, index) => (
        // eslint-disable-next-line
        <Response key={content + index} role={role} content={content} />
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
