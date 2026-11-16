import Checklist from '@mui/icons-material/Checklist'
import ErrorOutline from '@mui/icons-material/ErrorOutline'
import ExpandMore from '@mui/icons-material/ExpandMore'
import { Box, ButtonBase, CircularProgress, Collapse, Typography } from '@mui/material'
import { type ReactNode, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AssistantPart } from '../../../shared/agentChat'
import { focusIndicatorStyle } from '../../util/accessibility'
import { isPartFailed, isPartRunning } from './groupParts'

/**
 * A run of activity parts (tool calls, subagents, reasoning) folded into one collapsible row so they do not
 * clutter the answer. Closed, it shows a summary ("5 steps") and, while the run is in progress, its latest part
 * so the user sees what is happening. Opened, it shows every part as it would show on its own.
 * `renderPart` renders one part; `index` is the position of the first part in the message, for keys.
 */
export const ActivityGroup = ({
  parts,
  index,
  renderPart,
}: {
  parts: AssistantPart[]
  index: number
  renderPart: (part: AssistantPart, index: number) => ReactNode
}) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const contentId = useId()
  const isRunning = parts.some(isPartRunning)
  const failed = parts.filter(isPartFailed).length
  const status = isRunning ? 'running' : failed > 0 ? 'error' : 'ok'
  const count = parts.length
  const summary =
    status === 'running'
      ? t('chat:activityRunning', { count })
      : status === 'error'
        ? t('chat:activityFailed', { count, failed })
        : t('chat:activityDone', { count })
  const lastIndex = index + count - 1

  return (
    <Box data-testid="activity-group" data-activity-status={status} sx={{ my: 1.5 }}>
      <ButtonBase
        aria-expanded={open}
        // The content is unmounted while closed, so it is only referenced when it exists.
        aria-controls={open ? contentId : undefined}
        onClick={() => setOpen((value) => !value)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          padding: '0.25rem 0.5rem',
          marginLeft: '-0.5rem',
          borderRadius: '0.5rem',
          opacity: 0.85,
          font: 'inherit',
          color: status === 'error' ? 'error.main' : 'inherit',
          '&:hover': { backgroundColor: 'action.hover' },
          ...focusIndicatorStyle(),
        }}
      >
        <Box aria-hidden sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {status === 'running' ? (
            <CircularProgress size="1rem" color="inherit" />
          ) : status === 'error' ? (
            <ErrorOutline fontSize="small" />
          ) : (
            <Checklist fontSize="small" />
          )}
        </Box>
        <Typography component="span" variant="body2" sx={{ fontStyle: 'italic' }}>
          {summary}
        </Typography>
        <ExpandMore aria-hidden fontSize="small" sx={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </ButtonBase>
      {!open && status === 'running' && <Box data-testid="activity-latest">{renderPart(parts[count - 1], lastIndex)}</Box>}
      <Collapse in={open} unmountOnExit>
        <Box id={contentId} data-testid="activity-content" sx={{ mt: 1, pl: 2, borderLeft: '2px solid', borderColor: 'divider' }}>
          {parts.map((part, i) => renderPart(part, index + i))}
        </Box>
      </Collapse>
    </Box>
  )
}
