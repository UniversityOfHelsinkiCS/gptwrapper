import { useEffect, useState } from 'react'
import type { ValidModelName } from '@config'
import {
  TextField,
  Box,
  Checkbox,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  DialogActions,
  Collapse,
  Typography,
  CircularProgress,
} from '@mui/material'
import { validModels } from '@config'
import { useTranslation } from 'react-i18next'
import { enqueueSnackbar } from 'notistack'
import { BlueButton } from '../ChatV2/general/Buttons'
import OpenableTextfield from '../common/OpenableTextfield'
import { Message } from '@shared/chat'
import { usePromptState } from '../ChatV2/PromptState'
import { useParams } from 'react-router-dom'
import { useCourseRagIndices } from '../../hooks/useRagIndices'
import useCourse from '../../hooks/useCourse'

export const PromptEditor = () => {
  const { t } = useTranslation()
  const { courseId } = useParams() as { courseId: string }
  const { data: chatInstance } = useCourse(courseId)
  const { ragIndices } = useCourseRagIndices(chatInstance?.id, false)

  const { activePrompt: prompt, createPromptMutation, editPromptMutation } = usePromptState()
  const type = prompt?.type ?? 'CHAT_INSTANCE'
  const [name, setName] = useState<string>(prompt?.name ?? '')
  const [systemMessage, setSystemMessage] = useState<string>(prompt?.systemMessage ?? '')
  const [ragSystemMessage, setRagSystemMessage] = useState<string>(() =>
    prompt ? prompt.messages?.find((m: Message) => m.role === 'system')?.content || '' : t('prompt:defaultRagMessage'),
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)

    const messages: Message[] = ragIndexId && ragSystemMessage.length > 0 ? [{ role: 'system', content: ragSystemMessage }] : []

    try {
      if (prompt) {
        await editPromptMutation({
          id: prompt.id,
          name,
          systemMessage,
          messages,
          hidden,
          ragIndexId,
          model: selectedModel,
          temperature,
        })
        enqueueSnackbar(t('prompt:updatedPrompt', { name }), { variant: 'success' })
      } else {
        await createPromptMutation({
          name,
          type,
          ...(type === 'CHAT_INSTANCE' ? { courseId } : {}),
          systemMessage,
          messages,
          hidden,
          ragIndexId,
          model: selectedModel,
          temperature,
        })
        enqueueSnackbar(t('prompt:createdPrompt', { name }), { variant: 'success' })
      }
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  /**
   * If model has temperature, temperature is not relevant option and should not be shown to user.
   */
  const modelHasTemperature = selectedModel && 'temperature' in (validModels.find((m) => m.name === selectedModel) ?? {})

  return (
    <form onSubmit={handleSubmit}>
      <Box sx={{ mt: 2, display: 'flex', gap: '1rem' }}>
        <Box sx={{ flex: 1 }} component="section">
          <Typography component="h3" gutterBottom>
            {t('prompt:basicInformation')}
          </Typography>
          <TextField
            slotProps={{
              htmlInput: {
                'data-testid': 'prompt-name-input',
                minLength: 3,
              },
            }}
            label={t('common:promptName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            margin="normal"
          />
          {courseId !== 'general' && <FormControlLabel control={<Checkbox checked={hidden} onChange={(e) => setHidden(e.target.checked)} />} label={t('prompt:hidePrompt')} />}
          <FormControl fullWidth margin="normal">
            <InputLabel>{t('common:model')}</InputLabel>
            <Select value={selectedModel || ''} onChange={(e) => setModel(e.target.value as ValidModelName | 'none')}>
              <MenuItem value="none">
                <em>{t('prompt:modelFreeToChoose')}</em>
              </MenuItem>
              {validModels.map((m) => (
                <MenuItem key={m.name} value={m.name}>
                  {m.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Checkbox
                checked={temperatureDefined && !modelHasTemperature}
                onChange={(e) => setTemperatureDefined(e.target.checked)}
                disabled={modelHasTemperature}
              />
            }
            label={t('chat:temperature')}
          />
          <Collapse in={temperatureDefined && !modelHasTemperature}>
            <Slider
              value={temperature}
              onChange={(_, newValue) => setTemperature(newValue as number)}
              aria-labelledby="temperature-slider"
              valueLabelDisplay="auto"
              step={0.1}
              marks
              min={0}
              max={1}
              disabled={modelHasTemperature}
            />
          </Collapse>
        </Box>
        <Box sx={{ flex: 2 }} component="section">
          <Typography component="h3" gutterBottom>
            {t('prompt:context')}
          </Typography>
          {type === 'CHAT_INSTANCE' && <FormControl fullWidth margin="normal">
            <InputLabel>{t('rag:sourceMaterials')}</InputLabel>
            <Select data-testid="rag-select" value={ragIndexId || ''} onChange={(e) => setRagIndexId(e.target.value ? Number(e.target.value) : undefined)}>
              <MenuItem value="" data-testid="no-source-materials">
                <em>{t('prompt:noSourceMaterials')}</em>
              </MenuItem>
              {ragIndices?.map((index) => (
                <MenuItem key={index.id} value={index.id} data-testid={`source-material-${index.metadata.name}`}>
                  {index.metadata.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>}
          <Collapse in={!!ragIndexId}>
            <OpenableTextfield
              value={ragSystemMessage}
              onChange={(e) => setRagSystemMessage(e.target.value)}
              onAppend={(text) => setRagSystemMessage((prev) => prev + (prev.trim().length ? ' ' : '') + text)}
              slotProps={{
                htmlInput: { 'data-testid': 'rag-system-message-input' },
              }}
              label={t('prompt:ragSystemMessage')}
              fullWidth
              margin="normal"
              multiline
              minRows={2}
              maxRows={12}
            />
          </Collapse>
          <TextField
            slotProps={{
              htmlInput: {
                'data-testid': 'system-message-input',
              },
            }}
            label={t('prompt:systemMessage')}
            value={systemMessage}
            onChange={(e) => setSystemMessage(e.target.value)}
            fullWidth
            margin="normal"
            multiline
            minRows={12}
            maxRows={48}
            sx={{ flex: 1 }}
          />
        </Box>
      </Box>
      <DialogActions >
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
          {loading && <CircularProgress color="secondary" />}
          <BlueButton disabled={loading} type="submit" variant="contained" sx={{ ml: 1 }}>
            {t('common:save')}
          </BlueButton>
        </Box>
      </DialogActions>
    </form>
  )
}
