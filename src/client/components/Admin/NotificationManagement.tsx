import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import AddIcon from '@mui/icons-material/Add'
import { useTranslation } from 'react-i18next'
import { enqueueSnackbar } from 'notistack'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAdminNotifications } from '../../hooks/useNotifications'
import {
  useCreateNotificationMutation,
  useUpdateNotificationMutation,
  useDeleteNotificationMutation,
} from '../../hooks/useNotificationMutation'
import type { Notification } from '../../hooks/useNotifications'
import type { Locales } from '@shared/types'

type NotificationFormData = {
  message: Locales
  startDate: Date | null
  endDate: Date | null
  priority: number
  active: boolean
}

const getSeverityFromPriority = (priority: number): string => {
  if (priority >= 2) return 'error'
  if (priority === 1) return 'warning'
  return 'info'
}

const getPriorityFromSeverity = (severity: string): number => {
  if (severity === 'error') return 2
  if (severity === 'warning') return 1
  return 0
}

const emptyForm: NotificationFormData = {
  message: { fi: '', en: '', sv: '' },
  startDate: null,
  endDate: null,
  priority: 0,
  active: true,
}

const NotificationDialog = ({
  open,
  onClose,
  notification,
}: {
  open: boolean
  onClose: () => void
  notification?: Notification
}) => {
  const { t } = useTranslation()
  const createMutation = useCreateNotificationMutation()
  const updateMutation = useUpdateNotificationMutation()
  const isEdit = Boolean(notification)

  const [formData, setFormData] = useState<NotificationFormData>(emptyForm)

  const [currentTab, setCurrentTab] = useState(0)

  useEffect(() => {
    if (notification) {
      setFormData({
        message: notification.message,
        startDate: notification.startDate ? new Date(notification.startDate) : null,
        endDate: notification.endDate ? new Date(notification.endDate) : null,
        priority: notification.priority,
        active: notification.active,
      })
    } else {
      setFormData(emptyForm)
    }
    setCurrentTab(0)
  }, [notification, open])

  const handleSubmit = async () => {
    if (!formData.message.fi || !formData.message.en || !formData.message.sv) {
      enqueueSnackbar(t('notifications:allLanguagesRequired'), { variant: 'error' })
      return
    }

    try {
      if (isEdit && notification) {
        await updateMutation.mutateAsync({
          id: notification.id,
          message: formData.message,
          startDate: formData.startDate?.toISOString() || null,
          endDate: formData.endDate?.toISOString() || null,
          priority: formData.priority,
          active: formData.active,
        })
        enqueueSnackbar(t('notifications:updated'), { variant: 'success' })
      } else {
        await createMutation.mutateAsync({
          message: formData.message,
          startDate: formData.startDate?.toISOString() || null,
          endDate: formData.endDate?.toISOString() || null,
          priority: formData.priority,
          active: formData.active,
        })
        enqueueSnackbar(t('notifications:created'), { variant: 'success' })
      }
      handleClose()
    } catch (error: any) {
      enqueueSnackbar(error.message || t('notifications:error'), { variant: 'error' })
    }
  }

  const handleClose = () => {
    setFormData(emptyForm)
    setCurrentTab(0)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>{isEdit ? t('notifications:edit') : t('notifications:create')}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Box>
            <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)}>
              <Tab label="Suomi (FI)" />
              <Tab label="English (EN)" />
              <Tab label="Svenska (SV)" />
              <Tab label={t('notifications:preview')} />
            </Tabs>

            {currentTab === 0 && (
              <TextField
                label={t('notifications:messageFi')}
                multiline
                rows={6}
                fullWidth
                value={formData.message.fi}
                onChange={(e) => setFormData({ ...formData, message: { ...formData.message, fi: e.target.value } })}
                sx={{ mt: 2 }}
                helperText={t('notifications:markdownSupported')}
              />
            )}

            {currentTab === 1 && (
              <TextField
                label={t('notifications:messageEn')}
                multiline
                rows={6}
                fullWidth
                value={formData.message.en}
                onChange={(e) => setFormData({ ...formData, message: { ...formData.message, en: e.target.value } })}
                sx={{ mt: 2 }}
                helperText={t('notifications:markdownSupported')}
              />
            )}

            {currentTab === 2 && (
              <TextField
                label={t('notifications:messageSv')}
                multiline
                rows={6}
                fullWidth
                value={formData.message.sv}
                onChange={(e) => setFormData({ ...formData, message: { ...formData.message, sv: e.target.value } })}
                sx={{ mt: 2 }}
                helperText={t('notifications:markdownSupported')}
              />
            )}

            {currentTab === 3 && (
              <Stack spacing={2} sx={{ mt: 2 }}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    {t('common:finnish')}
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{formData.message.fi || t('notifications:noContent')}</ReactMarkdown>
                  </Paper>
                </Box>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    {t('common:english')}
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{formData.message.en || t('notifications:noContent')}</ReactMarkdown>
                  </Paper>
                </Box>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    {t('common:swedish')}
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{formData.message.sv || t('notifications:noContent')}</ReactMarkdown>
                  </Paper>
                </Box>
              </Stack>
            )}
          </Box>

          <Stack direction="row" spacing={2}>
            <DatePicker
              label={t('notifications:startDate')}
              value={formData.startDate}
              onChange={(date) => setFormData({ ...formData, startDate: date })}
              slotProps={{
                textField: { fullWidth: true, helperText: t('notifications:optionalDate') },
                actionBar: { actions: ['clear'] },
              }}
            />
            <DatePicker
              label={t('notifications:endDate')}
              value={formData.endDate}
              onChange={(date) => setFormData({ ...formData, endDate: date })}
              slotProps={{
                textField: { fullWidth: true, helperText: t('notifications:optionalDate') },
                actionBar: { actions: ['clear'] },
              }}
            />
          </Stack>

          <FormControl fullWidth>
            <InputLabel>{t('notifications:severity')}</InputLabel>
            <Select
              value={getSeverityFromPriority(formData.priority)}
              label={t('notifications:severity')}
              onChange={(e) => setFormData({ ...formData, priority: getPriorityFromSeverity(e.target.value) })}
            >
              <MenuItem value="info">{t('notifications:info')}</MenuItem>
              <MenuItem value="warning">{t('notifications:warning')}</MenuItem>
              <MenuItem value="error">{t('notifications:error')}</MenuItem>
            </Select>
          </FormControl>

          <Box>
            <Typography component="label" sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <Switch checked={formData.active} onChange={(e) => setFormData({ ...formData, active: e.target.checked })} />
              {t('notifications:active')}
            </Typography>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('common:cancel')}</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={createMutation.isPending || updateMutation.isPending}>
          {isEdit ? t('common:save') : t('common:create')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function NotificationManagement() {
  const { t, i18n } = useTranslation()
  const { notifications, isLoading } = useAdminNotifications()
  const deleteMutation = useDeleteNotificationMutation()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingNotification, setEditingNotification] = useState<Notification | undefined>()

  const handleCreate = () => {
    setEditingNotification(undefined)
    setDialogOpen(true)
  }

  const handleEdit = (notification: Notification) => {
    setEditingNotification(notification)
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('notifications:confirmDelete'))) return

    try {
      await deleteMutation.mutateAsync(id)
      enqueueSnackbar(t('notifications:deleted'), { variant: 'success' })
    } catch (error: any) {
      enqueueSnackbar(error.message || t('notifications:error'), { variant: 'error' })
    }
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingNotification(undefined)
  }

  if (isLoading) {
    return <Typography>{t('common:loading')}</Typography>
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5">{t('notifications:title')}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
          {t('notifications:create')}
        </Button>
      </Stack>

      {notifications.length === 0 ? (
        <Typography color="textSecondary">{t('notifications:noNotifications')}</Typography>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('notifications:message')}</TableCell>
              <TableCell>{t('notifications:startDate')}</TableCell>
              <TableCell>{t('notifications:endDate')}</TableCell>
              <TableCell>{t('notifications:severity')}</TableCell>
              <TableCell>{t('notifications:active')}</TableCell>
              <TableCell>{t('notifications:actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {notifications.map((notification) => (
              <TableRow key={notification.id}>
                <TableCell>
                  <Typography variant="body2" sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {notification.message[i18n.language as keyof Locales] || notification.message.en}
                  </Typography>
                </TableCell>
                <TableCell>{notification.startDate ? new Date(notification.startDate).toLocaleDateString() : '-'}</TableCell>
                <TableCell>{notification.endDate ? new Date(notification.endDate).toLocaleDateString() : '-'}</TableCell>
                <TableCell>{t(`notifications:${getSeverityFromPriority(notification.priority)}`)}</TableCell>
                <TableCell>{notification.active ? t('common:yes') : t('common:no')}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleEdit(notification)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(notification.id)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <NotificationDialog open={dialogOpen} onClose={handleCloseDialog} notification={editingNotification} />
    </Box>
  )
}
