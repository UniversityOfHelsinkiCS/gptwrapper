import React, { useState, useEffect } from 'react'
import {
  Input,
  Box,
  Button,
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
import { enqueueSnackbar } from 'notistack'
import useUserSearch from '../../hooks/useUserSearch'
import useResetUsageMutation from '../../hooks/useResetUsageMutation'

import { User } from '../../types'

const handleLoginAs = (user: User) => () => {
  localStorage.setItem('adminLoggedInAs', user.id)
  localStorage.setItem('adminLoggedInAsUser', JSON.stringify(user))
  window.location.reload()
}

const UserTable = ({ users }: { users: User[] }) => {
  if (!users || users.length === 0) return null
  const resetUsage = useResetUsageMutation()

  const onResetUsage = (userId: string) => {
    try {
      resetUsage.mutate(userId)
      enqueueSnackbar(
        'User usage reset, please refresh the browser to see the change!',
        { variant: 'success' }
      )
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' })
    }
  }

  const { t } = useTranslation()

  return (
    <Box my={2}>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <Typography variant="h6">
                  <b>{t('admin:username')}</b>
                </Typography>
              </TableCell>
              <TableCell align="left">
                <Typography variant="h6">
                  <b>{t('admin:lastName')}</b>
                </Typography>
              </TableCell>
              <TableCell align="left">
                <Typography variant="h6">
                  <b>{t('admin:firstNames')}</b>
                </Typography>
              </TableCell>
              <TableCell align="left">
                <Typography variant="h6">
                  <b>{t('admin:studentNumber')}</b>
                </Typography>
              </TableCell>
              <TableCell align="left">
                <Typography variant="h6">
                  <b>{t('admin:email')}</b>
                </Typography>
              </TableCell>
              <TableCell align="left">
                <Typography variant="h6">
                  <b>{t('admin:usage')}</b>
                </Typography>
              </TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell component="th" scope="row">
                  <Typography variant="h6">{user.username}</Typography>
                </TableCell>
                <TableCell align="left">
                  <Typography variant="h6">{user.lastName}</Typography>
                </TableCell>
                <TableCell align="left">
                  <Typography variant="h6">{user.firstNames}</Typography>
                </TableCell>
                <TableCell align="left">
                  <Typography variant="h6">{user.studentNumber}</Typography>
                </TableCell>
                <TableCell align="left">
                  <Typography variant="h6">{user.primaryEmail}</Typography>
                </TableCell>
                <TableCell align="left">
                  <Typography variant="h6">{user.usage}</Typography>
                </TableCell>
                <TableCell>
                  <Button variant="outlined" onClick={handleLoginAs(user)}>
                    {t('admin:loginAsButton')}
                  </Button>
                  {user.usage > 0 && (
                    <Button
                      variant="outlined"
                      onClick={() => onResetUsage(user.id)}
                    >
                      {t('admin:resetTokens')}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

const UserSearch = () => {
  const [search, setSearch] = useState('')
  const { users, isLoading, refetch } = useUserSearch(search)
  const { t } = useTranslation()

  useEffect(() => {
    if (search && search.length > 4) {
      refetch()
    }
  }, [search])

  return (
    <Box>
      <Input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('admin:searchUsers')}
      />

      {search.length > 2 && search.length < 5 && (
        <div>{t('admin:typeMore')}</div>
      )}

      {isLoading && <div>Loading...</div>}
      {!isLoading && <UserTable users={users} />}
    </Box>
  )
}

export default UserSearch
