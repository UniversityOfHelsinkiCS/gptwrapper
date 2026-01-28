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
import { PromptEditorFormContext } from './context'
import { PromptEditorForm } from './PromptEditorForm'
import { PromptEditorPreview } from './PromptEditorPreview'
import { PromptEditorFormContextValue, PromptEditorFormState } from 'src/client/types'

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

  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  const navigate = useNavigate()
  const { t } = useTranslation()
  const { courseId } = useParams() as { courseId: string }
  const { data: chatInstance } = useCourse(courseId)
  const { ragIndices } = useCourseRagIndices(chatInstance?.id, false)
  const [loading, setLoading] = useState<boolean>(false)
  const { activePrompt, createPromptMutation, editPromptMutation } = usePromptState()

  let type: 'CHAT_INSTANCE' | 'PERSONAL' = 'CHAT_INSTANCE'
  if (courseId && courseId !== 'general') type = 'CHAT_INSTANCE'
  if (personal) type = 'PERSONAL'
  if (activePrompt) type = activePrompt.type

  const [form, setForm] = useState<PromptEditorFormState>({
    name: activePrompt?.name ?? '',
    userInstructions: activePrompt?.userInstructions ?? '',
    systemMessage: activePrompt?.systemMessage ?? '',
    ragSystemMessage: activePrompt
      ? (activePrompt.messages?.find((m: Message) => m.role === 'system')?.content as string) || ''
      : t('prompt:defaultRagMessage'),
    hidden: activePrompt?.hidden ?? false,
    hideToolResults: activePrompt?.hideToolResults ?? false,
    ragIndexId: activePrompt?.ragIndexId ?? null,
    selectedModel: activePrompt?.model ?? 'none',
    temperatureDefined: activePrompt?.temperature !== undefined,
    temperature: activePrompt?.temperature ?? 0.5,
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

    if (!form.name) {
      enqueueSnackbar(t('prompt:missingPromptName'), { variant: 'error' })
      return
}
 
    setLoading(true)

    const {
      name,
      userInstructions,
      systemMessage,
      ragSystemMessage,
      hidden,
      hideToolResults,
      ragIndexId,
      selectedModel,
      temperature
    } = form

    const messages: Message[] = ragIndexId && ragSystemMessage.length > 0 ? [{ role: 'system', content: ragSystemMessage }] : []

    try {
      if (activePrompt) {
        await editPromptMutation({
          id: activePrompt.id,
          name,
          userInstructions,
          systemMessage,
          messages,
          hidden,
          hideToolResults,
          ragIndexId,
          model: selectedModel,
          temperature,
        })
        enqueueSnackbar(t('prompt:updatedPrompt', { name }), { variant: 'success' })
      } else {
        await createPromptMutation({
          name,
          type,
          userInstructions,
          ...(type === 'CHAT_INSTANCE' ? { chatInstanceId: chatInstance?.id } : {}),
          systemMessage,
          messages,
          hidden,
          hideToolResults,
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
          <Tab label={t('prompt:edit')} />
          <Tab label={t('prompt:preview')} />
        </Tabs>
      </Box>

      <form onSubmit={handleSubmit}>
        <TabPanel value={tab} index={0}>
          <PromptEditorForm />
        </TabPanel>
        <TabPanel value={tab} index={1}>
          <PromptEditorPreview />
        </TabPanel>

        <DialogActions>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            {loading && <CircularProgress color="secondary" />}
            {setEditorOpen && <OutlineButtonBlue onClick={() => setEditorOpen(false)}>{t('common:cancel')}</OutlineButtonBlue>}
            <OutlineButtonBlue disabled={loading} variant="contained" sx={{ ml: 1 }} onClick={() => tab === 0 ? setTab(1) : setTab(0)}>
              {tab === 1 ? t('prompt:edit') : t('prompt:preview')}
            </OutlineButtonBlue>
            <BlueButton disabled={loading} type="submit" variant="contained" sx={{ ml: 1 }}>
              {t('common:save')}
            </BlueButton>
          </Box>
        </DialogActions>
      </form>
    </PromptEditorFormContext.Provider>
  );
}
