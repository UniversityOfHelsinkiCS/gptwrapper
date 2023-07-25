import React, { useState } from 'react'
import { Table, TableContainer, TableBody, TableCell, TableHead, TableRow, Paper, Typography, Box, Button, Modal } from '@mui/material'
import { enqueueSnackbar } from 'notistack'

import useAccessGroups from '../../hooks/useAccessGroups'
import { useDeleteAccessGroupMutation } from '../../hooks/useAccessGroupMutation'
import EditAccessGroup from './EditAccessGroup'

type Props = {
  editFormOpen: boolean,
  setEditFormOpen: React.Dispatch<React.SetStateAction<boolean>>,
}

const AccessGroupTable = ({ editFormOpen, setEditFormOpen }: Props) => {
  const [editId, setEditId] = useState('')

  const { accessGroups, isLoading } = useAccessGroups()

  const mutation = useDeleteAccessGroupMutation()

  const onDelete = (accessGroupId: string) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Are you sure you want to delete this access group?')) return

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

  const accessGroupToEdit = accessGroups.find(({ id }) => id === editId)

  if (isLoading) return null

  return (
    <Box mb={2}>
      <Typography mb={2} variant="h4">Access groups:</Typography>
 
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <Typography variant="h5"><b>IAM group</b></Typography>
              </TableCell>
                <TableCell align="right">
                  <Typography variant="h5"><b>Model</b></Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="h5"><b>Usage limit</b></Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="h5"><b>Reset Schedule</b></Typography>
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {accessGroups.map(({ id, iamGroup, model, usageLimit, resetCron }) => (
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
                  <Typography variant="h6"><code>{resetCron}</code></Typography>
                </TableCell>

                <TableCell>
                  <Button onClick={() => onEdit(id)}>Edit</Button>
                  <Button color="error" onClick={() => onDelete(id)}>Delete</Button>
                </TableCell>
                
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Modal
        open={editFormOpen}
        onClose={() => setEditFormOpen(false)}
      >
        <EditAccessGroup accessGroup={accessGroupToEdit} setFormOpen={setEditFormOpen} />
      </Modal>
    </Box>
  )
}

export default AccessGroupTable
