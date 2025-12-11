import {
    Box,
    Divider,
    TextField,
    Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { usePromptEditorForm } from './context'

export const PromptEditorPreview = () => {
    const { form } = usePromptEditorForm()
    const { t } = useTranslation()

    return (
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Typography fontWeight="bold" variant='h4'>{form.name}</Typography>
            <Typography>{form.userInstructions}</Typography>

            {
                !form.hidden &&
                <>
                    <Divider />
                    <Box>
                        <Typography mb={2} fontWeight="bold">Kielimallin ohjeistus</Typography>
                        <TextField
                            value={form.systemMessage}
                            placeholder='Ei kielimallin ohjeita'
                            minRows={8}
                            fullWidth
                            multiline
                            slotProps={{
                                input: {
                                    readOnly: true,
                                    style: {
                                        userSelect: 'none',
                                        pointerEvents: 'none',
                                        opacity: 0.8
                                    }
                                },
                            }} />
                    </Box>
                </>
            }

        </Box>)
}

