import { Box, Container, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

const NoAccess = () => {
  const { t } = useTranslation()

  return (
    <Container sx={{ mt: '4rem', mb: '10rem' }} maxWidth="xl">
      <Box m={5} display="flex" justifyContent="center" flexDirection="column">
        <Typography mb={2} variant="h3">
          {t('error:noAccess')}
        </Typography>
        <Typography>{t('error:noAccessInfo')}</Typography>
      </Box>
    </Container>
  )
}

export default NoAccess
