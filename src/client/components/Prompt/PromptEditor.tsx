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
  MenuItem,
  Select,
  Slider,
  TextField,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab
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
import { ClearOutlined, LibraryBooksOutlined, ExpandMore } from '@mui/icons-material'

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`prompt-editor-tabpanel-${index}`}
      aria-labelledby={`prompt-editor-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export const PromptEditor = ({ back, setEditorOpen, personal }: { back?: string; setEditorOpen?: React.Dispatch<boolean>; personal?: boolean }) => {
  const [tab, setTab] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

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
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }} >
        <Tabs value={tab} onChange={handleChange} aria-label="prompt-editor-tabs" slotProps={{ indicator: { style: { backgroundColor: 'black' } } }} textColor='inherit'>
          <Tab label="Muokkaa" />
          <Tab label="Esikatsele" />
        </Tabs>
      </Box>

      <Box>
        <form onSubmit={handleSubmit}>
          <TabPanel value={tab} index={0}>
            <PromptEditorContent
              back={back}
              setEditorOpen={setEditorOpen}
              personal={personal}
            />
          </TabPanel>
          <TabPanel value={tab} index={1}>
            <PromptEditorReview />
          </TabPanel>
        </form>
      </Box>

      <DialogActions>
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
          {loading && <CircularProgress color="secondary" />}
          {setEditorOpen && <OutlineButtonBlue onClick={() => setEditorOpen(false)}>{t('common:cancel')}</OutlineButtonBlue>}
          <OutlineButtonBlue disabled={loading} variant="contained" sx={{ ml: 1 }} onClick={() => tab === 0 ? setTab(1) : setTab(0)}>
            {tab === 1 ? 'Muokkaa' : 'Esikatsele'}
          </OutlineButtonBlue>
          <BlueButton disabled={loading} type="submit" variant="contained" sx={{ ml: 1 }}>
            {t('common:save')}
          </BlueButton>
        </Box>
      </DialogActions>
    </Box>
  );
}

const PromptEditorReview = () => {
  return (
    <Box>
      <Typography fontWeight="bold" my={2} variant='h5'>Halo</Typography>
      <Typography>There are many variations of passages of Lorem Ipsum available, but the majority have suffered alteration in some form, by injected humour, or randomised words which don't look even slightly believable. If you are going to use a passage of Lorem Ipsum, you need to be sure there isn't anything embarrassing hidden in the middle of text. All the Lorem Ipsum generators on the Internet tend to repeat predefined chunks as necessary, making this the first true generator on the Internet. It uses a dictionary of over 200 Latin words, combined with a handful of model sentence structures, to generate Lorem Ipsum which looks reasonable. The generated Lorem Ipsum is therefore always free from repetition, injected humour, or non-characteristic words etc.</Typography>
    </Box>)
}

const PromptEditorContent = ({ back, setEditorOpen, personal }: { back?: string; setEditorOpen?: React.Dispatch<boolean>; personal?: boolean }) => {
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

    <Box>
      {/* Basic information */}
      <Accordion defaultExpanded sx={accordionStyle}>
        <AccordionSummary
          expandIcon={<ExpandMore />}
          aria-controls="panel1-content"
          id="panel1-header">
          <Typography variant='h5' fontWeight="bold">Alustuksen perustiedot</Typography>
          {/* {t('prompt:basicInformation')} */}
        </AccordionSummary>
        <AccordionDetails>
          <Box mb={3}>
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
            <Typography mb={1} fontWeight="bold">Ohjeistus opiskelijoille alustuksen käytöstä</Typography>
            <TextField
              slotProps={{
                htmlInput: {
                  'data-testid': 'student-instructions-input',
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
        </AccordionDetails>
      </Accordion>

      <Divider />

      {/* LLM settings */}
      <Accordion defaultExpanded sx={accordionStyle}>
        <AccordionSummary
          expandIcon={<ExpandMore />}
          aria-controls="panel2-content"
          id="panel2-header">
          <Typography variant='h5' fontWeight="bold">Alustuksen kielimallin asetukset</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box mb={3}>
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
              <Box sx={{ mb: 3, p: 2 }}>
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
              </Box>
            </Collapse>
            {type !== 'PERSONAL' && (
              // label={t('prompt:hidePrompt')}
              <FormControlLabel control={<Checkbox checked={hidden} onChange={(e) => setHidden(e.target.checked)} />} label="Piilota kielimallin ohjeistus opiskelijoilta" />
            )}
          </Box>
          <Box mb={3}>
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
              placeholder="Esim. Olet avulias avustaja."
              value={systemMessage}
              onChange={(e) => setSystemMessage(e.target.value)}
              fullWidth
              multiline
              minRows={12}
              maxRows={48}
            />
          </Box>
        </AccordionDetails>
      </Accordion>

      <Divider />

      {/* RAG settings */}
      <Accordion defaultExpanded sx={accordionStyle}>
        <AccordionSummary
          expandIcon={<ExpandMore />}
          aria-controls="panel3-content"
          id="panel3-header">
          <Typography variant='h5' fontWeight="bold">Alustuksen lähdemateriaali aineisto</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box mb={3}>
            <Typography fontWeight="bold" my={1}>Valittu lähdemateriaali</Typography>
            {type === 'CHAT_INSTANCE' && (
              <Box display="flex" justifyContent="space-around" alignItems="center">
                <FormControl fullWidth>
                  <Select
                    data-testid="rag-select"
                    value={ragIndexId ?? ''}
                    onChange={(e) => setRagIndexId(e.target.value ? Number(e.target.value) : undefined)}
                    displayEmpty
                    renderValue={(value) => {
                      if (String(value) === '') {
                        return <em>{t('prompt:noSourceMaterials')}</em>
                      }
                      const selected = ragIndices?.find((i) => i.id === Number(value))
                      return selected ? selected.metadata.name : ''
                    }}

                  >
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
            <Box>
              <Typography fontWeight="bold" my={1}>Kielimallin lähdemateriaaliohjeistus</Typography>

              <OpenableTextfield
                value={ragSystemMessage}
                onChange={(e) => setRagSystemMessage(e.target.value)}
                onAppend={(text) => setRagSystemMessage((prev) => prev + (prev.trim().length ? ' ' : '') + text)}
                slotProps={{
                  htmlInput: { 'data-testid': 'rag-system-message-input' },
                }}
                fullWidth
                multiline
                minRows={4}
                maxRows={16}
              />
            </Box>
          </Collapse>

        </AccordionDetails>
      </Accordion>
    </Box>

  )
}

const accordionStyle = {
  mb: 2,
  p: 1,
  boxShadow: 0,
  '&:before': { display: 'none' },
}
