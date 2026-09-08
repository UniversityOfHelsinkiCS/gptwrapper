import { Alert, Box, Typography } from '@mui/material'
import { ChatInfo } from './general/ChatInfo'
import { useTranslation } from 'react-i18next'
import { ChatStatus } from '@shared/types'
import { Course } from 'src/client/types'

type Props = {
  status: Exclude<ChatStatus, 'ACTIVATED'>
  chatInstance: Course
}

export const ChatExpiredView = ({ status, chatInstance }: Props) => {
  const { t } = useTranslation()

  let message

  switch (status) {
    case 'NOT_STARTED': {
      message = t('course:curreNotStarted')
      break
    }
    case 'EXPIRED': {
      message = t('course:curreExpired')
      break
    }
    case 'NOT_ACTIVATED': {
      message = t('course:curreNotActivated')
      break
    }
  }

  return (
    <Box>
      <ChatInfo course={chatInstance} />
      <Alert severity="warning" style={{ marginTop: 20 }}>
        <Typography variant="h6">{message}</Typography>
      </Alert>
    </Box>
  )
}
