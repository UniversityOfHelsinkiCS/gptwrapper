import { Box, Typography } from "@mui/material"
import { useEffect } from "react"
import { useTranslation } from "react-i18next"

export const EmbeddedLoginHelper = () => {
  const { t } = useTranslation()

  useEffect(() => {
    const eventListener = (event: MessageEvent<any>) => {
      if (event.data?.type === 'login-query') {
        window.opener.postMessage({ type: "login-success", nonce: event.data?.nonce }, '*')
        window.close() // <- this may fail, but we can try. If it fails, user can close the window manually.
      }
    }

    window.addEventListener('message', eventListener)

    return () => {
      window.removeEventListener('message', eventListener)
    }
  }, [])

  return (
    <Box>
      <Typography>{t('embeddedLogin:helpText')}</Typography>
    </Box>
  )
}
