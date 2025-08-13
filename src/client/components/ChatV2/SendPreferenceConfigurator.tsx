import { Box, Divider, FormControl, FormControlLabel, FormLabel, ListSubheader, Menu, MenuItem, Radio, RadioGroup, Typography } from '@mui/material'
import useCurrentUser from '../../hooks/useCurrentUser'
import { useTranslation } from 'react-i18next'
import { OutlineButtonBlack } from './general/Buttons'
import { ArrowUpward, KeyboardReturn, Settings } from '@mui/icons-material'
import { usePreferencesUpdateMutation } from '../../hooks/usePreferencesUpdateMutation'
import { UserPreferencesSchema } from '../../../shared/user'
import { useSnackbar } from 'notistack'
import { useState } from 'react'

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
    let msg = t('sendPreferenceConfigurator:success')
    if (context === 'chat') {
      msg += ` ${t('sendPreferenceConfigurator:canChangeInSettings')}`
    }
    enqueueSnackbar(msg, { variant: 'success' })
    await preferenceUpdate.mutateAsync(preferenceUpdates)
  }

  const handleClose = async () => {
    onClose()
    if (context === 'chat') {
      enqueueSnackbar(t('sendPreferenceConfigurator:canChangeInSettings'), { variant: 'info' })
    }
    await preferenceUpdate.mutateAsync({ sendShortcutMode: defaultValue })
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Zod parsing to please ts
    const preferenceUpdates = UserPreferencesSchema.parse({
      sendShortcutMode: (event.target as HTMLInputElement).value,
    })
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
        <FormControl sx={{ p: 2 }}>
          <Typography>{t('sendPreferenceConfigurator:title')}</Typography>
          <RadioGroup value={value} onChange={handleChange} name="sendPreferenceConfigurator">
            <FormControlLabel
              sx={{ my: 2 }}
              value="shift+enter"
              control={<Radio />}
              label={
                <div>
                  <Box display="flex" alignItems="center" gap={1}>
                    <strong>{t('sendPreferenceConfigurator:shift')}</strong>
                    <ArrowUpward fontSize="small" />+ <strong>{t('sendPreferenceConfigurator:return')}</strong>
                    <KeyboardReturn fontSize="small" />
                    {t('sendPreferenceConfigurator:toSend')}
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <strong>{t('sendPreferenceConfigurator:return')}</strong>
                    <KeyboardReturn fontSize="small" />
                    {t('sendPreferenceConfigurator:toAddNewline')}
                  </Box>
                </div>
              }
            />
            <FormControlLabel
              sx={{ mb: 2 }}
              value="enter"
              control={<Radio />}
              label={
                <div>
                  <Box display="flex" alignItems="center" gap={1}>
                    <strong>{t('sendPreferenceConfigurator:return')}</strong>
                    <KeyboardReturn fontSize="small" />
                    {t('sendPreferenceConfigurator:toSend')}
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <strong>{t('sendPreferenceConfigurator:shift')}</strong>
                    <ArrowUpward fontSize="small" />+ <strong>{t('sendPreferenceConfigurator:return')}</strong>
                    <KeyboardReturn fontSize="small" />
                    {t('sendPreferenceConfigurator:toAddNewline')}
                  </Box>
                </div>
              }
            />
          </RadioGroup>
          <OutlineButtonBlack type="submit">{t('sendPreferenceConfigurator:ok')}</OutlineButtonBlack>
        </FormControl>
      </form>
    </Menu>
  )
}

export const SendPreferenceConfiguratorButton = () => {
  const { t } = useTranslation()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(event.currentTarget)
  const handleClose = () => setAnchorEl(null)
  const open = Boolean(anchorEl)

  return (
    <>
      <OutlineButtonBlack onClick={handleClick} endIcon={<Settings />}>
        {t('sendPreferenceConfigurator:openConfigurator')}
      </OutlineButtonBlack>
      <SendPreferenceConfiguratorModal open={open} onClose={handleClose} anchorEl={anchorEl} context="settings" />
    </>
  )
}
