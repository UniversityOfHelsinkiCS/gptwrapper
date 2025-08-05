import { Alert, AlertTitle, Box } from '@mui/material'
import { usePreferencesUpdateMutation } from '../../hooks/usePreferencesUpdateMutation'
import { useTranslation } from 'react-i18next'
import { OutlineButtonBlue } from './generics/Buttons'

export const TestUseInfoV2 = () => {
  const { t } = useTranslation()
  const updatePreferences = usePreferencesUpdateMutation()

  return (
    <Alert severity="info">
      <AlertTitle>{t('testUse:titleV2')}</AlertTitle>
      <OutlineButtonBlue onClick={() => updatePreferences.mutate({ chatVersion: 2 })}>{t('testUse:buttonV2')}</OutlineButtonBlue>
    </Alert>
  )
}

export const TestUseInfoV1 = () => {
  const { t } = useTranslation()
  const updatePreferences = usePreferencesUpdateMutation()

  return (
    <Alert severity="info">
      <AlertTitle>{t('testUse:titleV1')}</AlertTitle>
      <OutlineButtonBlue onClick={() => updatePreferences.mutate({ chatVersion: 1 })}>{t('testUse:buttonV1')}</OutlineButtonBlue>
    </Alert>
  )
}
