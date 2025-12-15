import type { ValidModelName } from '@config'
import { validModels } from '@config'
import {
    Box,
    Checkbox,
    CircularProgress,
    Collapse,
    DialogActions,
    Divider,
    FormControl,
    FormControlLabel,
    InputLabel,
    MenuItem,
    Select,
    Slider,
    TextField,
    Typography,
} from '@mui/material'
import type { Message } from '@shared/chat'
import { enqueueSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import useCourse from '../../hooks/useCourse'
import { useCourseRagIndices } from '../../hooks/useRagIndices'
import { BlueButton, LinkButtonHoc, OutlineButtonBlue } from '../ChatV2/general/Buttons'
import { usePromptState } from '../ChatV2/PromptState'
import OpenableTextfield from '../common/OpenableTextfield'
import { ClearOutlined, LibraryBooksOutlined } from '@mui/icons-material'
import { PromptInfoContent } from '../Prompt/PromptInfoContent'

export const PromptInfoModal = ({ back, setEditorOpen, personal }: { back?: string; setEditorOpen?: React.Dispatch<boolean>; personal?: boolean }) => {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const { courseId } = useParams() as { courseId: string }
    const { data: chatInstance } = useCourse(courseId)
    const { ragIndices } = useCourseRagIndices(chatInstance?.id, false)

    const { activePrompt: prompt, createPromptMutation, editPromptMutation } = usePromptState()
    let type: 'CHAT_INSTANCE' | 'PERSONAL' = 'CHAT_INSTANCE'
    if (courseId && courseId !== 'general') type = 'CHAT_INSTANCE'
    if (personal) type = 'PERSONAL'
    if (prompt) type = prompt.type

    const [name, setName] = useState<string>(prompt?.name ?? '')
    const [systemMessage, setSystemMessage] = useState<string>(prompt?.systemMessage ?? '')
    const [ragSystemMessage, setRagSystemMessage] = useState<string>(() =>
        prompt ? prompt.messages?.find((m: Message) => m.role === 'system')?.content as string || '' : t('prompt:defaultRagMessage'),
    )
    const [hidden, setHidden] = useState<boolean>(prompt?.hidden ?? false)
    const [ragIndexId, setRagIndexId] = useState<number | undefined | null>(prompt?.ragIndexId)

    const [selectedModel, setModel] = useState<ValidModelName | 'none'>(prompt?.model ?? 'none')

    const [temperatureDefined, setTemperatureDefined] = useState<boolean>(prompt?.temperature !== undefined)
    const [temperature, setTemperature] = useState<number>(prompt?.temperature ?? 0.5)

    const [loading, setLoading] = useState<boolean>(false)

    useEffect(() => {
        const selectedModelConfig = validModels.find((m) => m.name === selectedModel)
        if (selectedModelConfig && 'temperature' in selectedModelConfig) {
            setTemperature(selectedModelConfig.temperature)
            setTemperatureDefined(false)
        }
    }, [selectedModel])

    if (!prompt) return null

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, p: 2 }}>
            <PromptInfoContent
                name={prompt.name}
                userInstructions={prompt.userInstructions}
                systemMessage={prompt.systemMessage}
                systemMessageHidden={prompt.hidden}
            />
        </Box>
    )
}
