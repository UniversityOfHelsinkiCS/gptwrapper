import { Alert } from '@mui/material'
import { usePromptEditorForm } from './context'
import { PromptInfoContent } from './PromptInfoContent'
import { useTranslation } from 'react-i18next'

export const PromptEditorPreview = () => {
    const { t } = useTranslation()
    const { form, type } = usePromptEditorForm()

    return (
        <>
            {type !== 'PERSONAL' && <Alert sx={{ mb: 3 }} severity='info'>{t('prompt:studentViewInfoAlert')}</Alert>}

            <PromptInfoContent
                name={form.name}
                userInstructions={form.userInstructions}
                systemMessage={form.systemMessage}
                hidden={form.hidden}
                type={type}
            />
        </>
    )
}