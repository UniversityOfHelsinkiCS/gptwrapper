import { Box, IconButton, Paper, Stack, Typography, Tooltip, FormControlLabel, Switch } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
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
import { switchFocusIndicatorStyle } from 'src/client/util/accessibility'
import { StatusAnnouncer } from '../common/accessibility/StatusAnnouncer'

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

  const isCustomEditorOpen = showCustomEditor && (!existingCustom || showMessages)

  const customButtonRef = useRef<HTMLButtonElement>(null)
  const shouldFocusCustomButtonRef = useRef(false)
  const shouldFocusEditInputRef = useRef(false)
  const wasCustomEditorOpenRef = useRef(false)
  const closeAnnouncementRef = useRef<string | null>(null)
  const [editorStatusMessage, setEditorStatusMessage] = useState('')

  useEffect(() => {
    if (isCustomEditorOpen === wasCustomEditorOpenRef.current) return
    wasCustomEditorOpenRef.current = isCustomEditorOpen
    const closeAnnouncement = closeAnnouncementRef.current
    closeAnnouncementRef.current = null
    if (!isCustomEditorOpen && closeAnnouncement) {
      setEditorStatusMessage(closeAnnouncement)
      return
    }
    setEditorStatusMessage(t(isCustomEditorOpen ? 'accessibility:textFieldOpened' : 'accessibility:textFieldClosed', { name: t('prompt:addCustomRagMessage') }))
  }, [isCustomEditorOpen])

  useEffect(() => {
    if (showCustomEditor || !shouldFocusCustomButtonRef.current) return
    shouldFocusCustomButtonRef.current = false
    customButtonRef.current?.focus()
  }, [showCustomEditor])

  useEffect(() => {
    if (!showCustomEditor || !shouldFocusEditInputRef.current) return
    shouldFocusEditInputRef.current = false
    const input = document.getElementById('edit-custom-rag-input')
    if (!(input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement)) return
    input.focus()
    // The caret goes after the existing text, so that the user continues from where it ends
    const end = input.value.length
    input.setSelectionRange(end, end)
    input.scrollTop = input.scrollHeight
  }, [showCustomEditor])

  // A save is announced in place of the text field closing, as two messages at once would cut each other off
  const closeCustomEditor = ({ saved = false } = {}) => {
    shouldFocusCustomButtonRef.current = true
    closeAnnouncementRef.current = saved ? t('common:saved') : null
    setShowCustomEditor(false)
  }

  return (
    <Box sx={{ mb: 2, ml: 0.6 }}>
      <StatusAnnouncer message={editorStatusMessage} />
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', width: '100%' }}>
        {options.map((option) => {
          const isSelected = selectedMessages.includes(option.message)

          return (
            <GrayButton
              key={option.label}
              sx={
                isSelected
                  ? {
                      border: '2px solid',
                      borderColor: theme.palette.success.main,
                      backgroundColor: alpha(theme.palette.success.main, 0.1),
                    }
                  : {
                      border: '1px solid',
                      borderColor: theme.palette.divider,
                    }
              }
              size="small"
              endIcon={isSelected ? <Done /> : <AddIcon />}
              aria-label={t(isSelected ? 'accessibility:deselectOption' : 'accessibility:selectOption', { name: option.label })}
              onClick={() => {
                if (isSelected) {
                  onRemoveMessage(option.message)
                } else {
                  onAddMessage(option.message)
                }
              }}
            >
              {option.label}
            </GrayButton>
          )
        })}

        <GrayButton
          id="add-custom-rag-message-button"
          key="custom"
          ref={customButtonRef}
          sx={
            existingCustom
              ? {
                  border: '2px solid',
                  borderColor: theme.palette.success.main,
                  backgroundColor: alpha(theme.palette.success.main, 0.1),
                  cursor: 'default',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.success.main, 0.1),
                  },
                }
              : {
                  border: '1px solid',
                  borderColor: theme.palette.divider,
                }
          }
          size="small"
          endIcon={existingCustom ? <Done /> : <AddIcon />}
          aria-label={t(existingCustom ? 'accessibility:optionSelected' : 'prompt:addCustomRagMessage', { name: t('prompt:customRagMessage') })}
          aria-disabled={existingCustom !== undefined}
          disableRipple
          onClick={!existingCustom ? () => setShowCustomEditor((s) => !s) : undefined}
        >
          {t('prompt:customRagMessage')}
        </GrayButton>

        <FormControlLabel
          sx={{ ml: 'auto' }}
          control={
            <Switch
              checked={showMessages}
              onChange={() => setShowMessages(!showMessages)}
              sx={{ justifyContent: 'space-between', ml: 0, mr: 0, ...switchFocusIndicatorStyle }}
            />
          }
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
                    <Typography id="custom-rag-message-header" variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.primary', ...monospaceStyle }}>
                      {t('prompt:customRagMessage')}
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.primary', ...monospaceStyle }}>
                      {message}
                    </Typography>
                  </Box>
                  <Tooltip arrow placement="bottom" title={t('common:edit')}>
                    <IconButton
                      aria-label={t('common:edit')}
                      aria-describedby="custom-rag-message-header"
                      size="small"
                      onClick={() => {
                        setForm((prev) => (prev.customMessage ? prev : { ...prev, customMessage: message }))
                        shouldFocusEditInputRef.current = true
                        setShowCustomEditor(true)
                      }}
                      color="primary"
                      data-testid="edit-custom-rag"
                    >
                      <EditOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip arrow placement="bottom" title={t('common:close')}>
                    <IconButton
                      aria-label={t('common:delete')}
                      aria-describedby="custom-rag-message-header"
                      size="small"
                      onClick={() => {
                        onRemoveMessage(message)
                        setForm((prev) => ({ ...prev, customMessage: '' }))
                        const target = document.getElementById('add-custom-rag-message-button')
                        if (target) target.focus()
                        setEditorStatusMessage(t('accessibility:itemDeleted', { name: t('prompt:customRagMessage') }))
                      }}
                    >
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
                  closeCustomEditor()
                  setForm((prev) => ({ ...prev, customMessage: existingCustom ?? '' }))
                }}
                onSave={() => {
                  const trimmed = form.customMessage.trim()
                  if (trimmed.length === 0) {
                    if (existingCustom) onRemoveMessage(existingCustom)
                    closeCustomEditor()
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

                  closeCustomEditor({ saved: true })
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
              closeCustomEditor()
              setForm((prev) => ({ ...prev, customMessage: '' }))
            }}
            onSave={() => {
              const trimmed = form.customMessage.trim()
              if (trimmed.length === 0) {
                if (existingCustom) onRemoveMessage(existingCustom)
                closeCustomEditor()
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

              closeCustomEditor({ saved: true })
            }}
            testId="add-custom-rag-input"
          />
        </Box>
      )}
    </Box>
  )
}

export default RagMessageEditor
