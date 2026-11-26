import React, { useEffect, useImperativeHandle, useState } from 'react'
import { focusVisibleOutline } from '../../theme'
import Send from '@mui/icons-material/Send'
import StopIcon from '@mui/icons-material/Stop'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import { Box, Chip, IconButton, TextField, Tooltip, Typography, Alert } from '@mui/material'
import { visuallyHidden } from '@mui/utils'
import { useRef } from 'react'
import useUserStatus from '../../hooks/useUserStatus'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BlueButton, GrayButton } from './general/Buttons'
import { useIsEmbedded } from '../../contexts/EmbeddedContext'
import useCurrentUser from '../../hooks/useCurrentUser'
import { SendPreferenceConfiguratorModal, ShiftEnterForNewline, ShiftEnterToSend } from '../Settings/SendPreferenceConfigurator'
import { useKeyboardCommands } from './useKeyboardCommands'
import { WarningType } from '@shared/aiApi'
import ModelSelector from './ModelSelector'
import UsageSelector from './UsageSelector'
import { ValidModelName } from '../../../config'
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat'
import { StatusAnnouncer } from '../common/accessibility/StatusAnnouncer'
import FormatQuoteIcon from '@mui/icons-material/FormatQuote'
import { type QuickAction, quoteFileName, type Quote } from '@shared/quote'
import { announceToScreenReader } from '../common/accessibility/SnackbarAnnouncer'
import type { AddQuoteOptions, PendingQuote } from '../FileViewer/selectionQuote'

const skipLinkSx = {
  ...visuallyHidden,
  zIndex: 1300,
  '&:focus-visible': {
    position: 'fixed',
    top: '1rem',
    right: '1rem',
    width: 'auto',
    height: 'auto',
    bgcolor: 'primary.main',
    borderRadius: '0.5rem',
    p: 1,
    color: 'primary.contrastText',
    margin: 0,
    overflow: 'visible',
    clip: 'auto',
    clipPath: 'none',
    whiteSpace: 'normal',
    transform: 'translateY(-100%)',
    transition: 'transform 0.3s ease-out',
    '&:focus': {
      transform: 'translateY(0)',
      ...focusVisibleOutline,
    },
  },
}

/** What the chat box asks for while an option is picked in the open quiz: sending then answers the quiz with the text as the explanation. */
export type QuizPrompt = 'reasoning' | 'unclear'

export type ChatBoxActions = {
  /** Sends the text in the chat box as if Send was pressed, without moving focus to the chat box. */
  submit: () => void
  /**
   * Shows a quote from the file viewer as a chip above the input (replacing an earlier one), moves focus to the input
   * and announces it. The next message is sent with it ("Ask…").
   * With `{ message, send: true }` (a quick action) the quote is sent right away with `message` instead, unless a
   * response is streaming or the budget is used up. The typed draft and a pending chip stay as they are.
   */
  addQuote: (pending: PendingQuote, options?: AddQuoteOptions) => void
  /** Removes the pending quote without announcing it (a new conversation). */
  clearQuote: () => void
}

export const ChatBox = ({
  disabled,
  isTokenLimitExceeded,
  budgetResetsAt = null,
  fileInputRef,
  fileName,
  messageWarning,
  setFileName,
  handleCancel,
  handleContinue,
  handleSubmit,
  handleReset,
  handleStop,
  isMobile,
  currentModel,
  setModel,
  isNewResponseAvailable,
  onGoToLatestResponse,
  quizPrompt,
  actionsRef,
  folderControls,
}: {
  disabled: boolean
  isTokenLimitExceeded: boolean
  /** Set (ISO time of the next reset) when the weekly budget is used up under cost enforcement: sending is blocked. */
  budgetResetsAt?: string | null
  fileInputRef: React.RefObject<HTMLInputElement | null>
  fileName: string
  messageWarning: { [key in WarningType]?: { message: string; ignored: boolean; tokenCount?: number; contextLimit?: number; tokenUsagePercentage?: number } }
  setFileName: (name: string) => void
  handleCancel: (reason: 'canceled' | 'error') => void
  handleContinue: (message: string, ignoredWarnings: WarningType[]) => void
  /**
   * `quotes` is the pending quote from the file viewer, if any. It stays pending while a quiz is being answered.
   * `quickAction` is the quick action that sent the quote with `message`.
   */
  handleSubmit: (message: string, quotes?: Quote[], quickAction?: QuickAction) => void
  handleReset: () => void
  handleStop: () => void
  isMobile: boolean
  currentModel: ValidModelName
  setModel: (model: ValidModelName) => void
  isNewResponseAvailable: boolean
  onGoToLatestResponse: () => void
  /** Set while an option is picked in the open quiz. The message may then be empty. */
  quizPrompt?: QuizPrompt | null
  actionsRef?: React.Ref<ChatBoxActions>
  /** Shown next to the attach-file button: attaching My files folders (admins only). */
  folderControls?: React.ReactNode
}) => {
  const { courseId } = useParams()
  const isEmbedded = useIsEmbedded()
  const { user } = useCurrentUser()
  const { userStatus, refetch: refetchStatus } = useUserStatus(courseId)

  const [disallowedFileType, setDisallowedFileType] = useState<string>('')
  const [fileTypeAlertOpen, setFileTypeAlertOpen] = useState<boolean>(false)
  const [fileAnnouncement, setFileAnnouncement] = useState<string>('')
  const [sendPreferenceConfiguratorOpen, setSendPreferenceConfiguratorOpen] = useState<boolean>(false)
  const sendButtonRef = useRef<HTMLButtonElement>(null)
  const textFieldRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string>('')
  // A quote from the file viewer ("Ask…"), sent with the next message. Not persisted, like the draft.
  const [pendingQuote, setPendingQuote] = useState<PendingQuote | null>(null)

  const attachmentChipRef = useRef<HTMLDivElement>(null)
  const focusAttachment = useRef(false)

  useEffect(() => {
    if (fileName && focusAttachment.current) {
      focusAttachment.current = false
      attachmentChipRef.current?.focus()
    }
  }, [fileName])

  // A quiz answer can be sent without an explanation
  const acuallyDisabled = disabled || !!budgetResetsAt || (message.length === 0 && !quizPrompt)

  const { t, i18n } = useTranslation()

  useKeyboardCommands({
    resetChat: handleReset,
    openModelSelector: () => {
      // setIsModelSelectorOpen(true) // @todo what key combination to open model selector
    },
  })

  const isShiftEnterSend = user?.preferences?.sendShortcutMode === 'shift+enter' || !user?.preferences?.sendShortcutMode

  const handleDeleteFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setFileName('')
    setFileAnnouncement(t('accessibility:fileRemoved'))
    const target = document.getElementById('chat-input')
    if (target) target.focus()
  }

  const handleFileTypeValidation = (file: File): void => {
    const allowedImageTypes = ['image/jpeg', 'image/png']
    if (!file.type.startsWith('text/') && file.type !== 'application/pdf' && !allowedImageTypes.find((s) => s === file.type)) {
      setDisallowedFileType(file.type)
      setFileTypeAlertOpen(true)
      setTimeout(() => {
        setFileTypeAlertOpen(false)
      }, 6000)
      return
    }

    if (allowedImageTypes.find((s) => s === file.type) && !user?.isAdmin) {
      setDisallowedFileType(file.type)
      setFileTypeAlertOpen(true)
      setTimeout(() => {
        setFileTypeAlertOpen(false)
      }, 6000)
      return
    }

    if (file.name === fileName) attachmentChipRef.current?.focus()
    else focusAttachment.current = true
    setFileName(file.name)
    setFileAnnouncement(t('accessibility:fileAttached', { file: file.name }))
  }

  const send = ({ focusInput }: { focusInput: boolean }) => {
    if (acuallyDisabled) return

    // A quiz answer is not sent with the quote; it waits for the next message.
    const quotes = pendingQuote && !quizPrompt ? [pendingQuote.quote] : undefined
    if (quotes) {
      handleSubmit(message, quotes)
      setPendingQuote(null)
    } else {
      handleSubmit(message)
    }
    refetchStatus()
    setMessage('')

    if (user && user.preferences?.sendShortcutMode === undefined) {
      setSendPreferenceConfiguratorOpen(true)
    }

    if (focusInput && textFieldRef.current) {
      textFieldRef.current.focus()
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    send({ focusInput: true })
  }

  const addQuote = (pending: PendingQuote, { message: quickMessage, send: sendNow, action }: AddQuoteOptions = {}) => {
    if (sendNow) {
      if (disabled || budgetResetsAt || !quickMessage) return
      handleSubmit(quickMessage, [pending.quote], action)
      refetchStatus()
      return
    }
    setPendingQuote(pending)
    textFieldRef.current?.focus()
    announceToScreenReader(t('fileViewer:quoteAdded'))
  }

  const removeQuote = () => {
    setPendingQuote(null)
    textFieldRef.current?.focus()
    announceToScreenReader(t('fileViewer:quoteRemoved'))
  }

  useImperativeHandle(actionsRef, () => ({ submit: () => send({ focusInput: false }), addQuote, clearQuote: () => setPendingQuote(null) }))

  const quizPromptText = quizPrompt === 'unclear' ? t('chat:quizUnclearPrompt') : quizPrompt === 'reasoning' ? t('chat:quizReasoningPrompt') : undefined

  const activeMessageWarnings = Object.values(messageWarning).filter((warning) => !warning.ignored)

  return (
    <Box sx={{ mb: 1 }}>
      <Box sx={{ mb: 0.75, px: 0.5, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
        <ModelSelector currentModel={currentModel} setModel={setModel} isTokenLimitExceeded={isTokenLimitExceeded} isMobile={isMobile} />
        <UsageSelector userStatus={userStatus} />
      </Box>
      <Box
        sx={{
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '1.25rem',
          padding: isMobile ? '0.2rem 0.2rem' : '0.5rem 1rem',
          backdropFilter: 'blur(5px)',
          boxShadow: 3,
        }}
      >
        {budgetResetsAt && (
          <Alert severity="warning" sx={{ my: '0.2rem' }} data-testid="budget-used-up">
            {t('chat:budgetUsedUp', {
              resetsAt: new Date(budgetResetsAt).toLocaleString(i18n.language, { dateStyle: 'full', timeStyle: 'short' }),
            })}
          </Alert>
        )}
        {fileTypeAlertOpen && (
          <Alert severity="warning">
            <Typography>{t('chat:fileTypeNotSupported', { type: disallowedFileType })}</Typography>
            <Typography>{t('chat:supportedFileFormats')}</Typography>
          </Alert>
        )}
        {activeMessageWarnings.length > 0 && (
          <Alert
            severity="warning"
            sx={{ my: '0.2rem' }}
            action={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <GrayButton autoFocus={activeMessageWarnings.length > 0} onClick={() => handleCancel('canceled')} type="button">
                  {t('common:cancel')}
                </GrayButton>
                <BlueButton onClick={() => handleContinue('', Object.keys(messageWarning) as WarningType[])} color="primary" type="button">
                  {t('common:continue')}
                </BlueButton>
              </Box>
            }
          >
            {Object.entries(messageWarning)
              .filter(([, warning]) => !warning.ignored)
              .map(([type, warning]) => (
                <Box key={type} sx={{ mb: 0.5, flexDirection: 'row', display: 'flex', gap: 1 }}>
                  {type === 'usage' && 'tokenUsagePercentage' in warning ? (
                    <Typography variant="body2" color="textSecondary">
                      {t('chat:usageWarning', { tokenUsagePercentage: warning.tokenUsagePercentage })}
                    </Typography>
                  ) : type === 'contextLimit' && 'tokenCount' in warning && 'contextLimit' in warning ? (
                    <Typography variant="body2" color="textSecondary">
                      {t('chat:contextLimitWarning', { tokenCount: warning.tokenCount, contextLimit: warning.contextLimit })}
                    </Typography>
                  ) : (
                    <>
                      {type === 'fileParsingError' && (
                        <Typography variant="body2" color="textSecondary">
                          {t('error:fileParsingError')}:
                        </Typography>
                      )}
                      <Typography variant="body2" color="textSecondary">
                        {warning.message}
                      </Typography>
                    </>
                  )}
                </Box>
              ))}
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={onSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target === textFieldRef.current) {
              if (!isShiftEnterSend) {
                if (e.shiftKey) {
                  // Do nothing with this event, it will result in a newline being inserted
                } else {
                  onSubmit(e)
                }
              } else if (e.shiftKey) {
                onSubmit(e)
              }
            }
          }}
        >
          <Box>
            <StatusAnnouncer message={fileAnnouncement} />
            <Box id="chat-input-instructions" sx={visuallyHidden}>
              {isShiftEnterSend ? t('accessibility:sendInstructionsShiftEnter') : t('accessibility:sendInstructionsEnter')}
            </Box>
            {quizPrompt && (
              <Box id="chat-input-quiz-send" sx={visuallyHidden}>
                {t('chat:quizSendDescription')}
              </Box>
            )}
            {pendingQuote && <QuoteChip pending={pendingQuote} onRemove={removeQuote} />}
            <TextField
              autoFocus={!isEmbedded}
              id="chat-input"
              inputRef={textFieldRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={quizPromptText ?? t('chat:writeHere')}
              fullWidth
              multiline
              data-sentry-mask
              maxRows={25}
              sx={{ padding: '0.5rem' }}
              variant="standard"
              slotProps={{
                htmlInput: {
                  'data-testid': 'chat-input',
                  'aria-label': t('chat:messageLabel'),
                  'aria-describedby': quizPrompt ? 'chat-input-quiz-send chat-input-instructions' : 'chat-input-instructions',
                },
                input: {
                  disableUnderline: true,
                },
              }}
            />
            {isNewResponseAvailable && acuallyDisabled && (
              <Tooltip title={t('accessibility:goToLatestResponse')} arrow placement="right">
                <IconButton component="button" type="button" onClick={onGoToLatestResponse} sx={skipLinkSx}>
                  <TrendingFlatIcon />
                </IconButton>
              </Tooltip>
            )}

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mt: '0.5rem',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Tooltip title={t('chat:attachFile')} arrow placement="top">
                  <IconButton id="attach-file-button" onClick={() => fileInputRef.current?.click()}>
                    <AttachFileIcon />
                  </IconButton>
                </Tooltip>
                <input
                  type="file"
                  accept="*"
                  hidden
                  aria-label={t('chat:attachFile')}
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && handleFileTypeValidation(e.target.files[0])}
                />

                {fileName && (
                  <Chip
                    ref={attachmentChipRef}
                    sx={{ borderRadius: 100 }}
                    label={fileName}
                    onDelete={handleDeleteFile}
                    aria-label={[t('accessibility:attachment', { file: fileName }), t('accessibility:removeAttachment')].join(', ')}
                  />
                )}
                {folderControls}
              </Box>
              {!isMobile && (
                <Typography
                  sx={{
                    display: !acuallyDisabled ? { sm: 'none', md: 'block' } : 'none',
                    ml: 'auto',
                    mr: 1,
                    transition: 'opacity 0.2s ease-in-out',
                    fontSize: '14px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  color="textSecondary"
                  aria-hidden
                >
                  {isShiftEnterSend ? <ShiftEnterToSend t={t} /> : <ShiftEnterForNewline t={t} />}
                </Typography>
              )}

              <Tooltip title={disabled ? t('chat:cancelResponse') : isShiftEnterSend ? t('chat:shiftEnterSend') : t('chat:enterSend')} arrow placement="top">
                {disabled ? (
                  <IconButton onClick={handleStop}>
                    <StopIcon />
                  </IconButton>
                ) : (
                  <span>
                    <IconButton
                      type="submit"
                      aria-label={t('common:send')}
                      aria-describedby={quizPrompt ? 'chat-input-quiz-send' : undefined}
                      ref={sendButtonRef}
                      data-testid="send-chat-message"
                      disabled={acuallyDisabled}
                      sx={{
                        backgroundColor: acuallyDisabled ? 'action.disabledBackground' : 'primary.main',
                        color: acuallyDisabled ? 'action.disabled' : 'primary.contrastText',
                        borderRadius: '0.5rem',
                        width: 36,
                        height: 36,
                        transition: 'background-color 0.18s, transform 0.1s, filter 0.1s',
                        '&:hover': {
                          backgroundColor: acuallyDisabled ? 'action.disabledBackground' : 'primary.main',
                          transform: acuallyDisabled ? 'none' : 'scale(1.06)',
                        },
                        '&.Mui-disabled': {
                          color: 'action.disabled',
                        },
                      }}
                    >
                      <Send sx={{ fontSize: 18 }} />
                    </IconButton>
                  </span>
                )}
              </Tooltip>
              <SendPreferenceConfiguratorModal
                open={sendPreferenceConfiguratorOpen}
                onClose={() => setSendPreferenceConfiguratorOpen(false)}
                anchorEl={sendButtonRef.current}
                context="chat"
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

/** The quote waiting to be sent: its file (and PDF page or heading) and the start of its text. */
const QuoteChip = ({ pending, onRemove }: { pending: PendingQuote; onRemove?: () => void }) => {
  const { t } = useTranslation()
  const { quote, truncated } = pending
  const params = { name: quoteFileName(quote), interpolation: { escapeValue: false } }
  const source = [t('fileViewer:quoteChip', params), quote.page ? t('fileViewer:pageShort', { page: quote.page }) : undefined, quote.heading]
    .filter(Boolean)
    .join(' · ')
  return (
    <Chip
      data-testid="quote-chip"
      data-path={quote.path}
      icon={<FormatQuoteIcon />}
      onDelete={onRemove}
      aria-label={[source, truncated ? t('fileViewer:truncated') : '', t('fileViewer:removeQuote')].filter(Boolean).join(', ')}
      label={
        <>
          <Box component="span" sx={{ fontWeight: 600 }}>
            {source}
          </Box>
          {truncated && ` (${t('fileViewer:truncated')})`}
          {': '}
          <Box component="span" sx={{ fontStyle: 'italic' }}>
            {quote.text}
          </Box>
        </>
      }
      sx={{ mx: '0.5rem', mt: '0.5rem', maxWidth: 'calc(100% - 1rem)', borderRadius: 100 }}
    />
  )
}
