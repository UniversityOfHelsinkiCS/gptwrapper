import { Box, CircularProgress, Typography } from '@mui/material'
import ErrorOutline from '@mui/icons-material/ErrorOutline'
import type { ReactNode } from 'react'
import type { ToolPart } from '../../../../shared/agentChat'

/**
 * The compact line a tool part shows in its place in the answer. `label` names the tool for screen readers
 * (the group's accessible name); `text` says what it did. The status icon is decorative.
 */
export const ToolPartRow = ({ part, label, icon, text }: { part: ToolPart; label: string; icon: ReactNode; text: string }) => (
  <Box
    role="group"
    aria-label={label}
    data-testid="tool-part"
    data-tool-name={part.name}
    data-tool-status={part.status}
    sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 1.5, opacity: 0.85, color: part.status === 'error' ? 'error.main' : 'inherit' }}
  >
    <Box aria-hidden sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      {part.status === 'running' ? <CircularProgress size="1rem" color="inherit" /> : part.status === 'error' ? <ErrorOutline fontSize="small" /> : icon}
    </Box>
    <Typography component="span" variant="body2" sx={{ fontStyle: 'italic', wordBreak: 'break-word' }}>
      {text}
    </Typography>
  </Box>
)
