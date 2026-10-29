import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Add, Check, Close, Code, ContentCopy, DeleteOutline, ExpandMore, InfoOutlined, Key } from '@mui/icons-material'
import { FREE_MODEL, PUBLIC_URL } from '@config'
import { type FormEvent, Fragment, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { API_KEY_NAME_MAX_LENGTH, MAX_API_KEYS, type ApiKey } from '../../../shared/apiKey'
import { BlueButton, OutlineButtonBlack, OutlineButtonBlue, RedButton, TextButton } from '../ChatV2/general/Buttons'
import { enqueueSnackbar } from '../common/Snackbar'
import { isConflictError, useApiKeys, useCreateApiKeyMutation, useDeleteApiKeyMutation } from './api'
import { announceToScreenReader } from '../common/accessibility/SnackbarAnnouncer'

const formatDate = (date: string) => new Date(date).toLocaleString()
// Keys created before naming have an empty name
const keyLabel = (apiKey: ApiKey) => apiKey.name || apiKey.apiKey

const monospace = { fontFamily: 'monospace' }
const keyGrid = { display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr) 56px', sm: 'minmax(0, 1fr) 190px 56px' }, alignItems: 'center', px: 2 }
const columnLabel = { fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }

const codeSurface = { ...monospace, fontSize: 13, bgcolor: 'action.hover', border: 1, borderColor: 'divider', borderRadius: 1 }
const codeBox = { ...codeSurface, minWidth: 0, minHeight: 44, display: 'flex', alignItems: 'center', px: 1.5, overflowWrap: 'anywhere' }

const CopyButton = ({ text, label }: { text: string; label?: string }) => {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      enqueueSnackbar(t('common:copiedToClipboard'), { variant: 'success' })
    } catch {
      enqueueSnackbar(t('apiKeys:copyError'), { variant: 'error' })
    }
  }

  return (
    <OutlineButtonBlue
      onClick={handleCopy}
      startIcon={<ContentCopy />}
      aria-label={label && t('accessibility:copyToClipboard', { item: label })}
      sx={{ minWidth: 112, flexShrink: 0 }}
    >
      {t(copied ? 'apiKeys:copied' : 'apiKeys:copy')}
    </OutlineButtonBlue>
  )
}

const CopyRow = ({ label, text }: { label: string; text: string }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
    <Typography variant="body2" fontWeight={600}>
      {label}
    </Typography>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      <Box component="code" sx={{ ...codeBox, flex: '1 1 260px' }}>
        {text}
      </Box>
      <CopyButton text={text} label={label} />
    </Box>
  </Box>
)

const IntegrationGuide = () => {
  const { t } = useTranslation()
  const baseUrl = `${window.location.origin}${PUBLIC_URL}/api/external/v1`
  const authHeader = 'Authorization: Bearer YOUR_API_KEY'
  const curlExample = `curl ${baseUrl}/chat/completions \\
  -H "${authHeader}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "MODEL_NAME",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`
  const endpoints = [
    { method: 'GET', path: '/models', description: t('apiKeys:listModels') },
    { method: 'POST', path: '/chat/completions', description: t('apiKeys:chatCompletions') },
  ]

  return (
    <Accordion variant="outlined" disableGutters slotProps={{ transition: { unmountOnExit: true } }} sx={{ '&::before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMore />} sx={{ minHeight: 52 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Code color="primary" />
          <Typography fontWeight={600}>{t('apiKeys:howToUse')}</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, borderTop: 1, borderColor: 'divider', pt: 2 }}>
        <Typography variant="body2">{t('apiKeys:integrationIntro')}</Typography>

        <CopyRow label={t('apiKeys:baseUrl')} text={baseUrl} />
        <CopyRow label={t('apiKeys:authHeader')} text={authHeader} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="body2" fontWeight={600}>
            {t('apiKeys:endpoints')}
          </Typography>
          <Paper variant="outlined" component={Stack} divider={<Divider />}>
            {endpoints.map((endpoint) => (
              <Box key={endpoint.path} sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 2, rowGap: 0.5, px: 2, py: 1.5 }}>
                <Box component="code" sx={{ ...monospace, flex: '0 0 220px', fontSize: 13, fontWeight: 600 }}>
                  <Box component="span" sx={{ color: 'primary.main' }}>
                    {endpoint.method}
                  </Box>{' '}
                  {endpoint.path}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ flex: '1 1 240px' }}>
                  {endpoint.description}
                </Typography>
              </Box>
            ))}
          </Paper>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" fontWeight={600}>
              {t('apiKeys:exampleRequest')}
            </Typography>
            <CopyButton text={curlExample} label={t('apiKeys:exampleRequest')} />
          </Box>
          <Box component="pre" data-testid="api-curl-example" sx={{ ...codeSurface, m: 0, p: 2, overflowX: 'auto', lineHeight: 1.6 }}>
            <code>{curlExample}</code>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {t('apiKeys:exampleHint')}
          </Typography>
        </Box>

        <Alert severity="info" variant="outlined">
          <Typography variant="body2">{t('apiKeys:usageNote')}</Typography>
          <Typography variant="body2" sx={{ mt: 0.75 }}>
            <Trans i18nKey="apiKeys:freeModelNote" values={{ model: FREE_MODEL }} components={{ b: <Box component="strong" sx={{ fontWeight: 600 }} /> }} />
          </Typography>
        </Alert>
      </AccordionDetails>
    </Accordion>
  )
}

const CreatedKeyPanel = ({ createdKey, onDismiss }: { createdKey: ApiKey; onDismiss: () => void }) => {
  const { t } = useTranslation()

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
        <Box component="code" data-testid="created-api-key" sx={{ ...codeBox, flex: 1 }}>
          {createdKey.apiKey}
        </Box>
        <CopyButton text={createdKey.apiKey} />
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
  const [name, setName] = useState('')

  const cancelDelete = (id: string) => {
    document.getElementById(`delete-api-key-${id}`)?.focus()
    setConfirmDeleteId(null)
  }

  const atLimit = (apiKeys?.length ?? 0) >= MAX_API_KEYS

  const handleClose = () => {
    createMutation.reset()
    setConfirmDeleteId(null)
    setName('')
    setOpen(false)
  }

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await createMutation.mutateAsync(name.trim())
      setName('')
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
            {t('apiKeys:newKeyHeading')}
          </Typography>
          <Divider sx={{ flex: 1 }} />
        </Box>

        <Box
          component="form"
          onSubmit={handleCreate}
          sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'flex-start' }, gap: 1.5 }}
        >
          <TextField
            label={t('apiKeys:nameLabel')}
            size="small"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={atLimit}
            helperText={atLimit ? t('apiKeys:limitReached') : undefined}
            slotProps={{ htmlInput: { maxLength: API_KEY_NAME_MAX_LENGTH } }}
            sx={{ flex: 1 }}
          />
          <BlueButton type="submit" disabled={createMutation.isPending || atLimit || !name.trim()} startIcon={<Add />}>
            {t('apiKeys:create')}
          </BlueButton>
        </Box>

        {createdKey && <CreatedKeyPanel key={createdKey.id} createdKey={createdKey} onDismiss={() => createMutation.reset()} />}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography component="h3" sx={columnLabel}>
            {t('apiKeys:yourKeys')}
            {apiKeys && ` · ${apiKeys.length}/${MAX_API_KEYS}`}
          </Typography>
          <Divider sx={{ flex: 1 }} />
        </Box>

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
                    <Box sx={{ minWidth: 0 }}>
                      {apiKey.name && (
                        <Typography variant="body2" fontWeight={600} sx={{ overflowWrap: 'anywhere' }}>
                          {apiKey.name}
                        </Typography>
                      )}
                      <Typography variant="body2" color={apiKey.name ? 'text.secondary' : undefined} sx={monospace}>
                        {apiKey.apiKey}
                      </Typography>
                    </Box>
                    {createdKey?.id === apiKey.id && <Chip label={t('apiKeys:newBadge')} size="small" color="primary" variant="outlined" />}
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ gridRow: { xs: 2, sm: 'auto' } }}>
                    {formatDate(apiKey.createdAt)}
                  </Typography>
                  <IconButton
                    id={`delete-api-key-${apiKey.id}`}
                    onClick={() => setConfirmDeleteId(apiKey.id)}
                    disabled={deleteMutation.isPending && deleteMutation.variables === apiKey.id}
                    aria-label={t('apiKeys:deleteKey', { key: keyLabel(apiKey) })}
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
                          values={{ key: keyLabel(apiKey) }}
                          components={{ key: <Box component="span" sx={{ ...(apiKey.name ? {} : monospace), fontWeight: 500 }} /> }}
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
                        aria-label={t('apiKeys:deleteKey', { key: keyLabel(apiKey) })}
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

        <IntegrationGuide />

        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mt: 'auto', color: 'text.secondary' }}>
          <InfoOutlined sx={{ fontSize: 16, mt: '2px' }} />
          <Typography variant="caption">{t('apiKeys:securityNote')}</Typography>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
