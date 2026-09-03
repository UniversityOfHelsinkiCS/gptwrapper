import { type SetStateAction, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditIcon from '@mui/icons-material/Edit'
import UndoIcon from '@mui/icons-material/Undo'
import { useTranslation } from 'react-i18next'
import { enqueueSnackbar } from 'notistack'
import type { UniversityPromptBody, UniversityPromptType } from '@shared/prompt'
import { PromptEditorFormContext } from '../Prompt/context'
import { PromptEditorForm } from '../Prompt/PromptEditorForm'
import type { PromptEditorFormContextValue, PromptEditorFormState } from '../../types'
import useLocalStorageState from '../../hooks/useLocalStorageState'
import {
  groupToBody,
  universityPromptLanguages,
  useCreateUniversityPromptMutation,
  useDeleteUniversityPromptMutation,
  useUniversityPromptGroups,
  useUpdateUniversityPromptMutation,
  type UniversityPromptGroup,
  type UniversityPromptLanguage,
  type UniversityPromptLanguageBody,
} from '../../hooks/useUniversityPromptAdmin'

const languageLabels: Record<UniversityPromptLanguage, string> = {
  fi: 'Suomi (FI)',
  en: 'English (EN)',
  sv: 'Svenska (SV)',
}

type LanguageState = {
  /** False means "this translation does not exist / should be removed on save". */
  enabled: boolean
  /** True when the API already has this language — removing it is destructive. */
  existed: boolean
  form: PromptEditorFormState
  messages: UniversityPromptLanguageBody['messages']
}

type EditorState = {
  type: UniversityPromptType
  published: boolean
  languages: Record<UniversityPromptLanguage, LanguageState>
}

type CachedEditorState = {
  type: UniversityPromptType
  published: boolean
  languages: Record<UniversityPromptLanguage, { enabled: boolean; form: PromptEditorFormState }>
}

const emptyForm = (): PromptEditorFormState => ({
  name: '',
  userInstructions: '',
  systemMessage: '',
  ragSystemMessages: [],
  customMessage: '',
  hidden: false,
  ragHidden: false,
  ragIndexId: null,
  userId: null,
})

const emptyLanguage = (): LanguageState => ({ enabled: false, existed: false, form: emptyForm(), messages: [] })

const buildEditorState = (group?: UniversityPromptGroup): EditorState => {
  const children = group?.prompts ?? []

  const languages = Object.fromEntries(
    universityPromptLanguages.map((language) => {
      const prompt = children.find((child) => child.language === language)

      if (!prompt) return [language, emptyLanguage()]

      return [
        language,
        {
          enabled: true,
          existed: true,
          messages: prompt.messages ?? [],
          form: {
            ...emptyForm(),
            name: prompt.name,
            userInstructions: prompt.userInstructions ?? '',
            systemMessage: prompt.systemMessage,
          },
        } satisfies LanguageState,
      ]
    }),
  ) as Record<UniversityPromptLanguage, LanguageState>

  return {
    type: children[0]?.type ?? 'UNIVERSITY',
    published: group?.published ?? false,
    languages,
  }
}

const toCached = (state: EditorState): CachedEditorState => ({
  type: state.type,
  published: state.published,
  languages: Object.fromEntries(
    universityPromptLanguages.map((language) => [language, { enabled: state.languages[language].enabled, form: state.languages[language].form }]),
  ) as CachedEditorState['languages'],
})

const mergeDraft = (base: EditorState, draft?: CachedEditorState): EditorState => ({
  type: draft?.type ?? base.type,
  published: draft?.published ?? base.published,
  languages: Object.fromEntries(
    universityPromptLanguages.map((language) => [
      language,
      {
        enabled: draft?.languages?.[language]?.enabled ?? base.languages[language].enabled,
        existed: base.languages[language].existed,
        messages: base.languages[language].messages,
        form: { ...base.languages[language].form, ...draft?.languages?.[language]?.form },
      } satisfies LanguageState,
    ]),
  ) as Record<UniversityPromptLanguage, LanguageState>,
})

const groupLanguages = (group: UniversityPromptGroup) =>
  universityPromptLanguages.filter((language) => (group.prompts ?? []).some((prompt) => prompt.language === language))

const groupTitle = (group: UniversityPromptGroup, preferred: string) => {
  const children = group.prompts ?? []
  const preferredChild = children.find((prompt) => prompt.language === preferred)
  return preferredChild?.name ?? children[0]?.name
}

const UniversityPromptDialog = ({ open, onClose, group }: { open: boolean; onClose: () => void; group?: UniversityPromptGroup }) => {
  const { t } = useTranslation()
  const createMutation = useCreateUniversityPromptMutation()
  const updateMutation = useUpdateUniversityPromptMutation()
  const isEdit = Boolean(group)

  const base = useMemo(() => buildEditorState(group), [group])

  const cacheKey = `universityPromptEditorForm:${group ? `edit:${group.id}` : 'new'}`
  const [draft, setDraft] = useLocalStorageState<CachedEditorState>(cacheKey, toCached(base))

  const state = useMemo(() => mergeDraft(base, draft), [base, draft])

  const setState = (update: SetStateAction<EditorState>) =>
    setDraft((prevDraft) => toCached(typeof update === 'function' ? update(mergeDraft(base, prevDraft)) : update))

  const [currentTab, setCurrentTab] = useState<UniversityPromptLanguage>('fi')

  const active = state.languages[currentTab]

  const setActiveForm: PromptEditorFormContextValue['setForm'] = (update) =>
    setState((prev) => {
      const current = prev.languages[currentTab]
      const form = typeof update === 'function' ? update(current.form) : update

      return { ...prev, languages: { ...prev.languages, [currentTab]: { ...current, form } } }
    })

  const context: PromptEditorFormContextValue = {
    form: active.form,
    setForm: setActiveForm,
    type: state.type,
    // University prompts carry no source material; the RAG section is hidden.
    ragIndices: [],
    userRagIndices: [],
    courseId: '',
  }

  const enabledLanguages = universityPromptLanguages.filter((language) => state.languages[language].enabled)
  /** Languages the API currently holds that this save would destroy. */
  const removedLanguages = universityPromptLanguages.filter((language) => state.languages[language].existed && !state.languages[language].enabled)

  const setLanguageEnabled = (language: UniversityPromptLanguage, enabled: boolean) =>
    setState((prev) => ({ ...prev, languages: { ...prev.languages, [language]: { ...prev.languages[language], enabled } } }))

  const hasChanges = JSON.stringify(toCached(base)) !== JSON.stringify(draft)

  const clearDraft = () => localStorage.removeItem(cacheKey)

  const handleClose = () => {
    if (hasChanges && !window.confirm(t('prompt:unSavedChanges'))) return

    clearDraft()
    onClose()
  }

  const handleSubmit = async () => {
    if (enabledLanguages.length === 0) {
      enqueueSnackbar(t('uniPrompts:atLeastOneLanguage'), { variant: 'error' })
      return
    }

    const incomplete = enabledLanguages.find((language) => !state.languages[language].form.name.trim() || !state.languages[language].form.systemMessage.trim())

    if (incomplete) {
      // Saving anyway would drop the language from the body, and the API reads
      // an omitted language as "delete it".
      enqueueSnackbar(t('uniPrompts:incompleteLanguage', { language: languageLabels[incomplete] }), { variant: 'error' })
      setCurrentTab(incomplete)
      return
    }

    if (removedLanguages.length > 0) {
      const names = removedLanguages.map((language) => languageLabels[language]).join(', ')
      if (!window.confirm(t('uniPrompts:confirmRemoveTranslations', { languages: names }))) return
    }

    const body: UniversityPromptBody = {
      type: state.type,
      published: state.published,
      ...Object.fromEntries(
        enabledLanguages.map((language) => {
          const { form, messages } = state.languages[language]

          return [
            language,
            {
              name: form.name.trim(),
              userInstructions: form.userInstructions,
              systemMessage: form.systemMessage,
              messages,
            },
          ]
        }),
      ),
    }

    try {
      if (isEdit && group) {
        await updateMutation.mutateAsync({ id: group.id, ...body })
        enqueueSnackbar(t('uniPrompts:updated'), { variant: 'success' })
      } else {
        await createMutation.mutateAsync(body)
        enqueueSnackbar(t('uniPrompts:created'), { variant: 'success' })
      }
      clearDraft()
      onClose()
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.message || error?.message || t('uniPrompts:error'), { variant: 'error' })
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>{isEdit ? t('uniPrompts:editTitle') : t('uniPrompts:createTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel id="uniprompt-category-label">{t('uniPrompts:category')}</InputLabel>
            <Select
              labelId="uniprompt-category-label"
              data-testid="uniprompt-category-select"
              value={state.type}
              label={t('uniPrompts:category')}
              onChange={(e) => setState((prev) => ({ ...prev, type: e.target.value as UniversityPromptType }))}
            >
              <MenuItem value="UNIVERSITY">{t('uniPrompts:categoryUniversity')}</MenuItem>
              <MenuItem value="TEMPLATE">{t('uniPrompts:categoryTemplate')}</MenuItem>
            </Select>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              {t('uniPrompts:categoryHelp')}
            </Typography>
          </FormControl>

          <FormControlLabel
            control={<Switch checked={state.published} onChange={(e) => setState((prev) => ({ ...prev, published: e.target.checked }))} />}
            label={t('uniPrompts:published')}
          />

          <Box>
            <Tabs value={currentTab} onChange={(_, value) => setCurrentTab(value)}>
              {universityPromptLanguages.map((language) => (
                <Tab
                  key={language}
                  value={language}
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      {languageLabels[language]}
                      {state.languages[language].enabled ? (
                        <Chip size="small" color="success" variant="outlined" label={t('uniPrompts:languageExists')} />
                      ) : (
                        <Chip
                          size="small"
                          color={state.languages[language].existed ? 'error' : 'default'}
                          variant="outlined"
                          label={state.languages[language].existed ? t('uniPrompts:languageWillBeDeleted') : t('uniPrompts:languageEmpty')}
                        />
                      )}
                    </Box>
                  }
                />
              ))}
            </Tabs>

            {removedLanguages.length > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {t('uniPrompts:removalWarning', { languages: removedLanguages.map((language) => languageLabels[language]).join(', ') })}
              </Alert>
            )}

            {active.enabled ? (
              <Box sx={{ mt: 2 }}>
                <PromptEditorFormContext.Provider value={context}>
                  <PromptEditorForm hideRagSettings hideVisibilityToggle />
                </PromptEditorFormContext.Provider>
                <Button color="error" startIcon={<DeleteOutlineIcon />} onClick={() => setLanguageEnabled(currentTab, false)}>
                  {t('uniPrompts:removeTranslation')}
                </Button>
              </Box>
            ) : (
              <Stack spacing={2} alignItems="flex-start" sx={{ mt: 3 }}>
                <Typography color="text.secondary">
                  {active.existed ? t('uniPrompts:translationMarkedForDeletion') : t('uniPrompts:translationMissing')}
                </Typography>
                <Button variant="outlined" startIcon={active.existed ? <UndoIcon /> : <AddIcon />} onClick={() => setLanguageEnabled(currentTab, true)}>
                  {active.existed ? t('uniPrompts:keepTranslation') : t('uniPrompts:addTranslation')}
                </Button>
              </Stack>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('common:cancel')}</Button>
        <Button onClick={handleSubmit} variant="contained" data-testid="uniprompt-save" disabled={createMutation.isPending || updateMutation.isPending}>
          {isEdit ? t('common:save') : t('common:create')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function UniversityPromptManagement() {
  const { t, i18n } = useTranslation()
  const { groups, isLoading } = useUniversityPromptGroups()
  const updateMutation = useUpdateUniversityPromptMutation()
  const deleteMutation = useDeleteUniversityPromptMutation()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<UniversityPromptGroup | undefined>()

  const handleCreate = () => {
    setEditingGroup(undefined)
    setDialogOpen(true)
  }

  const handleEdit = (group: UniversityPromptGroup) => {
    setEditingGroup(group)
    setDialogOpen(true)
  }

  const handleTogglePublished = async (group: UniversityPromptGroup) => {
    try {
      // groupToBody resends every existing language: a PUT that omitted them
      // would delete them.
      await updateMutation.mutateAsync({ id: group.id, ...groupToBody(group, { published: !group.published }) })
      enqueueSnackbar(t('uniPrompts:updated'), { variant: 'success' })
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.message || error?.message || t('uniPrompts:error'), { variant: 'error' })
    }
  }

  const handleDelete = async (group: UniversityPromptGroup) => {
    if (!window.confirm(t('uniPrompts:confirmDelete'))) return

    try {
      await deleteMutation.mutateAsync(group.id)
      enqueueSnackbar(t('uniPrompts:deleted'), { variant: 'success' })
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.message || error?.message || t('uniPrompts:error'), { variant: 'error' })
    }
  }

  if (isLoading) return <Typography>{t('common:loading')}</Typography>

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5">{t('uniPrompts:title')}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate} data-testid="uniprompt-create">
          {t('uniPrompts:create')}
        </Button>
      </Stack>

      {groups.length === 0 ? (
        <Typography color="textSecondary">{t('uniPrompts:noPrompts')}</Typography>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('uniPrompts:name')}</TableCell>
              <TableCell>{t('uniPrompts:languages')}</TableCell>
              <TableCell>{t('uniPrompts:published')}</TableCell>
              <TableCell>{t('uniPrompts:category')}</TableCell>
              <TableCell>{t('uniPrompts:actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.map((group) => {
              const languages = groupLanguages(group)
              const category = (group.prompts ?? [])[0]?.type ?? 'UNIVERSITY'

              return (
                <TableRow key={group.id}>
                  <TableCell>{groupTitle(group, i18n.language) ?? t('uniPrompts:untitled')}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      {universityPromptLanguages.map((language) => (
                        <Chip
                          key={language}
                          size="small"
                          label={language.toUpperCase()}
                          variant={languages.includes(language) ? 'filled' : 'outlined'}
                          color={languages.includes(language) ? 'primary' : 'default'}
                        />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={group.published}
                          onChange={() => handleTogglePublished(group)}
                          disabled={updateMutation.isPending}
                          slotProps={{ input: { 'aria-label': t('uniPrompts:published') } }}
                        />
                      }
                      label={group.published ? t('uniPrompts:published') : t('uniPrompts:draft')}
                    />
                  </TableCell>
                  <TableCell>{category === 'TEMPLATE' ? t('uniPrompts:categoryTemplate') : t('uniPrompts:categoryUniversity')}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleEdit(group)} aria-label={t('common:edit')}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(group)} aria-label={t('common:delete')}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      {dialogOpen && (
        <UniversityPromptDialog
          open={dialogOpen}
          group={editingGroup}
          onClose={() => {
            setDialogOpen(false)
            setEditingGroup(undefined)
          }}
        />
      )}
    </Box>
  )
}
