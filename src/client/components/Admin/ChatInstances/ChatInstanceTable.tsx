import React, { useState } from 'react'
import { Modal } from '@mui/material'
import { enqueueSnackbar } from 'notistack'
import { useTranslation } from 'react-i18next'

import { useDeleteChatInstanceMutation } from '../../../hooks/useChatInstanceMutation'
import EditChatInstance from './EditChatInstance'
import ChatInstanceTableV2 from './ChatInstanceTableV2'
import { ChatInstance } from '../../../types'

const ChatInstanceTable = () => {
  const [editFormOpen, setEditFormOpen] = useState(false)
  const [chatInstanceToEdit, setChatInstanceToEdit] = useState<ChatInstance>()

  const mutation = useDeleteChatInstanceMutation()

  const { t } = useTranslation()

  const onDelete = (accessGroupId: string) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(t('admin:confirmChatInstanceDelete') as string)) return

    try {
      mutation.mutate(accessGroupId)
      enqueueSnackbar('Course chat instance deleted', { variant: 'success' })
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' })
    }
  }

  const onSelect = (ci: ChatInstance) => {
    setChatInstanceToEdit(ci)
    setEditFormOpen(true)
  }

  return (
    <>
      <ChatInstanceTableV2 onSelect={onSelect} onDelete={onDelete} />
      <Modal open={editFormOpen} onClose={() => setEditFormOpen(false)}>
        <EditChatInstance
          chatInstance={chatInstanceToEdit}
          setFormOpen={setEditFormOpen}
        />
      </Modal>
    </>
  )
}

export default ChatInstanceTable
