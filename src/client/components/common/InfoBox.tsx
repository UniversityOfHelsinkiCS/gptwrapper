import { Alert, type AlertColor } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import type { ReactNode } from 'react'

/**
 * A static, decorative info box. Visually identical to <Alert /> (standard variant)
 * but carries no alert semantics: it is not a live region and is not announced immediately by screen readers.
 *
 * Use MUI <Alert> only for genuine announcements — something changed as a result of a user action,
 * or an error the user must hear about. Everything else — static page descriptions, tips,
 * disclaimers, hints inside dialogs — is an InfoBox.
 */
export const InfoBox = ({
  severity,
  icon = undefined,
  action = undefined,
  sx = undefined,
  className = undefined,
  children,
  'data-testid': dataTestId = undefined,
}: {
  severity: AlertColor
  icon?: ReactNode | false
  action?: ReactNode
  sx?: SxProps<Theme>
  className?: string
  children: ReactNode
  'data-testid'?: string
}) => (
  <Alert role="presentation" severity={severity} icon={icon} action={action} sx={sx} className={className} data-testid={dataTestId}>
    {children}
  </Alert>
)
