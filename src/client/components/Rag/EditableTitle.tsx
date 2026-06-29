import { CancelOutlined, Check, Edit } from '@mui/icons-material'
import { Box, CircularProgress, IconButton, TextField, Tooltip, Typography } from '@mui/material'
import type { RagIndexAttributes } from '@shared/types'
import { useState, useEffect } from 'react'
import { useUpdateRagIndexMutation } from './api'
import { useSnackbar } from 'notistack'
import { useTranslation } from 'react-i18next'

export const EditableTitle = ({ ragIndex }: { ragIndex: RagIndexAttributes }) => {
  const [title, setTitle] = useState(ragIndex?.metadata?.name || '')
  const [isEditing, setIsEditing] = useState(false)
  const updateMutation = useUpdateRagIndexMutation(ragIndex.id)

  useEffect(() => {
    setTitle(ragIndex?.metadata?.name || '')
    setIsEditing(false)
  }, [ragIndex.id])
  const { enqueueSnackbar } = useSnackbar()
  const { t } = useTranslation()

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({ metadata: { name: title } })
      enqueueSnackbar(t('rag:nameUpdateSuccess'), { variant: 'success' })
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating title:', error)
      enqueueSnackbar(t('rag:nameUpdateError'), { variant: 'error' })
      handleCancel()
    }
  }

  const handleCancel = () => {
    setTitle(ragIndex?.metadata?.name || '')
    setIsEditing(false)
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {isEditing ? (
        <>
          <TextField
            size="small"
            value={title}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSave()
              }
            }}
            slotProps={{ htmlInput: { 'data-testid': 'ragIndexNameEditInput' } }}
          />
          <Tooltip title={t('common:cancel')}>
            <IconButton color="error" onClick={handleCancel} size="small" data-testid="ragIndexNameEditCancel">
              <CancelOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('common:save')}>
            <IconButton color="success" onClick={handleSave} size="small" data-testid="ragIndexNameEditSave">
              {updateMutation.isPending ? <CircularProgress size={20} /> : <Check fontSize="small" />}
            </IconButton>
          </Tooltip>
        </>
      ) : (
        <>
          <Typography fontWeight="bold" color="text.primary">
            {ragIndex?.metadata?.name}
          </Typography>
          <Tooltip title={t('common:edit')}>
            <IconButton color="primary" onClick={() => setIsEditing(true)} size="small" data-testid="ragIndexNameEditToggle">
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      )}
    </Box>
  )
}
