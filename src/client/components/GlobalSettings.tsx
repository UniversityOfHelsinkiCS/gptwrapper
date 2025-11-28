import { Dialog, DialogTitle, DialogContent, Box, FormControl, Typography, IconButton, Divider } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Close } from '@mui/icons-material'
import { BlueButton } from './ChatV2/general/Buttons'
import { usePreferencesUpdateMutation } from '../hooks/usePreferencesUpdateMutation'
import useCurrentUser from '../hooks/useCurrentUser'
import { UserPreferences } from '../../shared/user'
import { useSnackbar } from 'notistack'
import { useEffect, useState } from 'react'

import { SendPreferenceConfigurator } from './Settings/SendPreferenceConfigurator'
import { NewConversationConfirmConfigurator } from './Settings/NewConversationConfirmConfigurator'
import { CollapsedSidebarConfigurator } from './Settings/CollapsedSidebarConfigurator'

export const GlobalSettings = ({
  open, setOpen
}: {
  open: boolean
  setOpen: (open: boolean) => void
}) => {
  const { user, isLoading } = useCurrentUser()
  const preferenceUpdate = usePreferencesUpdateMutation()

  const { enqueueSnackbar } = useSnackbar()
  const { t } = useTranslation()

  const [sendShortcutMode, setSendShortcutMode] = useState<UserPreferences['sendShortcutMode']>('shift+enter')
  const [skipNewConversationConfirm, setSkipNewConversationConfirm] = useState<UserPreferences['skipNewConversationConfirm']>(false)
  const [collapsedSidebarDefault, setCollapsedSidebarDefault] = useState<UserPreferences['collapsedSidebarDefault']>(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const preferenceUpdates: UserPreferences = {
      sendShortcutMode,
      collapsedSidebarDefault,
      skipNewConversationConfirm,
    }

    setOpen(false)
    enqueueSnackbar(t('preferences:success'), { variant: 'success' })
    await preferenceUpdate.mutateAsync(preferenceUpdates)
  }

  useEffect(() => {
    setSendShortcutMode(user?.preferences?.sendShortcutMode)
    setSkipNewConversationConfirm(user?.preferences?.skipNewConversationConfirm)
    setCollapsedSidebarDefault(user?.preferences?.collapsedSidebarDefault)
  }, [user])

  if (isLoading) {
    return (
      <Dialog fullWidth open={open} onClose={() => setOpen(false)}>
        loading
      </Dialog>
    )
  }

  return (
    <Dialog fullWidth open={open} onClose={() => setOpen(false)}>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {t('globalSettings:title')}
          <IconButton
            data-testid="close-global-settings"
            onClick={() => setOpen(false)}
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <FormControl sx={{ display: 'flex', flexDirection: 'column', gap: 5, p: { xs: 1, md: 3 } }}>
            <Box>
              <Typography fontWeight='bold' mb={1}>{t('settings:newConversation')}</Typography>
              <NewConversationConfirmConfigurator
                label={t('settings:newConversationToggle')}
                value={skipNewConversationConfirm!}
                setValue={setSkipNewConversationConfirm}
                context='settings' />
            </Box>

            <Divider />

            <Box>
              <Typography fontWeight='bold' mb={1}>{t('settings:sidebar')}</Typography>
              <CollapsedSidebarConfigurator
                label={t('settings:sidebarSettings')}
                value={collapsedSidebarDefault!}
                setValue={setCollapsedSidebarDefault} />
            </Box>

            <Divider />

            <Box>
              <Typography fontWeight='bold' mb={1}>{t('settings:sendMode')}</Typography>
              <SendPreferenceConfigurator
                value={sendShortcutMode!}
                onChange={(event) => setSendShortcutMode(event.target.value as UserPreferences['sendShortcutMode'])} />
            </Box>
          </FormControl>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <BlueButton type="submit" data-testid="submit-send-preference">
              {t('common:save')}
            </BlueButton>
          </Box>
        </form>
      </DialogContent>
    </Dialog>
  )
}
