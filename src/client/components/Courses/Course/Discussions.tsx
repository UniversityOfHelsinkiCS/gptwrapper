import { useParams, Link as RouterLink, Route, Routes, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { TableBody, TableCell, TableHead, TableRow, Table, Link, Paper, Typography, Alert, Box, Stack } from '@mui/material'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import useCurrentUser from '../../../hooks/useCurrentUser'
import useCourse, { useCourseDiscussers, useCourseDiscussion } from '../../../hooks/useCourse'
import { BlueButton } from '../../ChatV2/general/Buttons'
import type { Discussion } from '../../../../shared/types'

const getChatMessages = (discussion: Discussion) => {
  return discussion.metadata?.chatMessages ?? (discussion.metadata as any)?.messages ?? []
}

const DiscussionView: React.FC = () => {
  return (
    <Routes>
      <Route index element={<DiscussionList />} />
      <Route path=":userId" element={<DiscussionDetail />} />
    </Routes>
  )
}

const DiscussionList: React.FC = () => {
  const { t, i18n } = useTranslation()
  const { language } = i18n
  const { courseId } = useParams<{ courseId: string }>()
  const { user, isLoading: isUserLoading } = useCurrentUser()
  const { data: course, isSuccess: isCourseSuccess } = useCourse(courseId ?? '')
  const { discussers, isLoading: discussersLoading } = useCourseDiscussers(courseId ?? '')

  if (!courseId || !course || !isCourseSuccess || isUserLoading || !user || discussersLoading) return null

  return (
    <div>
      {course.saveDiscussions && (
        <Paper
          variant="outlined"
          sx={{
            padding: '2%',
            mt: 2,
            width: '100%',
            borderRadius: '1.25rem',
          }}
        >
          <Typography variant="h6">{t('course:reseachCourse')}</Typography>
          <Alert severity="warning" style={{ marginTop: 20, marginBottom: 20 }}>
            <Typography>{t('course:isSavedNotOptOut')}</Typography>
          </Alert>
        </Paper>
      )}

      <h2>{course.name[language]}</h2>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>{t('course:student')}</TableCell>
            <TableCell>{t('course:messages')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {discussers.map((d, idx) => (
            <TableRow key={d.user_id}>
              <TableCell>
                <Link to={`${d.user_id}`} component={RouterLink}>
                  {t('course:student')} {idx + 1}
                </Link>
              </TableCell>
              <TableCell>{d.discussion_count}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

const DiscussionDetail: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { courseId, userId } = useParams<{ courseId: string; userId: string }>()
  const { data: discussions, isLoading } = useCourseDiscussion(courseId ?? '', userId ?? '')

  if (!courseId || !userId || isLoading) return null

  if (!discussions || discussions.length === 0) {
    return (
      <Box py={3}>
        <Box sx={{ position: 'sticky', top: 0, zIndex: 1, py: 1 }}>
          <BlueButton onClick={() => navigate('..', { relative: 'path' })}>← {t('common:back')}</BlueButton>
        </Box>
        <Typography mt={2}>{t('course:noDiscussions')}</Typography>
      </Box>
    )
  }

  const sessions: Discussion[] = []
  for (let i = 0; i < discussions.length; i++) {
    const curr = discussions[i]
    const next = discussions[i + 1]
    if (!next) {
      sessions.push(curr)
      continue
    }
    const currMessages = getChatMessages(curr)
    const nextMessages = getChatMessages(next)
    const currLen = currMessages.length
    const nextLen = nextMessages.length
    const nextExtendsThis = nextLen > currLen && currMessages.every((msg, j) => nextMessages[j]?.role === msg.role && nextMessages[j]?.content === msg.content)
    if (!nextExtendsThis) sessions.push(curr)
  }

  return (
    <Box py={3}>
      <Box sx={{ position: 'sticky', top: 0, zIndex: 1, py: 1 }}>
        <BlueButton onClick={() => navigate('..', { relative: 'path' })}>← {t('common:back')}</BlueButton>
      </Box>

      <Stack spacing={4} mt={2} sx={{ maxWidth: '900px', mx: 'auto' }}>
        {sessions.map((discussion) => {
          const messages = [...getChatMessages(discussion), { role: 'assistant', content: discussion.response }]
          return (
            <Paper key={discussion.id} elevation={3} sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary">
                {new Date(discussion.createdAt).toLocaleString()}
              </Typography>
              <Stack spacing={1} mt={1}>
                {messages.map((msg, msgIdx) =>
                  msg.role === 'user' ? (
                    <Box
                      key={msgIdx}
                      sx={{
                        alignSelf: 'flex-end',
                        backgroundColor: 'action.hover',
                        borderRadius: '1rem 0 1rem 1rem',
                        boxShadow: '0px 2px 2px rgba(0, 0, 0, 0.2)',
                        px: '1.5rem',
                        py: '1rem',
                        maxWidth: { xs: '90vw', sm: '60vw', md: '50vw' },
                        width: 'fit-content',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      <Typography variant="body2">{typeof msg.content === 'string' ? msg.content : '[image]'}</Typography>
                    </Box>
                  ) : (
                    <Box
                      key={msgIdx}
                      sx={{
                        width: '100%',
                        minWidth: 0,
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-word',
                        '& pre': { overflowX: 'auto', maxWidth: '100%' },
                        '& code': { overflowWrap: 'anywhere' },
                        '& img': { maxWidth: '100%', height: 'auto' },
                        '& table': { display: 'block', width: '100%', overflowX: 'auto' },
                      }}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{typeof msg.content === 'string' ? msg.content : ''}</ReactMarkdown>
                    </Box>
                  ),
                )}
              </Stack>
            </Paper>
          )
        })}
      </Stack>
    </Box>
  )
}

export default DiscussionView
