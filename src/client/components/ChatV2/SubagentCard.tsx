import AccountTree from '@mui/icons-material/AccountTree'
import ErrorOutline from '@mui/icons-material/ErrorOutline'
import ExpandMore from '@mui/icons-material/ExpandMore'
import { Box, ButtonBase, CircularProgress, Collapse, Typography } from '@mui/material'
import { type ReactNode, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SubagentPart } from '../../../shared/agentChat'
import { focusIndicatorStyle } from '../../util/accessibility'

const STATUS_KEYS = {
  running: 'chat:subagentRunning',
  ok: 'chat:subagentDone',
  error: 'chat:subagentFailed',
} as const

/**
 * Work the main agent delegated to a subagent: its name, status and task, with the subagent's own output
 * (`children`, its parts rendered like an answer's) collapsed by default, also while it runs. The header is a
 * labelled button with `aria-expanded`, described by the task. The subagent's output is not part of the
 * message text (copy, email, download).
 */
export const SubagentCard = ({ part, children }: { part: SubagentPart; children: ReactNode }) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const contentId = useId()
  const taskId = useId()
  const params = { name: part.name, task: part.task, interpolation: { escapeValue: false } }

  return (
    <Box
      data-testid="subagent-card"
      data-subagent-name={part.name}
      data-subagent-status={part.status}
      sx={{ my: 1.5, border: '1px solid', borderColor: part.status === 'error' ? 'error.main' : 'divider', borderRadius: '0.75rem', padding: '0.5rem 0.75rem' }}
    >
      <ButtonBase
        aria-expanded={open}
        // The content is unmounted while closed, so it is only referenced when it exists.
        aria-controls={open ? contentId : undefined}
        aria-describedby={part.task ? taskId : undefined}
        onClick={() => setOpen((value) => !value)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          width: '100%',
          justifyContent: 'flex-start',
          textAlign: 'left',
          padding: '0.25rem 0.5rem',
          marginLeft: '-0.5rem',
          borderRadius: '0.5rem',
          font: 'inherit',
          color: part.status === 'error' ? 'error.main' : 'inherit',
          '&:hover': { backgroundColor: 'action.hover' },
          ...focusIndicatorStyle(),
        }}
      >
        <Box aria-hidden sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {part.status === 'running' ? (
            <CircularProgress size="1rem" color="inherit" />
          ) : part.status === 'error' ? (
            <ErrorOutline fontSize="small" />
          ) : (
            <AccountTree fontSize="small" />
          )}
        </Box>
        <Typography component="span" variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-word', flexGrow: 1 }}>
          {t(STATUS_KEYS[part.status], params)}
        </Typography>
        <ExpandMore aria-hidden fontSize="small" sx={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </ButtonBase>
      {part.task && (
        <Typography id={taskId} variant="body2" sx={{ color: 'text.secondary', mt: 0.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {t('chat:subagentTask', params)}
        </Typography>
      )}
      <Collapse in={open} unmountOnExit>
        <Box id={contentId} data-testid="subagent-content" sx={{ mt: 1, pl: 2, borderLeft: '2px solid', borderColor: 'divider' }}>
          {children}
        </Box>
      </Collapse>
    </Box>
  )
}
