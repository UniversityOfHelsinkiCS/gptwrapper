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
                    <b>{t('chats:limit')}</b>
                  </Typography>
                </TableCell>
                <TableCell align="left">
                  <Typography variant="h6">
                    <b>{t('chats:linkki')}</b>
                  </Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {user.enrolledCourses.map((chat) => (
                <TableRow key={chat.id}>
                  <TableCell component="th" scope="row">
                    <Typography variant="h6">{chat.name[language]}</Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Typography variant="h6">{chat.usageLimit}</Typography>
                  </TableCell>
                  <TableCell align="left">
                    <a href={`/chat/${chat.id}`}>
                      <Typography variant="h6">{`https://curre.helsinki.fi/chat/${chat.id}`}</Typography>
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
