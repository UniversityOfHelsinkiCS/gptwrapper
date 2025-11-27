import { Box, FormControl, FormControlLabel, Menu, Radio, RadioGroup, Typography } from '@mui/material'
import useCurrentUser from '../../hooks/useCurrentUser'
import { useTranslation } from 'react-i18next'
import { OutlineButtonBlack } from '../ChatV2/general/Buttons'
import ArrowUpward from '@mui/icons-material/ArrowUpward'
import KeyboardReturn from '@mui/icons-material/KeyboardReturn'
import { usePreferencesUpdateMutation } from '../../hooks/usePreferencesUpdateMutation'
import { UserPreferences } from '../../../shared/user'
import { useSnackbar } from 'notistack'
import { useState } from 'react'

export const ShiftEnterToSend = ({ t }) => (
  <Box display="flex" alignItems="center" gap={0.5} component="span">
    <strong>{t('sendPreferenceConfigurator:shift')}</strong>
    <ArrowUpward fontSize="small" />+ <strong>{t('sendPreferenceConfigurator:return')}</strong>
    <KeyboardReturn fontSize="small" />
    {t('sendPreferenceConfigurator:toSend')}
  </Box>
)

export const EnterToSend = ({ t }) => (
  <Box display="flex" alignItems="center" gap={0.5} component="span">
    <strong>{t('sendPreferenceConfigurator:return')}</strong>
    <KeyboardReturn fontSize="small" />
    {t('sendPreferenceConfigurator:toSend')}
  </Box>
)

export const ShiftEnterForNewline = ({ t }) => (
  <Box display="flex" alignItems="center" gap={0.5} component="span">
    <strong>{t('sendPreferenceConfigurator:shift')}</strong>
    <ArrowUpward fontSize="small" />+ <strong>{t('sendPreferenceConfigurator:return')}</strong>
    <KeyboardReturn fontSize="small" />
    {t('sendPreferenceConfigurator:toNewline')}
  </Box>
)

export const EnterForNewline = ({ t }) => (
  <Box display="flex" alignItems="center" gap={0.5} component="span">
    <strong>{t('sendPreferenceConfigurator:return')}</strong>
    <KeyboardReturn fontSize="small" />
    {t('sendPreferenceConfigurator:toNewline')}
  </Box>
)

export const SendPreferenceConfigurator = ({ value, onChange }: { value: 'shift+enter' | 'enter', onChange: (event: React.ChangeEvent<HTMLInputElement>) => void; }) => {
  const { t } = useTranslation()

  return (
    <RadioGroup value={value} onChange={onChange} name="sendPreferenceConfigurator">
      <Typography >{t('sendPreferenceConfigurator:title')}</Typography>
      <FormControlLabel
        sx={{ my: 2, borderRadius: 1, backgroundColor: 'grey.100', p: 2 }}
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
        sx={{ mb: 2, borderRadius: 1, backgroundColor: 'grey.100', p: 2 }}
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
  const { enqueueSnackbar } = useSnackbar()
  const { t } = useTranslation()

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
    <Menu
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
    >
      <form onSubmit={handleSubmit}>
        <FormControl sx={{ p: 3 }}>
          <SendPreferenceConfigurator value={value} onChange={handleChange} />
          <OutlineButtonBlack type="submit" data-testid="submit-send-preference">
            {t('sendPreferenceConfigurator:ok')}
          </OutlineButtonBlack>
        </FormControl>
      </form>
    </Menu>
  )
}
