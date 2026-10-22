import { CancelOutlined, Check, Edit } from '@mui/icons-material'
import { Box, CircularProgress, IconButton, TextField, Tooltip, Typography } from '@mui/material'
import type { RagIndexAttributes } from '@shared/types'
import { useState, useEffect, useRef } from 'react'
import { useUpdateRagIndexMutation } from './api'
import { enqueueSnackbar } from '../common/Snackbar'
import { useTranslation } from 'react-i18next'

export const EditableTitle = ({ ragIndex }: { ragIndex: RagIndexAttributes }) => {
  const [title, setTitle] = useState(ragIndex?.metadata?.name || '')
  const [isEditing, setIsEditing] = useState(false)
  const updateMutation = useUpdateRagIndexMutation(ragIndex.id)
  const editToggleRef = useRef<HTMLButtonElement>(null)
  const focusToggleOnClose = useRef(false)

  useEffect(() => {
    setTitle(ragIndex?.metadata?.name || '')
    setIsEditing(false)
  }, [ragIndex.id])

  useEffect(() => {
    if (!isEditing && focusToggleOnClose.current) {
      focusToggleOnClose.current = false
      editToggleRef.current?.focus()
    }
  }, [isEditing])
  const { t } = useTranslation()

  const closeEditing = () => {
    focusToggleOnClose.current = true
    setIsEditing(false)
  }

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({ metadata: { name: title } })
      enqueueSnackbar(t('rag:nameUpdateSuccess'), { variant: 'success' })
      closeEditing()
    } catch (error) {
      console.error('Error updating title:', error)
      enqueueSnackbar(t('rag:nameUpdateError'), { variant: 'error' })
      handleCancel()
    }
  }

  const handleCancel = () => {
    setTitle(ragIndex?.metadata?.name || '')
    closeEditing()
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
            slotProps={{ htmlInput: { 'aria-label': t('rag:nameLabel'), 'data-testid': 'ragIndexNameEditInput' } }}
          />
          <Tooltip title={t('common:cancel')}>
            <IconButton
              color="error"
              onClick={handleCancel}
              size="small"
              data-testid="ragIndexNameEditCancel"
              aria-label={t('accessibility:itemAction', { action: t('common:cancel'), item: t('accessibility:editName') })}
            >
              <CancelOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('common:save')}>
            <IconButton
              color="success"
              onClick={handleSave}
              size="small"
              data-testid="ragIndexNameEditSave"
              aria-label={t('accessibility:itemAction', { action: t('common:save'), item: t('rag:name') })}
            >
              {updateMutation.isPending ? <CircularProgress size={20} /> : <Check fontSize="small" />}
            </IconButton>
          </Tooltip>
        </>
      ) : (
        <>
          <Typography id="ragIndex-name" component="h3" fontWeight="bold" color="text.primary">
            {ragIndex?.metadata?.name}
          </Typography>
          <Tooltip title={t('accessibility:editName')}>
            <IconButton
              id="ragIndexNameEditToggle"
              ref={editToggleRef}
              color="primary"
              onClick={() => setIsEditing(true)}
              size="small"
              data-testid="ragIndexNameEditToggle"
              aria-describedby="ragIndex-name"
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      )}
    </Box>
  )
}
