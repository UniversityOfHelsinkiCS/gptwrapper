import ExpandMore from '@mui/icons-material/ExpandMore'
import Psychology from '@mui/icons-material/Psychology'
import { Box, ButtonBase, CircularProgress, Collapse, Typography } from '@mui/material'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ReasoningPart } from '../../../shared/agentChat'
import { focusIndicatorStyle } from '../../util/accessibility'

/** Whole seconds, at least one, so a quick thought does not read "Thought for 0 s". */
const thoughtSeconds = (durationMs: number) => Math.max(1, Math.round(durationMs / 1000))

/**
 * The model's reasoning (or its summary) above the answer. Collapsed by default, also while it streams: the
 * header says "Thinking…" with a spinner until the model starts answering, then "Thought for N s". When opened
 * it shows the reasoning as it arrives. The reasoning is not part of the message text (copy, email, download).
 */
export const ThinkingBlock = ({ part }: { part: ReasoningPart }) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const contentId = useId()
  const isThinking = part.durationMs === undefined

  return (
    <Box data-testid="thinking-block" data-thinking={isThinking} sx={{ my: 1.5 }}>
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
          '&:hover': { backgroundColor: 'action.hover' },
          ...focusIndicatorStyle(),
        }}
      >
        <Box aria-hidden sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {isThinking ? <CircularProgress size="1rem" color="inherit" /> : <Psychology fontSize="small" />}
        </Box>
        <Typography component="span" variant="body2" sx={{ fontStyle: 'italic' }}>
          {isThinking ? t('chat:thinking') : t('chat:thoughtFor', { seconds: thoughtSeconds(part.durationMs ?? 0) })}
        </Typography>
        <ExpandMore aria-hidden fontSize="small" sx={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </ButtonBase>
      <Collapse in={open} unmountOnExit>
        <Box
          id={contentId}
          data-testid="thinking-content"
          sx={{
            mt: 1,
            pl: 2,
            borderLeft: '2px solid',
            borderColor: 'divider',
            color: 'text.secondary',
            fontSize: '0.875rem',
            '& p': { my: 1 },
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
        </Box>
      </Collapse>
    </Box>
  )
}
