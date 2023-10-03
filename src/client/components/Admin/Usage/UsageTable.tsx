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

import { ServiceUsage } from '../../../types'
import useServiceUsage from '../../../hooks/useServiceUsage'
import { useDeleteServiceUsageMutation } from '../../../hooks/useServiceUsageMutation'

const sortUsage = (a: ServiceUsage, b: ServiceUsage) =>
  a.user.username.localeCompare(b.user.username)

const UsageTable = () => {
  const { usage, isLoading } = useServiceUsage()

  const mutation = useDeleteServiceUsageMutation()

  const { t } = useTranslation()

  const onDelete = (serviceUsageId: string) => {
    try {
      mutation.mutate(serviceUsageId)
      enqueueSnackbar('Service usage deleted', { variant: 'success' })
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' })
    }
  }

  const filteredUsage = usage.filter(({ usageCount }) => usageCount !== 0)
  const sortedUsage = filteredUsage.sort(sortUsage)

  if (isLoading) return null

  return (
    <Box mb={2}>
      <Typography mb={2} variant="h4">
        {t('admin:courses')}
      </Typography>

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
                    <code>{service.courseId ?? ''}</code>
                  </Typography>
                </TableCell>
                <TableCell>
                  <Button color="error" onClick={() => onDelete(id)}>
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

export default UsageTable
