import React from 'react'
import {
  Box,
  TableContainer,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Table,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import useCurrentUser from '../../hooks/useCurrentUser'

const Chats = () => {
  const { user, isLoading } = useCurrentUser()
  const { t, i18n } = useTranslation()
  const { language } = i18n

  if (isLoading) {
    return <div>Loading...</div>
  }

  const chats = user.enrolledCourses

  if (chats.length === 0) {
    return <h3>{t('chats:noChats')}</h3>
  }

  const getChatLink = (chat: any) => {
    // TODO: make this function better

    if (window.location.hostname === 'localhost') {
      return `http://localhost:3000/${chat.courseId}`
    }

    if (window.location.hostname === 'toska-staging') {
      return `https://toska-staging.cs.helsinki.fi/gptwrapper${chat.courseId}`
    }

    return `https://curre.helsinki.fi/chat/${chat.courseId}`
  }

  return (
    <div>
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
                  <TableCell align="left">
                    <Typography>
                      {chat.activityPeriod.startDate} -{' '}
                      {chat.activityPeriod.endDate}
                    </Typography>
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
    </div>
  )
}

export default Chats
