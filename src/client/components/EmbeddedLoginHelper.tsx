import { Box, Container, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

export const EmbeddedLoginHelper = () => {
  const { t } = useTranslation()

  return (
    <Container maxWidth="sm">
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography variant="h6">{t('embeddedLogin:helpText')}</Typography>
      </Box>
    </Container>
  )
}
