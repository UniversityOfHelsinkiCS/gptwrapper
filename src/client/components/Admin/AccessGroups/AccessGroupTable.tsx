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

import { AccessGroup } from '../../../types'
import useAccessGroups from '../../../hooks/useAccessGroups'
import { useDeleteAccessGroupMutation } from '../../../hooks/useAccessGroupMutation'
import EditAccessGroup from './EditAccessGroup'

type Props = {
  editFormOpen: boolean
  setEditFormOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const sortAccessGroups = (a: AccessGroup, b: AccessGroup) =>
  a.iamGroup.localeCompare(b.iamGroup)

const AccessGroupTable = ({ editFormOpen, setEditFormOpen }: Props) => {
  const [editId, setEditId] = useState('')

  const { accessGroups, isLoading } = useAccessGroups()

  const mutation = useDeleteAccessGroupMutation()

  const { t } = useTranslation()

  const onDelete = (accessGroupId: string) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(t('admin:confirmAccessGroupDelete') as string)) return

    try {
      mutation.mutate(accessGroupId)
      enqueueSnackbar('Access group deleted', { variant: 'success' })
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' })
    }
  }

  const onEdit = (accessGroupId: string) => {
    setEditId(accessGroupId)
    setEditFormOpen(true)
  }

  const sortedAccessGroups = accessGroups.sort(sortAccessGroups)

  const accessGroupToEdit = accessGroups.find(({ id }) => id === editId)

  if (isLoading) return null

  return (
    <Box mb={2}>
      <Typography mb={2} variant="h4">
        {t('admin:accessGroups')}
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <Typography variant="h5">
                  <b>{t('admin:iamGroup')}</b>
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
                  <b>{t('admin:resetSchedule')}</b>
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {sortedAccessGroups.map(
              ({ id, iamGroup, model, usageLimit, resetCron }) => (
                <TableRow key={id}>
                  <TableCell component="th" scope="row">
                    <Typography variant="h6">{iamGroup}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="h6">{model}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="h6">{usageLimit}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="h6">
                      <code>{resetCron}</code>
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
        <EditAccessGroup
          accessGroup={accessGroupToEdit}
          setFormOpen={setEditFormOpen}
        />
      </Modal>
    </Box>
  )
}

export default AccessGroupTable
