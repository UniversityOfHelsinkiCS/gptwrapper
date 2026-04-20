import { Box, Checkbox, Collapse, Divider, FormControl, FormControlLabel, MenuItem, Select, TextField, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { LinkButtonHoc } from '../ChatV2/general/Buttons'
import OpenableTextfield from '../common/OpenableTextfield'
import { ClearOutlined, LibraryBooksOutlined, ExpandMore, VisibilityOutlined, VisibilityOffOutlined } from '@mui/icons-material'
import PsychologyIcon from '@mui/icons-material/Psychology'
import EditNoteIcon from '@mui/icons-material/EditNote'
import BookmarksIcon from '@mui/icons-material/Bookmarks'
import { usePromptEditorForm } from './context'
import { monospaceStyle } from '../../theme'

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
          placeholder={t('prompt:defaultChatInstructions')}
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
  const { form, setForm, type, modelHasTemperature } = usePromptEditorForm()
  const { t } = useTranslation()

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
            control={<Checkbox checked={form.hidden} onChange={(e) => setForm((prev) => ({ ...prev, hidden: e.target.checked }))} />}
            label={
              <Box display="flex" alignItems="center" gap={1}>
                {t('prompt:hideSystemInstructions')}
                {form.hidden ? <VisibilityOffOutlined fontSize="small" color="error" /> : <VisibilityOutlined fontSize="small" color="success" />}
              </Box>
            }
          />
        )}
      </Box>

      <Box>
        <TextField
          variant="filled"
          sx={{ '& textarea': monospaceStyle }}
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
  const { form, setForm, type, ragIndices, courseId } = usePromptEditorForm()
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
                <Divider />
                <LinkButtonHoc button={MenuItem} to={`/${courseId}/course/rag`}>
                  {t('prompt:courseSourceMaterials')}
                  <LibraryBooksOutlined sx={{ ml: 1 }} />
                </LinkButtonHoc>
              </Select>
            </FormControl>
          </Box>
        )}
      </Box>

      <Collapse in={!!form.ragIndexId}>
        <Box>
          <Typography variant="overline" fontWeight="bold" my={1}>
            {t('prompt:modelSourceMaterialInstructions')}
          </Typography>

          <OpenableTextfield
            variant="filled"
            sx={{ '& textarea': monospaceStyle }}
            value={form.ragSystemMessage}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                ragSystemMessage: e.target.value,
              }))
            }
            onAppend={(text) =>
              setForm((prev) => ({
                ...prev,
                ragSystemMessage: prev.ragSystemMessage + (prev.ragSystemMessage.trim().length ? ' ' : '') + text,
              }))
            }
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
    </Box>
  )
}

export const PromptEditorForm2 = () => (
  <Box>
    <BasicInfoSection />
    <Divider sx={{ my: 3 }} />
    <ModelSettingsSection />
    <Divider sx={{ my: 3 }} />
    <RagSettingsSection />
  </Box>
)
