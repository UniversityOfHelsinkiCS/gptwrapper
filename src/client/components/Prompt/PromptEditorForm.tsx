import { Box, Switch, Collapse, Divider, FormControl, FormControlLabel, ListSubheader, MenuItem, Select, TextField, Tooltip, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import RagMessageEditor from './RagMessageEditor'
import { ClearOutlined, VisibilityOutlined, VisibilityOffOutlined } from '@mui/icons-material'
import PsychologyIcon from '@mui/icons-material/Psychology'
import EditNoteIcon from '@mui/icons-material/EditNote'
import BookmarksIcon from '@mui/icons-material/Bookmarks'
import { usePromptEditorForm } from './context'
import { monospaceStyle } from '../../theme'
import { useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material'
import { TextButton } from '../ChatV2/general/Buttons'
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt'
import { useNavigate, useParams } from 'react-router-dom'
import useCurrentUser from '../../hooks/useCurrentUser'
import useCourse from '../../hooks/useCourse'

const BasicInfoSection = () => {
  const { form, setForm, type } = usePromptEditorForm()
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const { courseId } = useParams()
  const { data: chatInstance } = useCourse(courseId)
  const courseResponsibilities = chatInstance?.responsibilities || []

  const promptCreator = courseResponsibilities.find((u) => u.user.id === form.userId)

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1}>
        <EditNoteIcon color="secondary" />
        <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
          {t('prompt:promptBasicInfo')}
        </Typography>
      </Box>
      {promptCreator?.user.first_names && promptCreator?.user.last_name && (form.userId === user?.id || user?.isAdmin) && (
        <Box display="flex" gap={1} mt={3} flexDirection="row" alignItems="center" justifyContent="space-between">
          <Typography variant="body1">
            {t('prompt:creatorName', { firstNames: promptCreator?.user.first_names.split(' ')[0], lastName: promptCreator?.user.last_name })}
          </Typography>
          <FormControlLabel
            control={<Switch checked={form.showCreator} onChange={(e) => setForm((prev) => ({ ...prev, showCreator: e.target.checked }))} />}
            label={
              <Box display="flex" alignItems="flex-end" gap={1}>
                {t('prompt:showCreator')}
                {!form.showCreator ? <VisibilityOffOutlined fontSize="small" color="error" /> : <VisibilityOutlined fontSize="small" color="success" />}
              </Box>
            }
          />
        </Box>
      )}
      <Box mb={3}>
        <Typography variant="overline" mb={1} fontWeight="bold">
          {t('prompt:name')}
        </Typography>
        <TextField
          required
          label={t('common:required')}
          variant="filled"
          slotProps={{
            htmlInput: {
              'data-testid': 'prompt-name-input',
              minLength: 3,
              maxLength: 100,
            },
          }}
          autoFocus
          placeholder={t('common:promptName')}
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          fullWidth
        />
      </Box>
      <Box>
        <Typography variant="overline" mb={1} fontWeight="bold">
          {type === 'PERSONAL' ? t('prompt:promptDescription') : t('prompt:studentInstructionsLabel')}
        </Typography>

        <TextField
          variant="filled"
          slotProps={{
            htmlInput: {
              'data-testid': 'student-instructions-input',
            },
          }}
          value={form.userInstructions}
          onChange={(e) => setForm((prev) => ({ ...prev, userInstructions: e.target.value }))}
          fullWidth
          multiline
          minRows={type === 'PERSONAL' ? 1 : 4}
          maxRows={48}
        />
      </Box>
    </Box>
  )
}

const ModelSettingsSection = () => {
  const { form, setForm, type } = usePromptEditorForm()
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <PsychologyIcon color="secondary" />
        <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
          {t('prompt:promptModelSettings')}
        </Typography>
        {type !== 'PERSONAL' && (
          <FormControlLabel
            sx={{ ml: 'auto' }}
            control={<Switch checked={!form.hidden} onChange={(e) => setForm((prev) => ({ ...prev, hidden: !e.target.checked }))} />}
            label={
              <Box display="flex" alignItems="center" gap={1}>
                {t('prompt:showForStudents')}
                {form.hidden ? <VisibilityOffOutlined fontSize="small" color="error" /> : <VisibilityOutlined fontSize="small" color="success" />}
              </Box>
            }
          />
        )}
      </Box>

      <Box>
        <TextField
          variant="filled"
          sx={{ '& textarea': monospaceStyle, ...(!isMobile && { maxHeight: '300px', overflow: 'auto' }) }}
          slotProps={{
            htmlInput: {
              'data-testid': 'system-message-input',
            },
          }}
          placeholder={t('prompt:systemMessagePlaceholder')}
          value={form.systemMessage}
          onChange={(e) => setForm((prev) => ({ ...prev, systemMessage: e.target.value }))}
          fullWidth
          multiline
          minRows={8}
          maxRows={48}
        />
      </Box>
    </Box>
  )
}

const RagSettingsSection = () => {
  const { form, setForm, type, ragIndices, userRagIndices, courseId, editingPromptId, editingPromptTab } = usePromptEditorForm()
  const { t } = useTranslation()
  const theme = useTheme()
  const navigate = useNavigate()

  if (type === 'PERSONAL') return null // Personal prompts don't have RAGs

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <BookmarksIcon color="secondary" />
        <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
          {t('prompt:promptSourceMaterialData')}
        </Typography>
      </Box>
      <Box mb={3}>
        <Box display="flex" alignItems="center">
          <Typography variant="overline" fontWeight="bold" my={1}>
            {t('prompt:ragInUse')}
          </Typography>
          <FormControlLabel
            sx={{ ml: 'auto' }}
            control={<Switch checked={!form.ragHidden} onChange={(e) => setForm((prev) => ({ ...prev, ragHidden: !e.target.checked }))} />}
            label={
              <Box display="flex" alignItems="center" gap={1}>
                {t('prompt:showForStudents')}
                {form.ragHidden ? <VisibilityOffOutlined fontSize="small" color="error" /> : <VisibilityOutlined fontSize="small" color="success" />}
              </Box>
            }
          />
        </Box>
        {type === 'CHAT_INSTANCE' && (
          <Box display="flex" justifyContent="space-around" alignItems="center" flexDirection="column" gap={2}>
            <FormControl fullWidth>
              <Select
                data-testid="rag-select"
                value={form.ragIndexId ?? ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    ragIndexId: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                displayEmpty
                renderValue={(value) => {
                  if (String(value) === '') {
                    return <em>{t('prompt:noSourceMaterials')}</em>
                  }
                  const numValue = Number(value)
                  const selected = ragIndices?.find((i) => i.id === numValue) ?? userRagIndices?.find((i) => i.id === numValue)
                  return selected ? selected.metadata.name : ''
                }}
              >
                <MenuItem value="" data-testid="no-source-materials">
                  <em>{t('prompt:noSourceMaterials')}</em>
                  <ClearOutlined sx={{ ml: 1 }} />
                </MenuItem>
                {!!ragIndices?.length && <ListSubheader>{t('course:sourceMaterials')}</ListSubheader>}
                {ragIndices?.map((index) => (
                  <MenuItem key={index.id} value={index.id} data-testid={`source-material-${index.metadata.name}`}>
                    {index.metadata.name}
                  </MenuItem>
                ))}
                {!!userRagIndices?.length && <ListSubheader>{t('course:userSourceMaterials')}</ListSubheader>}
                {userRagIndices?.map((index) => (
                  <MenuItem key={index.id} value={index.id} data-testid={`source-material-${index.metadata.name}`}>
                    {index.metadata.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextButton
              onClick={() => {
                const params = new URLSearchParams({ editPrompt: '1', promptTab: String(editingPromptTab) })
                if (editingPromptId) {
                  params.set('promptId', editingPromptId)
                }

                navigate(`/${courseId}/course/rag?${params.toString()}`)
              }}
              data-testid="edit-source-material-link"
              endIcon={<ArrowRightAltIcon color="primary" />}
              sx={{ alignSelf: 'flex-end' }}
            >
              <span data-testid="edit-source-material-button" style={{ color: theme.palette.primary.main }}>
                {t('rag:editSourceMaterial')}
              </span>
            </TextButton>
          </Box>
        )}
      </Box>

      <Collapse in={!!form.ragIndexId}>
        <Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="overline" fontWeight="bold" my={1}>
              {t('prompt:modelSourceMaterialInstructions')}
            </Typography>
            <Tooltip placement="right" title={t('prompt:promptHidden')} describeChild>
              <Box component="span" tabIndex={0} aria-label={t('prompt:promptHidden')}>
                <VisibilityOffOutlined fontSize="small" color="error" />
              </Box>
            </Tooltip>
          </Box>

          <RagMessageEditor
            selectedMessages={form.ragSystemMessages}
            onAddMessage={(text) =>
              setForm((prev) => {
                if (prev.ragSystemMessages.includes(text)) return prev

                return {
                  ...prev,
                  ragSystemMessages: [...prev.ragSystemMessages, text],
                }
              })
            }
            onRemoveMessage={(text) =>
              setForm((prev) => ({
                ...prev,
                ragSystemMessages: prev.ragSystemMessages.filter((message) => message !== text),
              }))
            }
          />
        </Box>
      </Collapse>
    </Box>
  )
}

export const PromptEditorForm = () => (
  <Box>
    <BasicInfoSection />
    <Divider sx={{ my: 3 }} />
    <ModelSettingsSection />
    <Divider sx={{ my: 3 }} />
    <RagSettingsSection />
    <Divider sx={{ my: 3 }} />
  </Box>
)
