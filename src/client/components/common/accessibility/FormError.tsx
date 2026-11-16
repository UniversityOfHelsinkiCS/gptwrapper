import { Box } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import { visuallyHidden } from '@mui/utils'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { InfoBox } from '../InfoBox'
import { announceToScreenReader } from './SnackbarAnnouncer'

/**
 * Errors of a form must stay visible next to the form, not only in a snackbar that disappears (WCAG 2.2.1).
 *
 * `setError` stores the message and announces it through the persistent live regions: a role="alert" element
 * mounted together with its text is announced unreliably, see SnackbarAnnouncer.ts.
 * Show a field's error as its `helperText` and a form-level error (e.g. a failed save) with `FormError`.
 */
export const useFormError = () => {
  const [error, setErrorState] = useState<string | null>(null)

  // Pass announce: false when focus moves to the invalid field: its error is then read out from aria-describedby,
  // and announcing it as well would make the screen reader read it twice
  const setError = useCallback((message: string | null, { announce = true } = {}) => {
    setErrorState(message)
    if (message && announce) announceToScreenReader(message, { assertive: true })
  }, [])

  return [error, setError] as const
}

export const FormError = ({ error, sx = undefined }: { error: string | null; sx?: SxProps<Theme> }) => {
  const { t } = useTranslation()

  if (!error) return null

  return (
    <InfoBox severity="error" sx={sx} data-testid="form-error">
      <Box component="span" sx={visuallyHidden}>{`${t('accessibility:errorNotification')}: `}</Box>
      {error}
    </InfoBox>
  )
}

/** Moves focus to the first invalid field of the form, whose error is read out from its aria-describedby */
export const focusFirstInvalidField = (form: HTMLElement | null) => {
  const field = form?.querySelector<HTMLElement>('[aria-invalid="true"]')
  field?.focus()
  return !!field
}
