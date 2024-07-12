import React, { useState } from 'react'
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
  TextField,
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

  const [searchedUsages, setSearchedUsages] = useState<Usage[]>([])

  const { t } = useTranslation()

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

  const onDeleteChatInstanceUsage = (chatInstanceUsageId: string) => {
    try {
      deleteChatInstanceUsage.mutate(chatInstanceUsageId)
      enqueueSnackbar('ChatInstance usage deleted', { variant: 'success' })
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' })
    }
  }

  const handleChange = (value) => {
    const searched = sortedUsage.filter((u) => u.user.username.includes(value))
    setSearchedUsages(searched)
  }

  const onResetUsage = (userId: string) => {
    try {
      resetUsage.mutate(userId)
      enqueueSnackbar('User usage reset', { variant: 'success' })
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' })
    }
  }

  return (
    <Box my={2}>
      <TextField
        sx={{ width: '30em', my: 2 }}
        label="Search users"
        variant="outlined"
        onChange={(e) => handleChange(e.target.value)}
      />
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
            {(searchedUsages.length !== 0 ? searchedUsages : sortedUsage).map(
              ({ id, usageCount, user, chatInstance }) => (
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
              )
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export default UserTable
