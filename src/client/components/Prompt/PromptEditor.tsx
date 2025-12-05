import { validModels } from '@config'
import {
  Box,
  CircularProgress,
  DialogActions,
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
import { BlueButton, OutlineButtonBlue } from '../ChatV2/general/Buttons'
import { usePromptState } from '../ChatV2/PromptState'
import { PromptEditorFormContext, PromptEditorFormContextValue, PromptEditorFormState, usePromptEditorForm } from './context'
import { PromptEditorForm } from './PromptEditorForm'
import { PromptEditorReview } from './PromptEditorReview'

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
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
  const [loading, setLoading] = useState<boolean>(false)

  const { activePrompt: prompt, createPromptMutation, editPromptMutation } = usePromptState()
  let type: 'CHAT_INSTANCE' | 'PERSONAL' = 'CHAT_INSTANCE'
  if (courseId && courseId !== 'general') type = 'CHAT_INSTANCE'
  if (personal) type = 'PERSONAL'
  if (prompt) type = prompt.type

  const [form, setForm] = useState<PromptEditorFormState>({
    name: prompt?.name ?? '',
    studentInstructions: prompt?.studentInstructions ?? '',
    systemMessage: prompt?.systemMessage ?? '',
    ragSystemMessage: prompt
      ? (prompt.messages?.find((m: Message) => m.role === 'system')?.content as string) || ''
      : t('prompt:defaultRagMessage'),
    hidden: prompt?.hidden ?? false,
    ragIndexId: prompt?.ragIndexId ?? null,
    selectedModel: prompt?.model ?? 'none',
    temperatureDefined: prompt?.temperature !== undefined,
    temperature: prompt?.temperature ?? 0.5,
  })

  const modelHasTemperature =
    form.selectedModel && 'temperature' in (validModels.find((m) => m.name === form.selectedModel) ?? {})

  useEffect(() => {
    const selectedModelConfig = validModels.find((m) => m.name === form.selectedModel)
    if (selectedModelConfig && 'temperature' in selectedModelConfig) {
      setForm((prev) => ({
        ...prev,
        temperature: selectedModelConfig.temperature,
        temperatureDefined: false,
      }))
    }
  }, [form.selectedModel])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)

    const {
      name,
      studentInstructions,
      systemMessage,
      ragSystemMessage,
      hidden,
      ragIndexId,
      selectedModel,
      temperature
    } = form

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

  const context: PromptEditorFormContextValue = {
    form,
    setForm,
    type,
    ragIndices,
    courseId,
    modelHasTemperature,
  }

  return (
    <PromptEditorFormContext.Provider value={context}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }} >
        <Tabs value={tab} onChange={handleChange} aria-label="prompt-editor-tabs" slotProps={{ indicator: { style: { backgroundColor: 'black' } } }} textColor='inherit'>
          <Tab label="Muokkaa" />
          <Tab label="Esikatsele" />
        </Tabs>
      </Box>

      <Box>
        <form onSubmit={handleSubmit}>
          <TabPanel value={tab} index={0}>
            <PromptEditorForm />
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
    </PromptEditorFormContext.Provider>
  );
}

