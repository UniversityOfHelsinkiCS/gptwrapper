import { Alert, IconButton, Stack, Box, type SxProps, type Theme } from '@mui/material'
import { memo, useEffect, useState } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined'
import { visuallyHidden } from '@mui/utils'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useNotifications } from '../../hooks/useNotifications'
import useLocalStorageState from '../../hooks/useLocalStorageState'

// Same icons that MUI's Alert uses by default, rendered next to the centered text instead of at the left edge
const severityIcons = {
  info: InfoOutlinedIcon,
  warning: ReportProblemOutlinedIcon,
  error: ErrorOutlineIcon,
}

// The banner remounts e.g. whenever a chat finishes loading. Screen readers announce every newly mounted
// role="alert", so each notification is announced only once per page load.
const announcedIds = new Set<string>()

const NotificationBanner = ({ sx }: { sx?: SxProps<Theme> }) => {
  const { i18n, t } = useTranslation()
  const { notifications, isLoading } = useNotifications()
  const [dismissedIds, setDismissedIds] = useLocalStorageState<string[]>('dismissed-notifications', [])
  const [previouslyAnnouncedIds] = useState(() => new Set(announcedIds))

  useEffect(() => {
    notifications.forEach((n) => announcedIds.add(n.id))
  }, [notifications])

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
    <Box sx={[{ position: 'relative', width: '100%', pr: '80px', pl: 2, pt: 2 }, ...(Array.isArray(sx) ? sx : [sx])]}>
      <Stack spacing={2} sx={{ mb: 2 }}>
        {activeNotifications.map((notification) => {
          const severity = getSeverity(notification.priority)
          let severityLabel: string | null = null
          if (severity === 'error') severityLabel = t('accessibility:errorNotification')
          if (severity === 'warning') severityLabel = t('accessibility:warningNotification')
          const SeverityIcon = severityIcons[severity]
          return (
            <Alert
              key={notification.id}
              severity={severity}
              role={previouslyAnnouncedIds.has(notification.id) ? 'note' : 'alert'}
              icon={false}
              sx={{
                alignItems: 'center',
                '& .MuiAlert-message': {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  flex: 1,
                  minWidth: 0,
                },
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
                <SeverityIcon color={severity} sx={{ fontSize: 22, flexShrink: 0 }} />
                <Box
                  id="notification"
                  sx={{
                    textAlign: 'center',
                    maxWidth: '80ch',
                    textWrap: 'balance',
                    minWidth: 0,
                    overflowWrap: 'anywhere',
                    '& > :first-child, & > span + *': { mt: 0 },
                    '& > :last-child': { mb: 0 },
                  }}
                >
                  {severityLabel && <Box component="span" sx={visuallyHidden}>{`${severityLabel}: `}</Box>}
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {notification.message[i18n.language as keyof typeof notification.message] || notification.message.en}
                  </ReactMarkdown>
                </Box>
              </Box>
              <IconButton
                aria-label={t('accessibility:closeNotification')}
                aria-describedby="notification"
                size="small"
                onClick={() => handleDismiss(notification.id)}
                sx={{ ml: 1, mr: 1 }}
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

// Memoized because ChatV2 re-renders on every streamed chunk
export default memo(NotificationBanner)
