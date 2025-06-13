import { Box, TableContainer, TableBody, TableCell, TableHead, TableRow, Paper, Typography, Table, Container } from '@mui/material'
import { useTranslation } from 'react-i18next'
import useCurrentUser from '../../hooks/useCurrentUser'
import { formatDate } from '../Courses/util'
import { Course } from '../../types'

const Chats = () => {
  const { user, isLoading } = useCurrentUser()
  const { t, i18n } = useTranslation()
  const { language } = i18n

  if (isLoading) {
    return <div>Loading...</div>
  }

  const chats = user.enrolledCourses as Course[]

  if (chats.length === 0) {
    return <h3>{t('chats:noChats')}</h3>
  }

  const getChatLink = (chat: Course) => {
    // TODO: make this function better

    console.log('getChatLink', window.location.hostname)

    if (window.location.hostname === 'localhost') {
      return `http://localhost:3000/${chat.courseId}`
    }

    if (window.location.hostname.includes('toska-staging')) {
      return `https://toska-staging.cs.helsinki.fi/gptwrapper/${chat.courseId}`
    }

    return `https://curre.helsinki.fi/chat/${chat.courseId}`
  }

  return (
    <Container sx={{ mt: '4rem', mb: '10rem' }} maxWidth="xl">
      <h2>{t('chats:header')}</h2>

      <Box my={2}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <Typography variant="h6">
                    <b>{t('chats:name')}</b>
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="h6">
                    <b>{t('chats:codes')}</b>
                  </Typography>
                </TableCell>
                <TableCell align="left">
                  <Typography variant="h6">
                    <b>{t('chats:dates')}</b>
                  </Typography>
                </TableCell>
                <TableCell align="left">
                  <Typography variant="h6">
                    <b>{t('chats:link')}</b>
                  </Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {chats.map((chat) => (
                <TableRow key={chat.id}>
                  <TableCell component="th" scope="row">
                    <Typography variant="h6">{chat.name[language]}</Typography>
                  </TableCell>
                  <TableCell component="th" scope="row">
                    <Typography variant="h6">{chat.courseUnits.map((c) => c.code).join(', ')}</Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Typography>{formatDate(chat.activityPeriod)}</Typography>
                  </TableCell>
                  <TableCell align="left">
                    <a href={getChatLink(chat)}>
                      <Typography variant="h6">{getChatLink(chat)}</Typography>
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Container>
  )
}

export default Chats
