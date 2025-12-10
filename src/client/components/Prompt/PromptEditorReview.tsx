import {
    Box,
    Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { usePromptEditorForm } from './context'

export const PromptEditorReview = () => {
    const { form, setForm } = usePromptEditorForm()
    const { t } = useTranslation()

    return (
        <Box p={2}>
            <Typography>Alustuksen nimi</Typography>
            <Typography fontWeight="bold" my={2} variant='h5'>{form.name}</Typography>

            <Typography fontWeight="bold" my={2} variant='h5'>{form.userInstructions}</Typography>
        </Box>)
}

