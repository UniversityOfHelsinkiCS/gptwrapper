import { Box, FormControl, FormControlLabel, Popover, Radio, RadioGroup, Typography } from '@mui/material'
import useCurrentUser from '../../hooks/useCurrentUser'
import { useTranslation } from 'react-i18next'
import { OutlineButtonBlack } from '../ChatV2/general/Buttons'
import ArrowUpward from '@mui/icons-material/ArrowUpward'
import KeyboardReturn from '@mui/icons-material/KeyboardReturn'
import { usePreferencesUpdateMutation } from '../../hooks/usePreferencesUpdateMutation'
import { UserPreferences } from '../../../shared/user'
import { enqueueSnackbar } from '../common/Snackbar'
import { useId, useState } from 'react'
import { optionFocusIndicatorStyle } from 'src/client/util/accessibility'

export const ShiftEnterToSend = ({ t }) => (
  <Box display="flex" flexWrap="wrap" alignItems="center" gap={0.5} component="span">
    <strong>{t('sendPreferenceConfigurator:shift')}</strong>
    <ArrowUpward fontSize="small" />+ <strong>{t('sendPreferenceConfigurator:return')}</strong>
    <KeyboardReturn fontSize="small" sx={{ ...optionFocusIndicatorStyle() }} />
    {t('sendPreferenceConfigurator:toSend')}
  </Box>
)

export const EnterToSend = ({ t }) => (
  <Box display="flex" flexWrap="wrap" alignItems="center" gap={0.5} component="span">
    <strong>{t('sendPreferenceConfigurator:return')}</strong>
    <KeyboardReturn fontSize="small" />
    {t('sendPreferenceConfigurator:toSend')}
  </Box>
)

export const ShiftEnterForNewline = ({ t }) => (
  <Box display="flex" flexWrap="wrap" alignItems="center" gap={0.5} component="span">
    <strong>{t('sendPreferenceConfigurator:shift')}</strong>
    <ArrowUpward fontSize="small" />+ <strong>{t('sendPreferenceConfigurator:return')}</strong>
    <KeyboardReturn fontSize="small" />
    {t('sendPreferenceConfigurator:toNewline')}
  </Box>
)

export const EnterForNewline = ({ t }) => (
  <Box display="flex" flexWrap="wrap" alignItems="center" gap={0.5} component="span">
    <strong>{t('sendPreferenceConfigurator:return')}</strong>
    <KeyboardReturn fontSize="small" />
    {t('sendPreferenceConfigurator:toNewline')}
  </Box>
)

export const SendPreferenceConfigurator = ({
  value,
  onChange,
  titleId,
}: {
  value: 'shift+enter' | 'enter'
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  titleId?: string
}) => {
  const { t } = useTranslation()
  const generatedTitleId = useId()
  const labelId = titleId ?? generatedTitleId

  return (
    <RadioGroup value={value} onChange={onChange} name="sendPreferenceConfigurator" aria-labelledby={labelId}>
      <Typography id={labelId}>{t('sendPreferenceConfigurator:title')}</Typography>
      <FormControlLabel
        sx={{ my: 1, borderRadius: 1, p: 1, ...optionFocusIndicatorStyle() }}
        value="shift+enter"
        control={<Radio />}
        label={
          <Box sx={{}}>
            <ShiftEnterToSend t={t} />
            <EnterForNewline t={t} />
          </Box>
        }
      />
      <FormControlLabel
        sx={{ mb: 1, borderRadius: 1, p: 1, ...optionFocusIndicatorStyle() }}
        value="enter"
        control={<Radio />}
        label={
          <Box>
            <EnterToSend t={t} />
            <ShiftEnterForNewline t={t} />
          </Box>
        }
      />
    </RadioGroup>
  )
}

export const SendPreferenceConfiguratorModal = ({ open, onClose, anchorEl, context }) => {
  const { user } = useCurrentUser()
  const preferenceUpdate = usePreferencesUpdateMutation()
  const { t } = useTranslation()
  const titleId = useId()

  const defaultValue = user?.preferences?.sendShortcutMode || 'shift+enter'
  const [value, setValue] = useState(defaultValue)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onClose()
    const preferenceUpdates = {
      sendShortcutMode: value,
    }
    let msg = t('preferences:success')
    if (context === 'chat') {
      msg += ` ${t('preferences:canChangeInSettings')}`
    }
    enqueueSnackbar(msg, { variant: 'success' })
    await preferenceUpdate.mutateAsync(preferenceUpdates)
  }

  const handleClose = async () => {
    onClose()
    if (context === 'chat') {
      enqueueSnackbar(t('preferences:canChangeInSettings'), { variant: 'info' })
    }
    await preferenceUpdate.mutateAsync({ sendShortcutMode: defaultValue })
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Zod parsing to please ts
    const preferenceUpdates = {
      sendShortcutMode: (event.target as HTMLInputElement).value as UserPreferences['sendShortcutMode'],
    }
    if (preferenceUpdates.sendShortcutMode) {
      setValue(preferenceUpdates.sendShortcutMode)
    }
  }

  return (
    <Popover
      open={open}
      onClose={handleClose}
      anchorEl={anchorEl}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      slotProps={{
        paper: {
          role: 'dialog',
          'aria-modal': true,
          'aria-labelledby': titleId,
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <FormControl sx={{ p: { xs: 2, sm: 3 } }}>
          <SendPreferenceConfigurator value={value} onChange={handleChange} titleId={titleId} />
          <OutlineButtonBlack type="submit" data-testid="submit-send-preference">
            {t('sendPreferenceConfigurator:ok')}
          </OutlineButtonBlack>
        </FormControl>
      </form>
    </Popover>
  )
}
