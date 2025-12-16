import { Alert, Box, Typography } from '@mui/material'
import { Course, User } from 'src/client/types'
import { ChatInfo } from './general/ChatInfo'
import { useTranslation } from 'react-i18next'

export default function ChatExpiredView({ user, chatInstance }: { user: User | null | undefined, chatInstance: Course }) {
    const { t } = useTranslation()
    const isResponsible = user?.isAdmin || chatInstance.responsibilities?.some((r) => r.user.id === user?.id)

    const { startDate, endDate } = chatInstance.activityPeriod
    const start = new Date(startDate)
    const end = new Date(endDate)
    const now = new Date()

    if (now < start && !isResponsible) {
        return (
            <Box>
                <ChatInfo course={chatInstance} />
                <Alert severity="warning" style={{ marginTop: 20 }}>
                    <Typography variant="h6">{t('course:curreNotStarted')}</Typography>
                </Alert>
            </Box>
        )
    }

    if (now > end && !isResponsible) {
        return (
            <Box>
                <ChatInfo course={chatInstance} />
                <Alert severity="warning" style={{ marginTop: 20 }}>
                    <Typography variant="h6">{t('course:curreExpired')}</Typography>
                </Alert>
            </Box>
        )
    }
}
