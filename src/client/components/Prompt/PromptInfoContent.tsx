import {
    Box,
    Divider,
    Tab,
    Tabs,
    Typography,
} from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import { PromptInfo } from 'src/client/types'

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

export const PromptInfoContent = ({
    name,
    userInstructions,
    systemMessage,
    hidden,
    type
}: PromptInfo) => {

    const { t } = useTranslation()
    const defaultInstructions = type === 'PERSONAL' ? t('prompt:myPrompt') : t('prompt:defaultChatInstructions')
    const [tab, setTab] = useState(0)

    // If system message is hidden, render content without tabs
    if (hidden) {
        return (
            <Box sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
            }}>
                <Box>
                    <Typography variant="h5" fontWeight="bold">{name || '-'}</Typography>

                    <Box sx={{ 
                        mt: 2,
                        overflowWrap: 'break-word',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap'
                    }}>
                        <Typography>
                            {userInstructions?.length ? userInstructions : defaultInstructions}
                        </Typography>
                    </Box>
                </Box>
            </Box>
        )
    }

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
        }}>
            <Tabs 
                sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }} 
                value={tab} 
                onChange={(_, newValue) => setTab(newValue)}
            >
                <Tab label={t('prompt:description')} />
                <Tab label={t('prompt:languageModel')} />
            </Tabs>

            {tab === 0 && (
                <Box sx={{
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                }}>
                    <Box>
                        <Typography variant="h5" fontWeight="bold">{name || '-'}</Typography>

                        <Box sx={{ 
                            mt: 2,
                            overflowWrap: 'break-word',
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap'
                        }}>
                            <Typography>
                                {userInstructions?.length ? userInstructions : defaultInstructions}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            )}

            {tab === 1 && (
                <Box sx={{
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                }}>
                    <Box sx={{ 
                        overflowWrap: 'break-word',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap'
                    }}>
                        {systemMessage ? (
                            <Typography>
                                {systemMessage}
                            </Typography>
                        ) : (
                            <Typography color="text.secondary">
                                {t('prompt:noSystemMessage')}
                            </Typography>
                        )}
                    </Box>
                </Box>
            )}
        </Box>
    )
}