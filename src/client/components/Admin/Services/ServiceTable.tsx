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
  Modal,
} from '@mui/material'
import { enqueueSnackbar } from 'notistack'
import { useTranslation } from 'react-i18next'

import { ChatInstance } from '../../../types'
import useServices from '../../../hooks/useServices'
import { useDeleteServiceMutation } from '../../../hooks/useServiceMutation'
import EditService from './EditService'

type Props = {
  editFormOpen: boolean
  setEditFormOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const sortServices = (a: ChatInstance, b: ChatInstance) =>
  a.name.localeCompare(b.name)

const ServiceTable = ({ editFormOpen, setEditFormOpen }: Props) => {
  const [editId, setEditId] = useState('')

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

  const onEdit = (serviceId: string) => {
    setEditId(serviceId)
    setEditFormOpen(true)
  }

  const sortedServices = services.sort(sortServices)

  const serviceToEdit = sortedServices.find(({ id }) => id === editId)

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
                    <Button onClick={() => onEdit(id)}>
                      {t('common:edit')}
                    </Button>
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

      <Modal open={editFormOpen} onClose={() => setEditFormOpen(false)}>
        <EditService service={serviceToEdit} setFormOpen={setEditFormOpen} />
      </Modal>
    </Box>
  )
}

export default ServiceTable
