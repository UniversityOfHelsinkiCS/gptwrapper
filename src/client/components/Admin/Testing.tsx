import { Box, Typography } from '@mui/material'
import { BlueButton, OrangeButton } from '../ChatV2/general/Buttons'
import * as Sentry from '@sentry/react'
import useCurrentUser from '../../hooks/useCurrentUser'
import useUserSearch from '../../hooks/useUserSearch'
import apiClient from '../../util/apiClient'
import { User } from 'src/client/types'
import { useTranslation } from 'react-i18next'

const testResponsesApi = async () => {
  await apiClient.post('/test/responses-api-minimal')
}

const testCompletionsApi = async () => {
  await apiClient.post('/test/completions-api')
}

const handleLoginAs = (user: User | undefined | null, loginUnavailableMessage: string) => {
  if (!user) {
    alert(loginUnavailableMessage)
    return
  }

  localStorage.setItem('adminLoggedInAs', user.id)
  localStorage.setItem('adminLoggedInAsUser', JSON.stringify(user))
  window.location.reload()
}

export default function Testing() {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const testTeacherUsername = 'ahslaaks'

  // ahslaaks user account for testing a teacher account
  const { users } = useUserSearch(testTeacherUsername)
  const ahslaaks: User | undefined = users?.find((u) => u.username === testTeacherUsername)

  if (!user) return null

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Error & Sentry section */}
      <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          {t('admin:testingErrorSentryTitle')}
        </Typography>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          {t('admin:testingErrorSentryDescription')}
        </Typography>

        <Box sx={{ maxWidth: 360, width: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
          <OrangeButton
            onClick={() => {
              throw new Error(t('admin:testingErrorMessage', { username: user.username }))
            }}
          >
            {t('admin:testingErrorButtonLabel')}
          </OrangeButton>

          <OrangeButton
            onClick={() => {
              Sentry.captureMessage(t('admin:testingSentryMessage', { username: user.username }))
            }}
          >
            {t('admin:testingSentryButtonLabel')}
          </OrangeButton>
        </Box>
      </Box>

      {/* API section */}
      <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          {t('admin:testingApiTitle')}
        </Typography>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          {t('admin:testingApiDescription')}
        </Typography>

        <Box sx={{ maxWidth: 360, width: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
          <OrangeButton onClick={testResponsesApi}>{t('admin:testingResponsesButton')}</OrangeButton>

          <OrangeButton onClick={testCompletionsApi}>{t('admin:testingCompletionsButton')}</OrangeButton>
        </Box>
      </Box>

      {/* Impersonation section */}
      <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          {t('admin:testingImpersonationTitle')}
        </Typography>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          {t('admin:testingImpersonationDescription')}
        </Typography>

        <Box sx={{ maxWidth: 360, width: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
          <BlueButton onClick={() => {}} disabled>
            {t('admin:testingLoginAs')}&nbsp;<strong>{t('admin:testingFakeStudent')}</strong>&nbsp;({t('admin:testingNotWorkingYet')})
          </BlueButton>
          <BlueButton onClick={() => handleLoginAs(ahslaaks, t('admin:testingLoginUnavailable'))}>
            {t('admin:testingLoginAs')}&nbsp;<strong>{testTeacherUsername}</strong>
          </BlueButton>
        </Box>
      </Box>
    </Box>
  )
}
