import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Paper, Divider, Container } from '@mui/material'
import { Person, Assistant } from '@mui/icons-material'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { formatDateTime } from '../util'
import useCurrentUser from '../../../hooks/useCurrentUser'
import useCourse, { useCourseDiscussion } from '../../../hooks/useCourse'
import type { Discussion } from '../../../../shared/types'

const Message = ({ message }: { message: Discussion }) => {
  const prompt = message.metadata.messages[message.metadata.messages.length - 1]

  return (
    <Box style={{ marginBottom: '2em' }}>
      {message.metadata.messages.length === 2 && <Divider style={{ marginBottom: 25 }} />}
      <div style={{ fontWeight: 'bold', marginBottom: '1em' }}>{formatDateTime(message.createdAt)}</div>
      <Paper variant="outlined" style={{ marginBottom: '1em', backgroundColor: '#f5f5f5' }}>
        <Box display="flex">
          <Person sx={{ mx: 3, my: 4 }} />
          <Box pr={7} py={2}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{prompt.content}</ReactMarkdown>
          </Box>
        </Box>
      </Paper>
      <Paper variant="outlined">
        <Box display="flex">
          <Assistant sx={{ mx: 3, my: 4 }} />
          <Box pr={7} py={2}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.response}</ReactMarkdown>
          </Box>
        </Box>
      </Paper>
    </Box>
  )
}

const UserDiscussion = () => {
  const { i18n } = useTranslation()
  const { language } = i18n

  const { id, user_id } = useParams()
  const { user, isLoading: isUserLoading } = useCurrentUser()
  const { course, isLoading: courseLoading } = useCourse(id)
  const discussionQuery = useCourseDiscussion(id, user_id)

  if (!course || courseLoading || !discussionQuery.isSuccess || isUserLoading || !user) return null

  return (
    <Container sx={{ mt: '4rem', mb: '10rem' }} maxWidth="xl">
      <h2>{course.name[language]}</h2>

      <div>student: {user_id}</div>

      <div style={{ marginBottom: '2em' }}>
        {discussionQuery.data.map((u) => (
          <Message key={u.id} message={u} />
        ))}
      </div>
    </Container>
  )
}

export default UserDiscussion
