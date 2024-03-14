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

import { ServiceUsage, Service } from '../../../types'
import useServiceUsage from '../../../hooks/useServiceUsage'
import useUsers from '../../../hooks/useUsers'
import { useDeleteServiceUsageMutation } from '../../../hooks/useServiceUsageMutation'
import useResetUsageMutation from '../../../hooks/useResetUsageMutation'

type Usage = Omit<ServiceUsage, 'service'> & { service?: Service }

const sortUsage = (a: Usage, b: Usage) =>
  a.user.username.localeCompare(b.user.username)

const UserTable = () => {
  const { usage: serviceUsage, isLoading } = useServiceUsage()
  const { users, isLoading: usersLoading } = useUsers()

  const deleteServiceUsage = useDeleteServiceUsageMutation()
  const resetUsage = useResetUsageMutation()

  const { t } = useTranslation()

  const onDeleteServiceUsage = (serviceUsageId: string) => {
    try {
      deleteServiceUsage.mutate(serviceUsageId)
      enqueueSnackbar('Service usage deleted', { variant: 'success' })
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

  const filteredUsage = serviceUsage.filter(
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
            {sortedUsage.map(({ id, usageCount, user, service }) => (
              <TableRow key={id}>
                <TableCell component="th" scope="row">
                  <Typography variant="h6">{user.username}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="h6">{usageCount}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="overline">
                    <code>{service?.courseId ?? ''}</code>
                  </Typography>
                </TableCell>
                <TableCell>
                  <Button
                    color="error"
                    onClick={() =>
                      service?.courseId
                        ? onDeleteServiceUsage(id)
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
