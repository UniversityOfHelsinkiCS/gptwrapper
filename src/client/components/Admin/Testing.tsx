import { Box, Typography } from '@mui/material'
import { BlueButton, OrangeButton } from '../ChatV2/general/Buttons'
import * as Sentry from '@sentry/react'
import useCurrentUser from '../../hooks/useCurrentUser'
import useUserSearch from '../../hooks/useUserSearch'
import apiClient from '../../util/apiClient'
import { User } from 'src/client/types'

const testResponsesApi = async () => {
  await apiClient.post('/test/responses-api-minimal')
}

const testCompletionsApi = async () => {
  await apiClient.post('/test/completions-api')
}

const handleLoginAs = (user: User | undefined | null) => {
  if (!user) {
    alert('Test login not work')
    return
  }

  localStorage.setItem('adminLoggedInAs', user.id)
  localStorage.setItem('adminLoggedInAsUser', JSON.stringify(user))
  window.location.reload()
}

export default function Testing() {
  const { user } = useCurrentUser()

  // ahslaaks user account for testing a teacher account
  const { users } = useUserSearch('ahslaaks')
  const ahslaaks: User | undefined = users?.find((u) => u.username === 'ahslaaks')

  if (!user) return null

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Error & Sentry section */}
      <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          Error & Sentry testing
        </Typography>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          Triggers that should show up in Sentry and Slack. Use with care.
        </Typography>

        <Box sx={{ maxWidth: 360, width: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
          <OrangeButton
            onClick={() => {
              throw new Error(
                `Testing client-side error. Caused by ${user.username} pressing the Error testing button.`
              )
            }}
          >
            Error testing button. Pressing should cause a sentry error being emitted and an alert fired in toska slack.
          </OrangeButton>

          <OrangeButton
            onClick={() => {
              Sentry.captureMessage(
                `Greetings from ${user.username}, they just pressed the Sentry message testing button.`
              )
            }}
          >
            Sentry message testing button. Pressing should cause a sentry message being emitted and a message sent to toska slack.
          </OrangeButton>
        </Box>
      </Box>

      {/* API section */}
      <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          Backend API tests
        </Typography>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          Calls test endpoints. Only use when you know what you are checking.
        </Typography>

        <Box sx={{ maxWidth: 360, width: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
          <OrangeButton onClick={testResponsesApi}>
            Responses API test, see logs. Do not press for fun.
          </OrangeButton>

          <OrangeButton onClick={testCompletionsApi}>
            Completions API test, Do not press for fun.
          </OrangeButton>
        </Box>
      </Box>

      {/* Impersonation section */}
      <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          Fake user logins
        </Typography>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          Quickly jump into predefined test accounts.
        </Typography>

        <Box sx={{ maxWidth: 360, width: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
          <BlueButton onClick={() => { }} disabled>
            Login as&nbsp;<strong>FAKE STUDENT</strong>&nbsp;(not working yet)
          </BlueButton>
          <BlueButton onClick={() => handleLoginAs(ahslaaks)}>
            Login as&nbsp;<strong>ahslaaks</strong>
          </BlueButton>
        </Box>
      </Box>
    </Box>
  )
}
