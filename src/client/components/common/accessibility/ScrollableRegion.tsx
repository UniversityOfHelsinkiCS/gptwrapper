import { Box } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import type { ReactNode } from 'react'

/*
 Wraps content that cannot reflow (wide tables, long formulas) so that it scrolls
 horizontally on its own instead of widening the page . The region is
 focusable so keyboard users can scroll it with the arrow keys.
*/
export const ScrollableRegion = ({ label, children, sx }: { label: string; children: ReactNode; sx?: SxProps<Theme> }) => (
  <Box
    role="region"
    aria-label={label}
    tabIndex={0}
    sx={[
      {
        maxWidth: '100%',
        overflowX: 'auto',
        overflowY: 'hidden',
        '&:focus-visible': { outlineOffset: '-3px' },
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    {children}
  </Box>
)
