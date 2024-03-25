import React from 'react'
import {
  Table,
  TableContainer,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Button,
} from '@mui/material'
import { enqueueSnackbar } from 'notistack'
import { useTranslation } from 'react-i18next'

import { ChatInstanceUsage, ChatInstance } from '../../../types'
import useChatInstanceUsage from '../../../hooks/useChatInstanceUsage'
import useUsers from '../../../hooks/useUsers'
import { useDeleteChatInstanceUsageMutation } from '../../../hooks/useChatInstanceUsageMutation'
import useResetUsageMutation from '../../../hooks/useResetUsageMutation'

type Usage = Omit<ChatInstanceUsage, 'chatInstance'> & {
  chatInstance?: ChatInstance
}

const sortUsage = (a: Usage, b: Usage) =>
  a.user.username.localeCompare(b.user.username)

const UserTable = () => {
  const { usage: chatInstanceUsage, isLoading } = useChatInstanceUsage()
  const { users, isLoading: usersLoading } = useUsers()

  const deleteChatInstanceUsage = useDeleteChatInstanceUsageMutation()
  const resetUsage = useResetUsageMutation()

  const { t } = useTranslation()

  const onDeleteChatInstanceUsage = (chatInstanceUsageId: string) => {
    try {
      deleteChatInstanceUsage.mutate(chatInstanceUsageId)
      enqueueSnackbar('ChatInstance usage deleted', { variant: 'success' })
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' })
    }
  }

  const onResetUsage = (userId: string) => {
    try {
      resetUsage.mutate(userId)
      enqueueSnackbar('User usage reset', { variant: 'success' })
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' })
    }
  }

  if (isLoading || usersLoading) return null

  const filteredUsers = users.filter(({ usage }) => usage !== 0)

  const userUsages: Usage[] = filteredUsers.map((user) => ({
    id: user.id,
    user,
    usageCount: user.usage,
  }))

  const filteredUsage = chatInstanceUsage.filter(
    ({ usageCount }) => usageCount !== 0
  )
  const sortedUsage = (filteredUsage as Usage[])
    .concat(userUsages)
    .sort(sortUsage)

  return (
    <Box my={2}>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <Typography variant="h5">
                  <b>{t('admin:username')}</b>
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="h5">
                  <b>{t('admin:usageCount')}</b>
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="h5">
                  <b>{t('admin:courseId')}</b>
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {sortedUsage.map(({ id, usageCount, user, chatInstance }) => (
              <TableRow key={id}>
                <TableCell component="th" scope="row">
                  <Typography variant="h6">{user.username}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="h6">{usageCount}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="overline">
                    <code>{chatInstance?.courseId ?? ''}</code>
                  </Typography>
                </TableCell>
                <TableCell>
                  <Button
                    color="error"
                    onClick={() =>
                      chatInstance?.courseId
                        ? onDeleteChatInstanceUsage(id)
                        : onResetUsage(user.id)
                    }
                  >
                    {t('admin:reset')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export default UserTable
