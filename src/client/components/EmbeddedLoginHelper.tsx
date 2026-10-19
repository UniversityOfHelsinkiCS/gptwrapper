import { Box, Container, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"
import { usePageTitle } from "../hooks/usePageTitle"

export const EmbeddedLoginHelper = () => {
  const { t } = useTranslation()
  usePageTitle(t('embeddedLogin:helpText'))

  return (
    <Container maxWidth="sm">
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography variant="h6" component="h2">{t('embeddedLogin:helpText')}</Typography>
      </Box>
    </Container>
  )
}
