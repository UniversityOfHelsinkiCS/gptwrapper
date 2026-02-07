import {
    Box,
    Tab,
    Tabs,
    Typography,
} from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PromptInfo } from 'src/client/types'

export const PromptInfoContent = ({
    name,
    userInstructions,
    systemMessage,
    hidden,
    type
}: PromptInfo) => {
    const { t } = useTranslation()
    const getDefaultInstructions = () => {
        if (type === 'PERSONAL') return t('prompt:myPrompt')
        return hidden ? t('prompt:defaultChatInstructions') : t('prompt:defaultChatInstructionsVisible')
    }
    const [tab, setTab] = useState(0)

    const DescriptionContent = () => (
        <Box>
            <Typography variant="h5" fontWeight="bold">{name || '-'}</Typography>

            <Box sx={{ 
                mt: 2,
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap'
            }}>
                <Typography>
                    {userInstructions?.length ? userInstructions : getDefaultInstructions()}
                </Typography>
            </Box>
        </Box>
    )

    if (hidden) {
        return (
            <Box sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
            }}>
                <DescriptionContent />
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
                    pt: 3,
                    pb: 2,
                    px: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                }}>
                    <DescriptionContent />
                </Box>
            )}

            {tab === 1 && (
                <Box sx={{
                    pt: 3,
                    pb: 2,
                    px: 2,
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