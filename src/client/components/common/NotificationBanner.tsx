import { Alert, IconButton, Stack, Box } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useNotifications } from '../../hooks/useNotifications'
import useLocalStorageState from '../../hooks/useLocalStorageState'

const NotificationBanner = () => {
  const { i18n, t } = useTranslation()
  const { notifications, isLoading } = useNotifications()
  const [dismissedIds, setDismissedIds] = useLocalStorageState<string[]>('dismissed-notifications', [])

  if (isLoading) return null

  const activeNotifications = notifications.filter((n) => !dismissedIds.includes(n.id))

  if (activeNotifications.length === 0) return null

  const handleDismiss = (id: string) => {
    setDismissedIds([...dismissedIds, id])
  }

  const getSeverity = (priority: number) => {
    if (priority >= 2) return 'error'
    if (priority === 1) return 'warning'
    return 'info'
  }

  return (
    <Box sx={{ position: 'relative', width: '100%', pr: '80px', pl: 2, pt: 2 }}>
      <Stack spacing={2} sx={{ mb: 2 }}>
        {activeNotifications.map((notification) => {
          const severity = getSeverity(notification.priority)
          return (
            <Alert
              key={notification.id}
              severity={severity}
              icon={false}
              sx={{
                '& .MuiAlert-message': {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  flex: 1,
                },
              }}
            >
              <Box sx={{ flex: 1 }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {notification.message[i18n.language as keyof typeof notification.message] || notification.message.en}
                </ReactMarkdown>
              </Box>
              <IconButton
                aria-label={t('common:close')}
                size="small"
                onClick={() => handleDismiss(notification.id)}
                sx={{ ml: 1 }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Alert>
          )
        })}
      </Stack>
    </Box>
  )
}

export default NotificationBanner
