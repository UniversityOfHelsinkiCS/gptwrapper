import { Alert, Box, Chip, CircularProgress, Dialog, DialogContent, DialogTitle, Divider, IconButton, Paper, Typography } from '@mui/material'
import { Add, Check, Close, ContentCopy, DeleteOutline, InfoOutlined, Key } from '@mui/icons-material'
import { Fragment, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { MAX_API_KEYS, type ApiKey } from '../../../shared/apiKey'
import { BlueButton, OutlineButtonBlack, OutlineButtonBlue, RedButton, TextButton } from '../ChatV2/general/Buttons'
import { enqueueSnackbar } from '../common/Snackbar'
import { isConflictError, useApiKeys, useCreateApiKeyMutation, useDeleteApiKeyMutation } from './api'
import { announceToScreenReader } from '../common/accessibility/SnackbarAnnouncer'

const formatDate = (date: string) => new Date(date).toLocaleString()
const maskKey = (apiKey: ApiKey) => `••••••••${apiKey.apiKey.slice(-4)}`

const monospace = { fontFamily: 'monospace' }
const keyGrid = { display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr) 56px', sm: 'minmax(0, 1fr) 190px 56px' }, alignItems: 'center', px: 2 }
const columnLabel = { fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }

const CreatedKeyPanel = ({ createdKey, onDismiss }: { createdKey: ApiKey; onDismiss: () => void }) => {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(createdKey.apiKey)
      setCopied(true)
      enqueueSnackbar(t('common:copiedToClipboard'), { variant: 'success' })
    } catch {
      enqueueSnackbar(t('apiKeys:copyError'), { variant: 'error' })
    }
  }

  return (
    <Paper
      role="region"
      aria-label={t('apiKeys:createdKey')}
      variant="outlined"
      sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2, borderColor: 'primary.light' }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Check color="success" fontSize="small" />
        <Typography fontWeight={600}>{t('apiKeys:created')}</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary">
        {t('apiKeys:shownOnce')}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'stretch', gap: 1 }}>
        <Box
          component="code"
          data-testid="created-api-key"
          sx={{
            ...monospace,
            flex: 1,
            minWidth: 0,
            minHeight: 44,
            display: 'flex',
            alignItems: 'center',
            px: 1.5,
            fontSize: 13,
            overflowWrap: 'anywhere',
            bgcolor: 'action.hover',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
          }}
        >
          {createdKey.apiKey}
        </Box>
        <OutlineButtonBlue onClick={handleCopy} startIcon={<ContentCopy />} sx={{ minWidth: 112 }}>
          {t(copied ? 'apiKeys:copied' : 'apiKeys:copy')}
        </OutlineButtonBlue>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <TextButton onClick={onDismiss} sx={[{ color: 'primary.main' }, (theme) => theme.applyStyles('dark', { color: theme.palette.text.primary })]}>
          {t('apiKeys:dismiss')}
        </TextButton>
      </Box>
    </Paper>
  )
}

export const ApiKeysDialog = ({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) => {
  const { t } = useTranslation()
  const { data: apiKeys, isLoading, isError } = useApiKeys(open)
  const createMutation = useCreateApiKeyMutation()
  const deleteMutation = useDeleteApiKeyMutation()
  const createdKey = createMutation.data

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const cancelDelete = (id: string) => {
    document.getElementById(`delete-api-key-${id}`)?.focus()
    setConfirmDeleteId(null)
  }

  const atLimit = (apiKeys?.length ?? 0) >= MAX_API_KEYS

  const handleClose = () => {
    createMutation.reset()
    setConfirmDeleteId(null)
    setOpen(false)
  }

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync()
      setConfirmDeleteId(null)
      announceToScreenReader(t('apiKeys:created'))
    } catch (error) {
      enqueueSnackbar(t(isConflictError(error) ? 'apiKeys:limitReached' : 'apiKeys:createError'), { variant: 'error' })
    }
  }

  const handleDelete = async (id: string) => {
    setConfirmDeleteId(null)
    if (createdKey?.id === id) createMutation.reset()
    try {
      await deleteMutation.mutateAsync(id)
      enqueueSnackbar(t('apiKeys:deleteSuccess'), { variant: 'success' })
      const target = document.getElementById('close-api-keys')
      if (target) target.focus()
    } catch {
      enqueueSnackbar(t('apiKeys:deleteError'), { variant: 'error' })
    }
  }

  return (
    <Dialog fullWidth maxWidth="md" open={open} onClose={handleClose} aria-labelledby="api-keys-dialog-title">
      <DialogTitle id="api-keys-dialog-title" sx={{ py: 2.5, pr: 10 }}>
        {t('apiKeys:title')}
      </DialogTitle>
      <IconButton
        id="close-api-keys"
        data-testid="close-api-keys"
        onClick={handleClose}
        aria-label={t('common:close')}
        sx={{ position: 'absolute', top: 16, right: 24 }}
      >
        <Close />
      </IconButton>
      <Divider />
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, p: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Key color="primary" sx={{ fontSize: 30 }} />
            <Typography component="h2" variant="h5" fontWeight="bold">
              {t('apiKeys:title')}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {t('apiKeys:description')}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography component="h3" sx={columnLabel}>
            {t('apiKeys:yourKeys')}
            {apiKeys && ` · ${apiKeys.length}/${MAX_API_KEYS}`}
          </Typography>
          <Divider sx={{ flex: 1 }} />
          <BlueButton onClick={handleCreate} disabled={createMutation.isPending || atLimit} startIcon={<Add />}>
            {t('apiKeys:create')}
          </BlueButton>
        </Box>

        {createdKey && <CreatedKeyPanel key={createdKey.id} createdKey={createdKey} onDismiss={() => createMutation.reset()} />}

        {isLoading ? (
          <CircularProgress size={24} aria-label={t('accessibility:loading')} />
        ) : isError ? (
          <Alert severity="error">{t('apiKeys:loadError')}</Alert>
        ) : !apiKeys?.length ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1.25,
              py: 5,
              px: 3,
              textAlign: 'center',
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 1.5,
            }}
          >
            <Key sx={{ fontSize: 40, color: 'text.disabled' }} />
            <Typography fontWeight={600}>{t('apiKeys:empty')}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 380 }}>
              {t('apiKeys:emptyHint')}
            </Typography>
          </Box>
        ) : (
          <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
            <Box sx={{ ...keyGrid, py: 1.25, borderBottom: 1, borderColor: 'divider' }}>
              <Typography sx={columnLabel}>{t('apiKeys:keyColumn')}</Typography>
              <Typography sx={{ ...columnLabel, display: { xs: 'none', sm: 'block' } }}>{t('apiKeys:createdAt')}</Typography>
            </Box>
            {apiKeys.map((apiKey, i) => (
              <Fragment key={apiKey.id}>
                {i > 0 && <Divider />}
                <Box sx={{ ...keyGrid, minHeight: 56, py: { xs: 1, sm: 0 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                    <Typography variant="body2" sx={monospace}>
                      {maskKey(apiKey)}
                    </Typography>
                    {createdKey?.id === apiKey.id && <Chip label={t('apiKeys:newBadge')} size="small" color="primary" variant="outlined" />}
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ gridRow: { xs: 2, sm: 'auto' } }}>
                    {formatDate(apiKey.createdAt)}
                  </Typography>
                  <IconButton
                    id={`delete-api-key-${apiKey.id}`}
                    onClick={() => setConfirmDeleteId(apiKey.id)}
                    disabled={deleteMutation.isPending && deleteMutation.variables === apiKey.id}
                    aria-label={t('apiKeys:deleteKey', { key: maskKey(apiKey) })}
                    aria-expanded={confirmDeleteId === apiKey.id}
                    sx={{ justifySelf: 'end', gridColumn: { xs: 2, sm: 'auto' }, gridRow: { xs: '1 / span 2', sm: 'auto' } }}
                  >
                    <DeleteOutline />
                  </IconButton>
                </Box>
                {confirmDeleteId === apiKey.id && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, bgcolor: 'error.light' + '1a' }}>
                    <Box sx={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                      <Typography id="api-key-delete-confirmation" variant="body2" fontWeight={600}>
                        <Trans
                          i18nKey="apiKeys:deleteConfirmTitle"
                          values={{ key: maskKey(apiKey) }}
                          components={{ key: <Box component="span" sx={{ ...monospace, fontWeight: 500 }} /> }}
                        />
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t('apiKeys:deleteConfirmText')}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <OutlineButtonBlack autoFocus onClick={() => cancelDelete(apiKey.id)} aria-describedby="api-key-delete-confirmation">
                        {t('common:cancel')}
                      </OutlineButtonBlack>
                      <RedButton
                        id="confirm-delete-api-key"
                        data-testid="confirm-delete-api-key"
                        onClick={() => handleDelete(apiKey.id)}
                        aria-label={t('apiKeys:deleteKey', { key: maskKey(apiKey) })}
                      >
                        {t('apiKeys:delete')}
                      </RedButton>
                    </Box>
                  </Box>
                )}
              </Fragment>
            ))}
          </Paper>
        )}

        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mt: 'auto', color: 'text.secondary' }}>
          <InfoOutlined sx={{ fontSize: 16, mt: '2px' }} />
          <Typography variant="caption">{t('apiKeys:securityNote')}</Typography>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
