import { Alert, Box, Typography } from '@mui/material';
import { ChatInfo } from './general/ChatInfo';
import { useTranslation } from 'react-i18next';

export const ChatExpiredView = ({ status, chatInstance }) => {
    const { t } = useTranslation()

    const message = status === 'NOT_STARTED'
        ? t('course:curreNotStarted')
        : t('course:curreExpired');

    return (
        <Box>
            <ChatInfo course={chatInstance} />
            <Alert severity="warning" style={{ marginTop: 20 }}>
                <Typography variant="h6">{message}</Typography>
            </Alert>
        </Box>
    );
};