import {
    Box,
    Divider,
    Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'

export const PromptInfoContent = ({ name, userInstructions, systemMessage, systemMessageHidden }: { name?: string, userInstructions?: string, systemMessage?: string, systemMessageHidden?: boolean }) => {
    const { t } = useTranslation()

    return (
        <>
            <Box>
                <Typography mb={2} fontWeight="bold" variant='h6'>{t('prompt:promptName')}</Typography>
                <Typography mb={4}>{name}</Typography>
                <Typography mb={2} fontWeight="bold" variant='h6'>{t('prompt:promptInstructions')}</Typography>
                <Typography component="div">
                    <ReactMarkdown>
                        {userInstructions?.length ? userInstructions : t('prompt:defaultChatInstructions')}
                    </ReactMarkdown>
                </Typography>
            </Box>

            {
                !systemMessageHidden &&
                <>
                    <Divider />
                    <Box>
                        <Typography mb={2} fontWeight="bold" variant='h6'>{t('prompt:systemMessageLabel')}</Typography>
                        <Box
                            sx={{
                                // Mimic MUI TextField Outline styles
                                border: '1px solid',
                                borderColor: 'rgba(0, 0, 0, 0.23)', // Standard MUI input border color
                                borderRadius: 1, // Standard MUI radius (4px)
                                p: '0.5rem 1rem', // Standard MUI input padding
                                minHeight: '190px', // approx minRows={8}
                                opacity: 0.8,
                                backgroundColor: 'grey.100'
                            }}
                        >
                            {systemMessage ? (
                                <ReactMarkdown>
                                    {systemMessage}
                                </ReactMarkdown>
                            ) : (
                                <Typography color="text.secondary">
                                    {t('prompt:noSystemMessage')}
                                </Typography>
                            )}
                        </Box>
                    </Box>
                </>
            }
        </>
    )
}