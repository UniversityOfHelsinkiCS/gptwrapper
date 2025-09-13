import { useEffect, useState } from 'react'
import type { PromptCreationParams, PromptEditableParams } from '@shared/prompt'
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
  Grow,
  Collapse,
  Typography,
} from '@mui/material'
import { DEFAULT_RAG_SYSTEM_MESSAGE, validModels } from '@config'
import { useTranslation } from 'react-i18next'
import type { RagIndexAttributes } from '@shared/types'
import { useCreatePromptMutation, useEditPromptMutation } from '../../hooks/usePromptMutation'
import { enqueueSnackbar } from 'notistack'
import { BlueButton } from '../ChatV2/general/Buttons'
import OpenableTextfield from '../common/OpenableTextfield'

interface PromptEditorProps {
  prompt?: PromptEditableParams & { id: string }
  ragIndices?: RagIndexAttributes[]
  type: PromptCreationParams['type']
  chatInstanceId?: string
}

export const PromptEditor = ({ prompt, ragIndices, type, chatInstanceId }: PromptEditorProps) => {
  const { t } = useTranslation()
  console.log(prompt)
  const editMutation = useEditPromptMutation()
  const createMutation = useCreatePromptMutation()

  const [name, setName] = useState<string>(prompt?.name ?? '')
  const [systemMessage, setSystemMessage] = useState<string>(prompt?.systemMessage ?? '')
  const [ragSystemMessage, setRagSystemMessage] = useState<string>(() =>
    prompt ? prompt.messages?.find((m) => m.role === 'system')?.content || '' : DEFAULT_RAG_SYSTEM_MESSAGE,
  )
  const [hidden, setHidden] = useState<boolean>(prompt?.hidden ?? false)
  const [mandatory, setMandatory] = useState<boolean>(prompt?.mandatory ?? false)
  const [ragIndexId, setRagIndexId] = useState<number | undefined>(prompt?.ragIndexId)

  const [selectedModel, setModel] = useState<ValidModelName | 'none'>(prompt?.model ?? 'none')

  const [temperatureDefined, setTemperatureDefined] = useState<boolean>(prompt?.temperature !== undefined)
  const [temperature, setTemperature] = useState<number>(prompt?.temperature ?? 0.5)

  useEffect(() => {
    const selectedModelConfig = validModels.find((m) => m.name === selectedModel)
    if (selectedModelConfig && 'temperature' in selectedModelConfig) {
      setTemperature(selectedModelConfig.temperature)
      setTemperatureDefined(false)
    }
  }, [selectedModel])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const model = selectedModel !== 'none' ? selectedModel : undefined
    try {
      if (prompt) {
        await editMutation.mutateAsync({
          id: prompt.id,
          name,
          systemMessage,
          messages: [{ role: 'system', content: ragSystemMessage }],
          hidden,
          mandatory,
          ragIndexId,
          model,
          temperature,
        })
        enqueueSnackbar('Prompt updated', { variant: 'success' })
      } else {
        await createMutation.mutateAsync({
          name,
          type,
          ...(type === 'CHAT_INSTANCE' ? { chatInstanceId } : {}),
          systemMessage,
          messages: [{ role: 'system', content: ragSystemMessage }],
          hidden,
          mandatory,
          ragIndexId,
          model,
          temperature,
        })
      }
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' })
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
          <FormControlLabel control={<Checkbox checked={hidden} onChange={(e) => setHidden(e.target.checked)} />} label={t('prompt:hidePrompt')} />
          <FormControlLabel
            control={<Checkbox checked={mandatory} onChange={(e) => setMandatory(e.target.checked)} />}
            label={t('prompt:editMandatoryPrompt')}
          />
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
          <FormControl fullWidth margin="normal">
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
          </FormControl>
          <Collapse in={!!ragIndexId}>
            <OpenableTextfield
              slotProps={{
                htmlInput: {
                  'data-testid': 'rag-system-message-input',
                },
              }}
              label={t('prompt:ragSystemMessage')}
              value={ragSystemMessage}
              onChange={(e) => setRagSystemMessage(e.target.value)}
              fullWidth
              margin="normal"
              multiline
              minRows={3}
              maxRows={18}
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

      <DialogActions>
        <BlueButton type="submit" variant="contained" sx={{ mt: 2 }}>
          {t('common:save')}
        </BlueButton>
      </DialogActions>
    </form>
  )
}
