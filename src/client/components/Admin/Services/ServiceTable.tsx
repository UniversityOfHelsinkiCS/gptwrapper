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

import { Service } from '../../../types'
import useServices from '../../../hooks/useServices'
import { useDeleteServiceMutation } from '../../../hooks/useServiceMutation'

const sortServices = (a: Service, b: Service) => a.name.localeCompare(b.name)

const ServiceTable = () => {
  const { services, isLoading } = useServices()

  const mutation = useDeleteServiceMutation()

  const { t } = useTranslation()

  const onDelete = (accessGroupId: string) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(t('admin:confirmServiceDelete') as string)) return

    try {
      mutation.mutate(accessGroupId)
      enqueueSnackbar('Course service deleted', { variant: 'success' })
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' })
    }
  }

  const filteredServices = services.filter(({ id }) => id !== 'chat')
  const sortedServices = filteredServices.sort(sortServices)

  if (isLoading) return null

  return (
    <Box mb={2}>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <Typography variant="h5">
                  <b>{t('admin:name')}</b>
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="h5">
                  <b>{t('admin:description')}</b>
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="h5">
                  <b>{t('admin:model')}</b>
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="h5">
                  <b>{t('admin:usageLimit')}</b>
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
            {sortedServices.map(
              ({ id, name, description, model, usageLimit, courseId }) => (
                <TableRow key={id}>
                  <TableCell component="th" scope="row">
                    <Typography variant="h6">{name}</Typography>
                  </TableCell>
                  <TableCell component="th" scope="row">
                    <Typography variant="h6">{description}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="h6">{model}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="h6">{usageLimit}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="overline">
                      <code>{courseId}</code>
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Button color="error" onClick={() => onDelete(id)}>
                      {t('common:delete')}
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

export default ServiceTable
