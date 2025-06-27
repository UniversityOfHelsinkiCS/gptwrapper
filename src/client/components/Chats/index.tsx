import { Box, Container, Link as MuiLink, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import { getLanguageValue } from '../../../shared/utils'
import useCurrentUser from '../../hooks/useCurrentUser'
import type { Course } from '../../types'
import { formatDate } from '../Courses/util'

const Chats = () => {
  const { user } = useCurrentUser()
  const { t, i18n } = useTranslation()
  const { language } = i18n

  if (!user) {
    return <div>Loading...</div>
  }

  const chats = user.enrolledCourses as Course[]

  if (chats.length === 0) {
    return <h3>{t('chats:noChats')}</h3>
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
                    <MuiLink component={RouterLink} to={`/${chat.courseId}`}>
                      <Typography variant="h6">{getLanguageValue(chat.name, language)}</Typography>
                    </MuiLink>
                    <MuiLink component={RouterLink} to={`/v2/${chat.courseId}`}>
                      <Typography variant="h6">{getLanguageValue(chat.name, language)} (v2 UI)</Typography>
                    </MuiLink>
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
