import { Box, Container, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { usePageTitle } from '../../hooks/usePageTitle'

const NoAccess = () => {
  const { t } = useTranslation()
  usePageTitle(t('error:noAccess'))

  return (
    <Container sx={{ mt: '4rem', mb: '10rem' }} maxWidth="xl">
      <Box m={5} display="flex" justifyContent="center" flexDirection="column">
        <Typography mb={2} variant="h3" component="h2">
          {t('error:noAccess')}
        </Typography>
        <Typography>{t('error:noAccessInfo')}</Typography>
      </Box>
    </Container>
  )
}

export default NoAccess
