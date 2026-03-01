import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'
import { useSnackbar } from 'notistack'

import useCurrentUser from '../../hooks/useCurrentUser'
import type { ChatInstance } from '../../types'
import apiClient from '../../util/apiClient'
import queryClient from '../../util/queryClient'
import { getLanguageValue } from '@shared/utils'
import { LocalizedTextField } from '../common/LocalizedTextField'
import { OutlineButtonBlue } from '../ChatV2/general/Buttons'
import { Locale } from '@shared/lang'

type EditableValues = {
  name: Locale
  description: string
}

const queryKey = ['courseCreatorChatInstances']

/**
 * React-router compatible lazy loaded component for course creator page
 */
export function Component() {
  const { t, i18n } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const { user, isLoading: isUserLoading } = useCurrentUser()
  const [name, setName] = useState<Locale>({ fi: '', sv: '', en: '' })
  const [description, setDescription] = useState('')
  const [editingId, setEditingId] = useState<string|null>(null)
  const [chatInstanceToDelete, setChatInstanceToDelete] = useState<{ id: string; name: Locale } | null>(null)

  const {
    data: chatInstances = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await apiClient.get<ChatInstance[]>('/chatinstances/custom')
      return res.data
    },
    enabled: !!user?.isCourseCreator,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/chatinstances/custom', {
        name,
        description: description.trim(),
      })
    },
    onSuccess: () => {
      setName({ fi: '', en: '', sv: '' })
      setDescription('')
      enqueueSnackbar(t('courseCreator:createSuccess'), { variant: 'success' })
      queryClient.invalidateQueries({ queryKey })
    },
    onError: () => {
      enqueueSnackbar(t('courseCreator:createError'), { variant: 'error' })
    },
  })

  const saveMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: EditableValues }) => {
      await apiClient.put(`/chatinstances/custom/${id}`, payload)
    },
    onSuccess: () => {
      enqueueSnackbar(t('courseCreator:saveSuccess'), { variant: 'success' })
      queryClient.invalidateQueries({ queryKey })
    },
    onError: () => {
      enqueueSnackbar(t('courseCreator:saveError'), { variant: 'error' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/chatinstances/custom/${id}`)
    },
    onSuccess: () => {
      enqueueSnackbar(t('courseCreator:deleteSuccess'), { variant: 'success' })
      setChatInstanceToDelete(null)
      queryClient.invalidateQueries({ queryKey })
    },
    onError: () => {
      enqueueSnackbar(t('courseCreator:deleteError'), { variant: 'error' })
    },
  })

  if (isUserLoading) return null
  if (!user?.isCourseCreator) return <Navigate to="/" />

  return (
    <Container sx={{ mt: '8rem', mb: '10rem' }} maxWidth="md" data-testid="course-creator-page">
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4">{t('courseCreator:title')}</Typography>
          <Typography color="text.secondary">{t('courseCreator:subtitle')}</Typography>
        </Box>

        <Paper sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Typography variant="h6">{t('courseCreator:create')}</Typography>
            <LocalizedTextField
              label={t('courseCreator:name')}
              value={name}
              setValue={setName}
              testId='course-creator-create-name-input'
            />
            <TextField
              label={t('courseCreator:description')}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              size="small"
              multiline
              minRows={2}
              slotProps={{
                htmlInput: {
                  'data-testid': 'course-creator-create-description-input',
                },
              }}
            />
            <Box>
              <Button
                variant="contained"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                data-testid="course-creator-create-button"
              >
                {t('courseCreator:createButton')}
              </Button>
            </Box>
          </Stack>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Typography variant="h6">{t('courseCreator:manage')}</Typography>

            {isError && <Alert severity="error">{t('courseCreator:loadError')}</Alert>}

            {isLoading && (
              <Box>
                <CircularProgress size={22} />
              </Box>
            )}

            {!isLoading && chatInstances.length === 0 && <Typography color="text.secondary">{t('courseCreator:noCustomChats')}</Typography>}

            {chatInstances.map((chatInstance) => (
              <Paper key={chatInstance.id} variant="outlined" sx={{ p: 2 }} data-testid="course-creator-chat-row">
                {editingId === chatInstance.id ? <ChatInstanceEditor 
                  chatInstance={chatInstance}
                  onDelete={() => setChatInstanceToDelete({ id: chatInstance.id, name: chatInstance.name })}
                  isDeleting={deleteMutation.isPending}
                  onSave={async (v) => { await saveMutation.mutateAsync(v); setEditingId(null) }}
                  isSaving={saveMutation.isPending}
                /> : (
                  <Stack>
                    <Typography>{chatInstance.name ? getLanguageValue(chatInstance.name, i18n.language) : ''}</Typography>
                    <OutlineButtonBlue onClick={() => setEditingId(chatInstance.id)} data-testid="course-creator-edit-toggle">
                      {t('edit')}
                    </OutlineButtonBlue>
                  </Stack>
                )}
              </Paper>
            ))}
          </Stack>
          
        </Paper>
      </Stack>

      <Dialog open={!!chatInstanceToDelete} onClose={() => setChatInstanceToDelete(null)} data-testid="course-creator-delete-dialog">
        <DialogTitle>{t('courseCreator:confirmDeleteTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('courseCreator:confirmDeleteMessage', { name: chatInstanceToDelete?.name ? getLanguageValue(chatInstanceToDelete?.name, i18n.language) : '' })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChatInstanceToDelete(null)} data-testid="course-creator-delete-cancel-button">{t('common:cancel')}</Button>
          <Button
            color="error"
            onClick={() => {
              if (!chatInstanceToDelete) return
              deleteMutation.mutate(chatInstanceToDelete.id)
            }}
            disabled={deleteMutation.isPending}
            data-testid="course-creator-delete-confirm-button"
          >
            {t('courseCreator:delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}

const ChatInstanceEditor = ({ chatInstance, onDelete, isDeleting, onSave, isSaving }) => {
  const [name, setName] = useState(chatInstance.name)
  const [description, setDescription] = useState(chatInstance.description)
  const { t } = useTranslation()

  return (
    <Stack spacing={1.5}>
      <LocalizedTextField 
        label={t('courseCreator:name')}
        value={name}
        setValue={setName}
        testId='course-creator-edit-name-input'
      />
      <TextField
        label={t('courseCreator:description')}
        value={description}
        size="small"
        multiline
        minRows={2}
        onChange={(event) => setDescription(event.target.value)}
        slotProps={{
          htmlInput: {
            'data-testid': 'course-creator-edit-description-input',
          },
        }}
      />
      <Stack direction="row" spacing={1}>
        <Button
          variant="outlined"
          onClick={() =>
            onSave({
              id: chatInstance.id,
              payload: {
                name: name,
                description: description.trim(),
              },
            })
          }
          disabled={isSaving}
          data-testid="course-creator-save-button"
        >
          {t('courseCreator:save')}
        </Button>
        <Button
          color="error"
          variant="outlined"
          onClick={() =>
            onDelete(chatInstance.id)
          }
          disabled={isDeleting}
          data-testid="course-creator-delete-button"
        >
          {t('courseCreator:delete')}
        </Button>
      </Stack>
    </Stack>
  )
}