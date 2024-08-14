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

import { debounce } from 'lodash'
import { ChatInstanceUsage, ChatInstance, User } from '../../../types'
import useChatInstanceUsage from '../../../hooks/useChatInstanceUsage'
import useUsers from '../../../hooks/useUsers'
import { useDeleteChatInstanceUsageMutation } from '../../../hooks/useChatInstanceUsageMutation'
import useResetUsageMutation from '../../../hooks/useResetUsageMutation'
import apiClient from '../../../util/apiClient'

type Usage = Omit<ChatInstanceUsage, 'chatInstance'> & {
  chatInstance?: ChatInstance
}

const sortUsage = (a: Usage, b: Usage) => b.usageCount - a.usageCount

const handleLoginAs = (user: User) => () => {
  localStorage.setItem('adminLoggedInAs', user.id)
  window.location.reload()
}

const UserTable = () => {
  const { usage: chatInstanceUsage, isLoading } = useChatInstanceUsage()
  const { users, isLoading: usersLoading } = useUsers()

  const deleteChatInstanceUsage = useDeleteChatInstanceUsageMutation()
  const resetUsage = useResetUsageMutation()

  const [searchedUsages, setSearchedUsages] = useState<Usage[]>([])

  const { t, i18n } = useTranslation()

  const { language } = i18n

  if (isLoading || usersLoading) return null

  const userUsages: Usage[] = users.map((user) => ({
    id: user.id,
    user,
    usageCount: user.usage,
  }))

  const sortedUsage = (chatInstanceUsage as Usage[])
    .concat(userUsages)
    .sort(sortUsage)
    .slice(0, 10)

  const onDeleteChatInstanceUsage = (chatInstanceUsageId: string) => {
    try {
      deleteChatInstanceUsage.mutate(chatInstanceUsageId)
      enqueueSnackbar('ChatInstance usage deleted', { variant: 'success' })
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' })
    }
  }

  const handleSearchChange = debounce(async ({ target }) => {
    const query = target.value

    if (query.length === 0) {
      setSearchedUsages([])
      return
    }
    if (query.length < 5) return

    const params = {
      user: query,
    }

    const res = await apiClient.get(`/admin/user-search`, { params })
    const { persons } = res.data as {
      persons: User[]
    }

    const searchedUserUsages: Usage[] = persons.map((user) => ({
      id: user.id,
      user,
      usageCount: user.usage,
    }))

    setSearchedUsages(searchedUserUsages)
  }, 400)

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
        onChange={handleSearchChange}
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
                  <b>{t('admin:courseNameInfo')}</b>
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
                      <code>{chatInstance?.name[language] ?? ''}</code>
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
                  <TableCell>
                    <Button variant="outlined" onClick={handleLoginAs(user)}>
                      {t('admin:loginAsButton')}
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
