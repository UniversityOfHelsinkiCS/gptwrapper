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

export const PromptEditor = ({ back, setEditorOpen, personal }: { back?: string; setEditorOpen?: React.Dispatch<boolean>; personal?: boolean }) => {
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
  const [studentInstructions, setStudentInstructions] = useState<string>(prompt?.studentInstructions ?? '')

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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)

    const messages: Message[] = ragIndexId && ragSystemMessage.length > 0 ? [{ role: 'system', content: ragSystemMessage }] : []

    try {
      if (prompt) {
        await editPromptMutation({
          id: prompt.id,
          name,
          studentInstructions,
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
          studentInstructions,
          ...(type === 'CHAT_INSTANCE' ? { chatInstanceId: chatInstance?.id } : {}),
          systemMessage,
          messages,
          hidden,
          ragIndexId,
          model: selectedModel,
          temperature,
        })
        enqueueSnackbar(t('prompt:createdPrompt', { name }), { variant: 'success' })
      }
      if (setEditorOpen) setEditorOpen(false)
      if (back) navigate(back)
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
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>

        <>
          {/* Basic information */}
          <Typography variant='h5' fontWeight="bold">Alustuksen perustiedot</Typography>
          {/* {t('prompt:basicInformation')} */}

          <Box>
            <Typography mb={1} fontWeight="bold">Alustuksen nimi</Typography>
            <TextField
              slotProps={{
                htmlInput: {
                  'data-testid': 'prompt-name-input',
                  minLength: 3,
                },
              }}
              placeholder={t('common:promptName')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
            />
          </Box>
          <Box>
            <Typography mb={1} fontWeight="bold">Alustuksen ohjeistus opiskelijoille</Typography>
            <TextField
              slotProps={{
                htmlInput: {
                  // 'data-testid': 'system-message-input',
                },
              }}
              value={studentInstructions}
              onChange={(e) => setStudentInstructions(e.target.value)}
              placeholder={'Esim:\n\n# Ohjeistus opiskelijoille.\nKäyttäkää currechattiä.'}
              fullWidth
              multiline
              minRows={8}
              maxRows={48}
            />
          </Box>
        </>

        <Divider sx={{ my: 3 }} />

        {/* LLM settings */}
        <>
          <Typography variant='h5' fontWeight="bold">Alustuksen kielimallin asetukset</Typography>
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
            <Collapse in={temperatureDefined && !modelHasTemperature}>
              <Slider
                value={temperature}
                onChange={(_, newValue) => setTemperature(newValue as number)}
                aria-labelledby="temperature-slider"
                valueLabelDisplay="auto"
                step={0.1}
                min={0}
                max={1}
                disabled={modelHasTemperature}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">{t('chat:predictableTemperature')}</Typography>
                <Typography variant="body2">{t('chat:creativeTemperature')}</Typography>
              </Box>
            </Collapse>
            {type !== 'PERSONAL' && (
              // label={t('prompt:hidePrompt')}
              <FormControlLabel control={<Checkbox checked={hidden} onChange={(e) => setHidden(e.target.checked)} />} label="Piilota kielimallin ohjeistus opiskelijoilta" />
            )}
          </Box>
          <Box>
            <Typography mb={1} fontWeight="bold">Alustuksen valittu kielimalli</Typography>
            <FormControl fullWidth >
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
          </Box>
          <Box>
            <Typography mb={1} fontWeight="bold">{t('prompt:systemMessage')}</Typography>
            <TextField
              slotProps={{
                htmlInput: {
                  'data-testid': 'system-message-input',
                },
              }}
              placeholder="Esim. Olet avulias."
              value={systemMessage}
              onChange={(e) => setSystemMessage(e.target.value)}
              fullWidth
              multiline
              minRows={12}
              maxRows={48}
            />
          </Box>
        </>


        <Divider sx={{ my: 3 }} />

        <>
          <Typography variant='h5' fontWeight="bold">Alustuksen lähdemateriaali aineisto</Typography>
          <Box>
            <Typography fontWeight="bold" my={1}>Valittu lähdemateriaali</Typography>
            {type === 'CHAT_INSTANCE' && (
              <Box display="flex" justifyContent="space-around" alignItems="center">
                <FormControl fullWidth>
                  <Select data-testid="rag-select" value={ragIndexId || ''} onChange={(e) => setRagIndexId(e.target.value ? Number(e.target.value) : undefined)}>
                    <MenuItem value="" data-testid="no-source-materials">
                      <em>{t('prompt:noSourceMaterials')}</em> <ClearOutlined sx={{ ml: 1 }} />
                    </MenuItem>
                    {ragIndices?.map((index) => (
                      <MenuItem key={index.id} value={index.id} data-testid={`source-material-${index.metadata.name}`}>
                        {index.metadata.name}
                      </MenuItem>
                    ))}
                    <Divider />
                    <LinkButtonHoc button={MenuItem} to={`/${courseId}/course/rag`}>
                      {t('prompt:courseSourceMaterials')} <LibraryBooksOutlined sx={{ ml: 1 }} />
                    </LinkButtonHoc>
                  </Select>
                </FormControl>
              </Box>
            )}
          </Box>
          <Collapse in={!!ragIndexId}>
            <Typography fontWeight="bold" my={1}>Kielimallin lähdemateriaali ohjeistus</Typography>

            <OpenableTextfield
              value={ragSystemMessage}
              onChange={(e) => setRagSystemMessage(e.target.value)}
              onAppend={(text) => setRagSystemMessage((prev) => prev + (prev.trim().length ? ' ' : '') + text)}
              slotProps={{
                htmlInput: { 'data-testid': 'rag-system-message-input' },
              }}
              label={t('prompt:ragSystemMessage')}
              fullWidth
              multiline
              minRows={2}
              maxRows={12}
            />
          </Collapse>
        </>

        <DialogActions>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            {loading && <CircularProgress color="secondary" />}
            {setEditorOpen && <OutlineButtonBlue onClick={() => setEditorOpen(false)}>{t('common:cancel')}</OutlineButtonBlue>}
            <BlueButton disabled={loading} type="submit" variant="contained" sx={{ ml: 1 }}>
              {t('common:save')}
            </BlueButton>
          </Box>
        </DialogActions>
      </Box>

    </form>

  )
}
