import { useEffect, useState } from 'react'
import type { PromptCreationParams, PromptEditableParams } from '@shared/prompt'
import type { ValidModelName } from '@config'
import { TextField, Box, Checkbox, FormControlLabel, FormControl, InputLabel, Select, MenuItem, Slider } from '@mui/material'
import { validModels } from '@config'
import { useTranslation } from 'react-i18next'
import type { RagIndexAttributes } from '@shared/types'
import { useCreatePromptMutation, useEditPromptMutation } from '../../hooks/usePromptMutation'
import { enqueueSnackbar } from 'notistack'
import { BlueButton } from '../ChatV2/general/Buttons'

interface PromptEditorProps {
  prompt?: PromptEditableParams & { id: string }
  ragIndices?: RagIndexAttributes[]
  type: PromptCreationParams['type']
  chatInstanceId?: string
}

export const PromptEditor = ({ prompt, ragIndices, type, chatInstanceId }: PromptEditorProps) => {
  const { t } = useTranslation()

  const editMutation = useEditPromptMutation()
  const createMutation = useCreatePromptMutation()

  const [name, setName] = useState<string>(prompt?.name ?? '')
  const [systemMessage, setSystemMessage] = useState<string>(prompt?.systemMessage ?? '')
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
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
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
        minRows={4}
        maxRows={24}
      />
      <FormControlLabel control={<Checkbox checked={hidden} onChange={(e) => setHidden(e.target.checked)} />} label={t('prompt:hidePrompt')} />
      <FormControlLabel control={<Checkbox checked={mandatory} onChange={(e) => setMandatory(e.target.checked)} />} label={t('prompt:editMandatoryPrompt')} />

      <FormControl fullWidth margin="normal">
        <InputLabel>{t('rag:sourceMaterials')}</InputLabel>
        {ragIndices && (
          <Select
            value={ragIndexId || ''}
            onChange={(e) => setRagIndexId(e.target.value ? Number(e.target.value) : undefined)}
            disabled={ragIndices === undefined || ragIndices.length === 0}
          >
            <MenuItem value="">
              <em>{t('prompt:noSourceMaterials')}</em>
            </MenuItem>
            {ragIndices?.map((index) => (
              <MenuItem key={index.id} value={index.id}>
                {index.metadata.name}
              </MenuItem>
            ))}
          </Select>
        )}
      </FormControl>
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
      <Box>
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
        {temperatureDefined && !modelHasTemperature && (
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
        )}
      </Box>
      <BlueButton type="submit" variant="contained" sx={{ mt: 2 }}>
        {t('common:save')}
      </BlueButton>
    </Box>
  )
}
