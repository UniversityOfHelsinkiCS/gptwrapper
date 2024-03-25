import React, { useState } from 'react'
import { Box, Button, Modal } from '@mui/material'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import useCurrentUser from '../../../hooks/useCurrentUser'
import ChatInstanceTable from './ChatInstanceTable'
import CreateChatInstance from './CreateChatInstance'

const ChatInstances = () => {
  const { t } = useTranslation()

  const { user, isLoading } = useCurrentUser()

  const [createFormOpen, setCreateFormOpen] = useState(false)
  const [editFormOpen, setEditFormOpen] = useState(false)

  if (isLoading) return null
  if (!user?.isAdmin) return <Navigate to="/" />

  return (
    <Box>
      <ChatInstanceTable
        editFormOpen={editFormOpen}
        setEditFormOpen={setEditFormOpen}
      />

      <Button
        sx={{ p: 2 }}
        variant="contained"
        onClick={() => setCreateFormOpen(true)}
      >
        {t('admin:createChatInstance')}
      </Button>

      <Modal open={createFormOpen} onClose={() => setCreateFormOpen(false)}>
        <CreateChatInstance setFormOpen={setCreateFormOpen} />
      </Modal>
    </Box>
  )
}

export default ChatInstances
