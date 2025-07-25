import { Box } from '@mui/material'
import { OutlineButtonBlack, OutlineButtonBlue } from '../ChatV2/generics/Buttons'
import * as Sentry from '@sentry/react'
import useCurrentUser from '../../hooks/useCurrentUser'

export default function Testing() {
  const { user } = useCurrentUser()
  if (!user) return null

  return (
    <Box>
      <OutlineButtonBlack
        sx={{ mb: 1 }}
        onClick={() => {
          throw new Error(`Testing client-side error. Caused by ${user.username} pressing the Error testing button.`)
        }}
        // eslint-disable-next-line i18next/no-literal-string
      >
        Error testing button. Pressing should cause a sentry error being emitted and an alert fired in toska slack.
      </OutlineButtonBlack>
      <OutlineButtonBlue
        onClick={() => {
          Sentry.captureMessage(`Greetings from ${user.username}, they just pressed the Sentry message testing button.`)
        }}
        // eslint-disable-next-line i18next/no-literal-string
      >
        Sentry message testing button. Pressing should cause a sentry message being emitted and a message sent to toska slack.
      </OutlineButtonBlue>
    </Box>
  )
}
