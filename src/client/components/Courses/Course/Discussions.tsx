import { useParams } from 'react-router-dom'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TableBody, TableCell, TableHead, TableRow, Table, Link, Paper, Typography, Box, Stack } from '@mui/material'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { InfoBox } from '../../common/InfoBox'
import useCurrentUser from '../../../hooks/useCurrentUser'
import useCourse, { useCourseDiscussers, useCourseDiscussion } from '../../../hooks/useCourse'
import DownloadIcon from '@mui/icons-material/Download'
import { enqueueSnackbar } from '../../common/Snackbar'
import { BlueButton } from '../../ChatV2/general/Buttons'
import { groupBy } from 'lodash'
import { saveFileWithDialog } from '../../../util/saveFile'
import apiClient from '../../../util/apiClient'
import type { Discussion } from '../../../../shared/types'
import type { Course } from '../../../types'
import { readMessageContent, readMessageImages } from '../../../../shared/chat'

const getChatMessages = (discussion: Discussion) => {
  return discussion.metadata?.chatMessages ?? (discussion.metadata as any)?.messages ?? []
}

const extendsHistory = (next: Discussion, curr: Discussion) => {
  const currMessages = getChatMessages(curr)
  const nextMessages = getChatMessages(next)
  return (
    nextMessages.length > currMessages.length &&
    currMessages.every((msg, j) => nextMessages[j]?.role === msg.role && readMessageContent(nextMessages[j]) === readMessageContent(msg))
  )
}

const getSessions = (discussions: Discussion[]): Discussion[] =>
  discussions.filter((curr, i) => {
    const next = discussions[i + 1]
    return !next || !extendsHistory(next, curr)
  })

const exportDiscussions = (course: Course, discussers: { user_id: string }[], discussions: Discussion[]) => {
  const byUser = groupBy(discussions, 'userId')

  return {
    course: { courseId: course.courseId, name: course.name },
    exportedAt: new Date().toISOString(),
    students: discussers.map((discusser, idx) => ({
      student: `Student ${idx + 1}`,
      studentId: discusser.user_id,
      conversations: getSessions(byUser[discusser.user_id] ?? []).map((s) => ({
        id: s.id,
        createdAt: s.createdAt,
        model: s.metadata?.generationInfo?.model,
        temperature: s.metadata?.generationInfo?.temperature,
        promptInfo: s.metadata?.generationInfo?.promptInfo,
        messages: [...getChatMessages(s), { role: 'assistant', content: s.response }].map((m) => ({
          role: m.role,
          content: readMessageContent(m),
          imageCount: readMessageImages(m).length,
        })),
      })),
    })),
  }
}

const DiscussionView: React.FC<{ courseId?: string }> = ({ courseId: courseIdProp }) => {
  const { courseId: routeCourseId } = useParams<{ courseId: string }>()
  const courseId = courseIdProp ?? routeCourseId
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined)

  if (selectedUserId) {
    return <DiscussionDetail courseId={courseId} userId={selectedUserId} onBack={() => setSelectedUserId(undefined)} />
  }

  return <DiscussionList courseId={courseId} onSelectUser={setSelectedUserId} />
}

const DiscussionList: React.FC<{ courseId?: string; onSelectUser: (userId: string) => void }> = ({ courseId, onSelectUser }) => {
  const { t, i18n } = useTranslation()
  const { language } = i18n
  const { user, isLoading: isUserLoading } = useCurrentUser()
  const { data: course, isSuccess: isCourseSuccess } = useCourse(courseId ?? '')
  const { discussers, isLoading: discussersLoading } = useCourseDiscussers(courseId ?? '')
  const [isExporting, setIsExporting] = useState(false)

  if (!courseId || !course || !isCourseSuccess || isUserLoading || !user || discussersLoading) return null

  const handleDownloadAll = async () => {
    setIsExporting(true)
    try {
      const { data: discussions } = await apiClient.get<Discussion[]>(`/courses/${courseId}/discussions`)
      const data = exportDiscussions(course, discussers, discussions)
      const date = new Date().toISOString().slice(0, 10)
      const saved = await saveFileWithDialog(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `${courseId}-conversations-${date}.json`, {
        'application/json': ['.json'],
      })
      if (saved) enqueueSnackbar(t('download:success'), { variant: 'success' })
    } catch {
      enqueueSnackbar(t('download:failure'), { variant: 'error' })
    } finally {
      setIsExporting(false)
    }
  }

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
          <InfoBox severity="warning" sx={{ my: 2.5 }}>
            <Typography>{t('course:isSavedNotOptOut')}</Typography>
          </InfoBox>
        </Paper>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        <h2>{course.name[language]}</h2>
        {discussers.length > 0 && (
          <BlueButton startIcon={<DownloadIcon />} onClick={handleDownloadAll} disabled={isExporting}>
            {t('course:downloadAllDiscussions')}
          </BlueButton>
        )}
      </Box>

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
                <Link component="button" onClick={() => onSelectUser(d.user_id)}>
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

const DiscussionDetail: React.FC<{ courseId?: string; userId: string; onBack: () => void }> = ({ courseId, userId, onBack }) => {
  const { t } = useTranslation()
  const { data: discussions, isLoading } = useCourseDiscussion(courseId ?? '', userId ?? '')

  if (!courseId || !userId || isLoading) return null

  if (!discussions || discussions.length === 0) {
    return (
      <Box py={3}>
        <Box sx={{ position: 'sticky', top: 0, zIndex: 1, py: 1 }}>
          <BlueButton onClick={onBack}>← {t('common:back')}</BlueButton>
        </Box>
        <Typography mt={2}>{t('course:noDiscussions')}</Typography>
      </Box>
    )
  }

  const sessions = getSessions(discussions)

  return (
    <Box py={3}>
      <Box sx={{ position: 'sticky', top: 0, zIndex: 1, py: 1 }}>
        <BlueButton onClick={onBack}>← {t('common:back')}</BlueButton>
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
                      <Typography variant="body2">{readMessageContent(msg)}</Typography>
                      {readMessageImages(msg).map((url, imgIdx) => (
                        <Box
                          key={imgIdx}
                          component="img"
                          src={url}
                          alt="[image]"
                          sx={{ display: 'block', maxWidth: '12rem', maxHeight: '12rem', borderRadius: '0.5rem', marginTop: '1rem', objectFit: 'contain' }}
                        />
                      ))}
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
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{readMessageContent(msg)}</ReactMarkdown>
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
