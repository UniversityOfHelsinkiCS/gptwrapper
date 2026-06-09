import { Box, IconButton, Paper, Stack, Typography, Tooltip, FormControlLabel, Switch } from '@mui/material'
import { useState } from 'react'
import { GrayButton } from '../ChatV2/general/Buttons'
import AddIcon from '@mui/icons-material/Add'
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined'
import { t } from 'i18next'
import { alpha } from '@mui/material/styles'
import { useTheme } from '@mui/material'
import { monospaceStyle } from '../../theme'
import { Done, EditOutlined } from '@mui/icons-material'
import OpenableTextfield from '../common/OpenableTextfield'
import { usePromptEditorForm } from './context'

type RagMessageEditorProps = {
  selectedMessages: string[]
  onAddMessage: (text: string) => void
  onRemoveMessage: (text: string) => void
}

const RagMessageEditor = ({ selectedMessages, onAddMessage, onRemoveMessage }: RagMessageEditorProps) => {
  const theme = useTheme()
  const [showCustomEditor, setShowCustomEditor] = useState(false)
  const { form, setForm } = usePromptEditorForm()
  const [showMessages, setShowMessages] = useState(false)

  const options = [
    { label: t('prompt:defaultRagLabel'), message: t('prompt:defaultRagMessage') },
    { label: t('prompt:enforceRagLabel'), message: t('prompt:enforceRagMessage') },
    { label: t('prompt:unknownRagLabel'), message: t('prompt:unknownRagMessage') },
  ]

  const existingCustom = selectedMessages.find((message) => !options.some((option) => option.message === message))
  const sortedSelectedMessages = [...selectedMessages].sort((a, b) => {
    const indexA = options.findIndex((option) => option.message === a)
    const indexB = options.findIndex((option) => option.message === b)

    if (indexA === -1 && indexB === -1) return 0
    if (indexA === -1) return 1
    if (indexB === -1) return -1

    return indexA - indexB
  })

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', width: '100%' }}>
        {options.map((option) => (
          <GrayButton
            key={option.label}
            sx={selectedMessages.includes(option.message) ? {
              border: '2px solid',
              borderColor: theme.palette.success.main,
              backgroundColor: alpha(theme.palette.success.main, 0.1),
            } : {
              border: '1px solid',
              borderColor: theme.palette.divider,
            }}
            size="small"
            endIcon={selectedMessages.includes(option.message) ? <Done /> : <AddIcon />}
            onClick={selectedMessages.includes(option.message) ? () => onRemoveMessage(option.message) : () => onAddMessage(option.message)}
          >
            {option.label}
          </GrayButton>
        ))}

        <GrayButton
          key="custom"
          sx={existingCustom ? {
            border: '2px solid',
            borderColor: theme.palette.success.main,
            backgroundColor: alpha(theme.palette.success.main, 0.1),
            '&.Mui-disabled': {
              border: '2px solid',
              borderColor: theme.palette.success.main,
              backgroundColor: alpha(theme.palette.success.main, 0.1),
              color: 'inherit',
              opacity: 1,
            },
          } : {
            border: '1px solid',
            borderColor: theme.palette.divider,
          }}
          size="small"
          endIcon={existingCustom ? <Done /> : <AddIcon />}
          disabled={!(existingCustom === undefined) }
          onClick={!existingCustom ? () => setShowCustomEditor((s) => !s) : undefined}
        >
          {t('prompt:customRagMessage')}
        </GrayButton>

        <FormControlLabel
          sx={{ ml: 'auto' }}
          control={<Switch checked={showMessages} onChange={() => setShowMessages(!showMessages)} />}
          label={
            <Box display="flex" alignItems="center" gap={1}>
              {t('prompt:showRagMessages')}
            </Box>
          }
        />

      </Box>
      {showMessages && selectedMessages.length > 0 && (
        <Stack spacing={1} sx={{ mt: 2 }}>
          {sortedSelectedMessages.map((message) => {
            const option = options.find((option) => option.message === message)

            if (option) {
              return (
                <Paper
                  key={message}
                  variant="outlined"
                  sx={{
                    p: 3,
                    mt: 1.5,
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1,
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0, gap: 1, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.primary', ...monospaceStyle }}>
                      {option.label}
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.primary', ...monospaceStyle }}>
                      {message}
                    </Typography>
                  </Box>
                </Paper>
              )
            }

            if (!showCustomEditor) {
              return (
                <Paper
                  key={message}
                  variant="outlined"
                  sx={{
                    p: 3,
                    mt: 1.5,
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1,
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0, gap: 1, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.primary', ...monospaceStyle }}>
                      {t('prompt:customRagMessage')}
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.primary', ...monospaceStyle }}>
                      {message}
                    </Typography>
                  </Box>
                  <Tooltip arrow placement="bottom" title={t('prompt:editPromptTooltip')}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setForm((prev) => (prev.customMessage ? prev : { ...prev, customMessage: message }))
                        setShowCustomEditor(true)
                      }}
                      color="primary"
                      data-testid="edit-custom-rag"
                    >
                      <EditOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip arrow placement="bottom" title={t('prompt:deletePromptTooltip')}>
                    <IconButton 
                      aria-label={t('common:delete')} 
                      size="small" 
                      onClick={() => {
                        onRemoveMessage(message)
                        setForm((prev) => ({ ...prev, customMessage: '' }))
                      }}>
                      <ClearOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Paper>
              )
            }

            return (
              <OpenableTextfield
                key={message}
                value={form.customMessage}
                onChange={(value) => setForm((prev) => ({ ...prev, customMessage: value }))}
                placeholder={t('prompt:addCustomRagMessage')}
                onCancel={() => {
                  setShowCustomEditor(false)
                  setForm((prev) => ({ ...prev, customMessage: existingCustom ?? '' }))
                }}
                onSave={() => {
                  const trimmed = form.customMessage.trim()
                  if (trimmed.length === 0) {
                    if (existingCustom) onRemoveMessage(existingCustom)
                    setShowCustomEditor(false)
                    return
                  }

                  if (existingCustom) {
                    if (trimmed !== existingCustom) {
                      onRemoveMessage(existingCustom)
                      if (!selectedMessages.includes(trimmed)) onAddMessage(trimmed)
                    }
                  } else {
                    if (!selectedMessages.includes(trimmed)) onAddMessage(trimmed)
                  }

                  setShowCustomEditor(false)
                }}
                testId="edit-custom-rag-input"
              />
            )
          })}
        </Stack>
      )}
      {selectedMessages.length === 0 && !(!existingCustom && showCustomEditor) && showMessages && (
        <Paper
                  key="no-rag-message"
                  variant="outlined"
                  sx={{
                    p: 2,
                    mt: 4,
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1,
                  }}
                >
        
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.primary', ...monospaceStyle }}>
            {t('prompt:noRagMessagesToShow')}
          </Typography>
        </Paper>

      )}

      {!existingCustom && showCustomEditor && (
        <Box sx={{ mt: 2 }}>
          <OpenableTextfield
            value={form.customMessage}
            onChange={(value) => setForm((prev) => ({ ...prev, customMessage: value }))}
            placeholder={t('prompt:addCustomRagMessage')}
            onCancel={() => {
              setShowCustomEditor(false)
              setForm((prev) => ({ ...prev, customMessage: '' }))
            }}
            onSave={() => {
              const trimmed = form.customMessage.trim()
              if (trimmed.length === 0) {
                if (existingCustom) onRemoveMessage(existingCustom)
                setShowCustomEditor(false)
                setForm((prev) => ({ ...prev, customMessage: '' }))
                return
              }

              if (existingCustom) {
                if (trimmed !== existingCustom) {
                  onRemoveMessage(existingCustom)
                  if (!selectedMessages.includes(trimmed)) onAddMessage(trimmed)
                }
              } else {
                if (!selectedMessages.includes(trimmed)) onAddMessage(trimmed)
              }

              setShowCustomEditor(false)
            }}
            testId="add-custom-rag-input"
          />
        </Box>
      )}
    </Box>
  )
}

export default RagMessageEditor