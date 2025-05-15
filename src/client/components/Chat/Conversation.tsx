import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import { Person, Assistant, Stop } from '@mui/icons-material'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useTranslation } from 'react-i18next'
import CopyToClipboardButton from './CopyToClipboardButton'

import { Message, Role } from '../../types'

export const Response = ({ role, content, setMessage, id }: { role: Role; content: string; setMessage?: any; id: string }) => {
  const isUser = role === 'user'

  //Formats input string to have correctly formatted spaces and linebreaks.
  function formatContent(text: string): string {
    const contentWithCorrectSpaces = text.replace(/ /g, '&nbsp;')
    const contentWithCorrectBreaks = contentWithCorrectSpaces.replace(/\n/g, '  \n')
    return contentWithCorrectBreaks
  }

  const formattedContent: string = formatContent(content)

  return (
    <Box mb={2} overflow="auto">
      <Box display="inline-block">
        <Paper variant="outlined">
          <Box display="flex">
            {isUser ? (
              <>
                {setMessage && <CopyToClipboardButton copied={content} id={id} />}
                <Person sx={{ mx: 3, my: 4 }} />
              </>
            ) : (
              <>
                {setMessage && <CopyToClipboardButton copied={content} id={id} />}
                <Assistant sx={{ mx: 3, my: 4 }} />
              </>
            )}
            <Box pr={7} py={2}>
              <div id={id}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {
                    //the check avoids a bug when the AI answers with a formatted list.
                    isUser ? formattedContent : content
                  }
                </ReactMarkdown>
              </div>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  )
}

const Conversation = ({ messages, completion, handleStop = () => {}, setMessage }: { messages: Message[]; completion: string; handleStop?: () => void; setMessage?: any }) => {
  const { t } = useTranslation()

  if (messages.length === 0 && !completion) return null

  return (
    <Box>
      <Box mb={1}>
        <Typography variant="h6">{t('chat:conversation')}</Typography>
      </Box>

      {messages.map(({ role, content }, index) => (
        <Response id={`message-${index}`} key={content + index} role={role} content={content} setMessage={setMessage} />
      ))}
      {completion && (
        <>
          <Stack direction="row" spacing={4} mb="1rem" mt="2rem">
            <div className="loader" />
            <Button onClick={handleStop} variant="outlined" color="error" size="small" endIcon={<Stop />}>
              {t('chat:stop')}
            </Button>
          </Stack>
          <Response role="assistant" content={completion} id="message" />
        </>
      )}
    </Box>
  )
}

export default Conversation
