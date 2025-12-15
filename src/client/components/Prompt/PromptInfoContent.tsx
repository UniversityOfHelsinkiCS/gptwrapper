import {
    Box,
    Divider,
    Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import { usePromptEditorForm } from './context'

const muiTextfieldMimic = {
    border: '1px solid',
    borderColor: 'rgba(0, 0, 0, 0.16)',
    borderRadius: 1,
    p: '16.5px 14px', // Exact MUI OutlinedInput padding
    backgroundColor: 'grey.50',
    '& p': {
        m: 0, // Removes margin from Markdown paragraphs
        lineHeight: 1.5 // Ensures readable text height
    },
    // Add space between paragraphs if there are multiple
    '& p + p': {
        mt: 1
    }
}

const multilineMimic = {
    minHeight: '190px' // mimics 8 rows
}

export const PromptInfoContent = ({ name, userInstructions, systemMessage, systemMessageHidden }: { name?: string, userInstructions?: string, systemMessage?: string, systemMessageHidden?: boolean }) => {
    const { type } = usePromptEditorForm()
    const { t } = useTranslation()
    const defaultInstructions = type === 'PERSONAL' ? t('prompt:myPrompt') : t('prompt:defaultChatInstructions')

    return (
        <>
            <Box>
                <Typography mb={2} fontWeight="bold">{t('prompt:promptName')}</Typography>

                {/* No <p> wrapper needed anymore */}
                <Box sx={muiTextfieldMimic}>
                    <Typography>{name || '-'}</Typography>
                </Box>

                <Typography mt={3} mb={2} fontWeight="bold">
                    {type === 'PERSONAL' ? t('prompt:promptDescription') : t('prompt:promptInstructions')}
                </Typography>

                <Box sx={{ ...muiTextfieldMimic, ...multilineMimic }}>
                    <ReactMarkdown>
                        {userInstructions?.length ? userInstructions : defaultInstructions}
                    </ReactMarkdown>
                </Box>
            </Box>

            {
                !systemMessageHidden &&
                <>
                    <Divider sx={{ my: 3 }} />
                    <Box>
                        <Typography mb={2} fontWeight="bold">{t('prompt:systemMessageLabel')}</Typography>
                        <Box sx={{ ...muiTextfieldMimic, ...multilineMimic }}>
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