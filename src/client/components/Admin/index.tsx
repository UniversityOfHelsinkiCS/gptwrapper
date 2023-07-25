import React, { useState } from 'react'
import { Box, Typography, Button, Modal } from '@mui/material'

import CreateAccessGroup from './CreateAccessGroup'
import AccessGroupTable from './AccessGroupTable'

const Admin = () => {
  const [createFormOpen, setCreateFormOpen] = useState(false)

  const validModels = ['gpt-3.5-turbo', 'gpt-3.5-turbo-16k', 'gpt-4']

  return (
    <Box
    sx={{ margin: '0 auto', width: '90%', padding: '5%' }}
  >
    <Typography mb={2} variant="h3">Admin</Typography>

    <Button variant="contained" onClick={() => setCreateFormOpen(true)}>Create new access group</Button>

    <Modal
      open={createFormOpen}
      onClose={() => setCreateFormOpen(false)}
    >
      <CreateAccessGroup validModels={validModels} />
    </Modal>

    <AccessGroupTable />
  </Box>
  )
}

export default Admin
