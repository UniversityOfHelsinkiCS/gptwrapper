import { Checkbox, FormControlLabel, Switch } from "@mui/material"
import { User } from "@shared/user"
import { useSnackbar } from "notistack"
import { useTranslation } from "react-i18next"
import useCurrentUser from "../../hooks/useCurrentUser"
import { usePreferencesUpdateMutation } from "../../hooks/usePreferencesUpdateMutation"
import queryClient from "../../util/queryClient"
import { useCallback } from "react"

export const useNewConversationConfirmMutation = (context: 'chat' | 'settings') => {
  const preferenceUpdate = usePreferencesUpdateMutation()
  const { enqueueSnackbar } = useSnackbar()
  const { t } = useTranslation()

  const mutation = useCallback(async (value: boolean) => {
    const preferenceUpdates = {
      skipNewConversationConfirm: value,
    }

    if (preferenceUpdates.skipNewConversationConfirm !== undefined) {
      await preferenceUpdate.mutateAsync(preferenceUpdates, {
        onSuccess: () => {
          queryClient.setQueryData(['login'], (oldData: User) => ({
            ...oldData,
            preferences: {
              ...oldData?.preferences,
              skipNewConversationConfirm: preferenceUpdates.skipNewConversationConfirm,
            },
          }))
        }
      })
      let msg = t('preferences:success')
      if (context === 'chat') {
        msg += ` ${t('preferences:canChangeInSettings')}`
      }
      enqueueSnackbar(msg, { variant: 'success' })
    }
  }, [])

  return mutation
}

export const NewConversationConfirmConfigurator = ({ label, value, setValue, context }: { label: string, value: boolean, setValue: (value: boolean) => void, context?: 'chat' | 'settings' }) => {
  const Control = context === 'chat' ? Checkbox : Switch
  return (
    <FormControlLabel control={<Control checked={value} onChange={(e) => setValue(e.target.checked)} />} label={label} />
  )
}