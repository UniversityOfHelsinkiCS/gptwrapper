import Close from '@mui/icons-material/Close'
import { Box, IconButton, styled } from '@mui/material'
import { visuallyHidden } from '@mui/utils'
import {
  MaterialDesignContent,
  closeSnackbar,
  enqueueSnackbar as enqueueNotistackSnackbar,
  type CloseReason,
  type CustomContentProps,
  type OptionsObject,
  type SnackbarKey,
} from 'notistack'
import { forwardRef, useId, type SyntheticEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { forgetSnackbar, reannounceSnackbar } from './Accessibility/SnackbarAnnouncer'

export const MAX_SNACKBARS = 4

// Keyed by message, from enqueueing until the snackbar starts closing
const openSnackbars = new Map<string, SnackbarKey>()

/*
 Use this instead of enqueueSnackbar from notistack.
 Errors and warnings stay until the user closes them with the close button so that they are not missed.
 A message that is already open is not shown twice, but it is announced again so that a screen reader user
 knows the action caused it again. Duplicates are handled here instead of notistack's preventDuplicate,
 which silently drops them, also while the previous one is still animating out.
*/
export const enqueueSnackbar = (message: string, options: OptionsObject = {}) => {
  const openKey = openSnackbars.get(message)
  if (openKey !== undefined) {
    reannounceSnackbar(openKey)
    return openKey
  }

  const persist = options.variant === 'error' || options.variant === 'warning'
  const key = enqueueNotistackSnackbar(message, { persist, ...options })
  openSnackbars.set(message, key)
  return key
}

export const forgetClosedSnackbar = (_event: SyntheticEvent | null, _reason: CloseReason, key?: SnackbarKey) => {
  for (const [message, openKey] of openSnackbars) {
    if (openKey === key) openSnackbars.delete(message)
  }
  if (key !== undefined) forgetSnackbar(key)
}

const SnackbarCloseButton = ({ snackbarId, messageId }: { snackbarId: SnackbarKey; messageId: string }) => {
  const { t } = useTranslation()

  return (
    <IconButton
      aria-label={t('accessibility:closeNotification')}
      aria-describedby={messageId}
      color="inherit"
      size="small"
      onClick={() => closeSnackbar(snackbarId)}
    >
      <Close fontSize="small" />
    </IconButton>
  )
}

const FixedWidthContent = styled(MaterialDesignContent)<{ variant?: string }>(({ theme, variant }) => ({
  '&.notistack-MuiContent': {
    width: 400,
    maxWidth: '100%',
    flexWrap: 'nowrap',
    color: 'white',
    backgroundColor:
      String(variant) === 'error'
        ? theme.palette.error.main
        : String(variant) === 'success'
          ? theme.palette.success.main
          : String(variant) === 'warning'
            ? '#C5A207'
            : String(variant) === 'info'
              ? theme.palette.primary.main
              : theme.palette.secondary.main,
  },
  '& #notistack-snackbar': {
    flex: 1,
    minWidth: 0,
    overflowWrap: 'anywhere',
  },
}))

/*
 The type of an error or warning is otherwise shown only with color and icon, so it is written out for screen readers.
 It is part of the message text, so it is also heard in the live announcement and with the virtual cursor.
 The close button is described by the message: focusing it tells which notification it closes.
 Notistack gives every message the same id, so a unique one is needed for that.
*/
const SnackbarContent = forwardRef<HTMLDivElement, CustomContentProps>(({ id, message, variant, ...props }, ref) => {
  const { t } = useTranslation()
  const messageId = useId()

  let severityLabel: string | null = null
  if (variant === 'error') severityLabel = t('accessibility:errorNotification')
  if (variant === 'warning') severityLabel = t('accessibility:warningNotification')

  return (
    <FixedWidthContent
      ref={ref}
      {...props}
      id={id}
      variant={variant}
      message={
        <span id={messageId}>
          {severityLabel && <Box component="span" sx={visuallyHidden}>{`${severityLabel}: `}</Box>}
          {message}
        </span>
      }
      action={<SnackbarCloseButton snackbarId={id} messageId={messageId} />}
    />
  )
})

export const snackbarComponents = {
  default: SnackbarContent,
  success: SnackbarContent,
  error: SnackbarContent,
  warning: SnackbarContent,
  info: SnackbarContent,
}
