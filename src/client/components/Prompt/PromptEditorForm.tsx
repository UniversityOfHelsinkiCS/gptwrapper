import { Box, Switch, Collapse, Divider, FormControl, FormControlLabel, MenuItem, Select, TextField, Tooltip, Typography } from '@mui/material'
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

const BasicInfoSection = () => {
  const { form, setForm, type } = usePromptEditorForm()
  const { t } = useTranslation()

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <EditNoteIcon color="secondary" />
        <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
          {t('prompt:promptBasicInfo')}
        </Typography>
      </Box>
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
          sx={{ '& textarea': monospaceStyle, ...!isMobile && { maxHeight: '300px', overflow: 'auto' } }}
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
  const { form, setForm, type, ragIndices } = usePromptEditorForm()
  const { t } = useTranslation()

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
          <Box display="flex" justifyContent="space-around" alignItems="center">
            <FormControl fullWidth>
              <Select
                data-testid="rag-select"
                value={form.ragIndexId ?? ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    ragIndexId: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
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
                  <em>{t('prompt:noSourceMaterials')}</em>
                  <ClearOutlined sx={{ ml: 1 }} />
                </MenuItem>
                {ragIndices?.map((index) => (
                  <MenuItem key={index.id} value={index.id} data-testid={`source-material-${index.metadata.name}`}>
                    {index.metadata.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
