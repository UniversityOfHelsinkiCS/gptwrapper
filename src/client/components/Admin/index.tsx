import React, { useState } from 'react'
import { Box, Button, Modal } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'

import useCurrentUser from '../../hooks/useCurrentUser'
import AccessGroupTable from './AccessGroupTable'
import CreateAccessGroup from './CreateAccessGroup'

const Admin = () => {
  const { user, isLoading } = useCurrentUser()

  const [createFormOpen, setCreateFormOpen] = useState(false)
  const [editFormOpen, setEditFormOpen] = useState(false)

  const { t } = useTranslation()

  if (isLoading) return null
  if (!user?.isAdmin) return <Navigate to="/" />

  return (
    <Box sx={{ margin: '0 auto', width: '90%', padding: '5%' }}>
      <AccessGroupTable
        editFormOpen={editFormOpen}
        setEditFormOpen={setEditFormOpen}
      />

      <Button
        sx={{ p: 2 }}
        variant="contained"
        onClick={() => setCreateFormOpen(true)}
      >
        {t('admin:createAccessGroup')}
      </Button>

      <Modal open={createFormOpen} onClose={() => setCreateFormOpen(false)}>
        <CreateAccessGroup setFormOpen={setCreateFormOpen} />
      </Modal>
    </Box>
  )
}

export default Admin
