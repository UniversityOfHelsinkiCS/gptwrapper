import { useEffect } from 'react'
import { Alert, Button, Card, Container, Stack, Typography } from '@mui/material'
import ArrowBack from '@mui/icons-material/ArrowBack'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import type { Release } from '@shared/changelog'
import { useChangelog, useHasUnseenReleases } from '../../hooks/useChangelog'
import { usePreferencesUpdateMutation } from '../../hooks/usePreferencesUpdateMutation'
import { locales } from '../../locales/locales'

const ReleaseCard = ({ release }: { release: Release }) => {
  const { t, i18n } = useTranslation()

  const releaseDate = format(new Date(release.time), 'PP', { locale: locales[i18n.language] })

  return (
    <Card variant="outlined" sx={{ p: 2 }}>
      <Typography variant="h6" component="h2">
        {release.title}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {t('changelog:releasedOn', { version: release.version, date: releaseDate })}
      </Typography>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{release.description}</ReactMarkdown>
    </Card>
  )
}

export const Component = () => {
  const { t } = useTranslation()
  const { releases, isLoading, isError } = useChangelog()
  const hasUnseenReleases = useHasUnseenReleases()
  const { mutate: updatePreferences } = usePreferencesUpdateMutation()
  const navigate = useNavigate()
  const location = useLocation()

  const handleGoBack = () => {
    if (location.key !== 'default') {
      navigate(-1)
    } else {
      navigate('/general')
    }
  }

  const latestReleaseTime = releases[0]?.time

  useEffect(() => {
    if (hasUnseenReleases && latestReleaseTime) {
      updatePreferences({ lastSeenChangelogAt: latestReleaseTime })
    }
  }, [hasUnseenReleases, latestReleaseTime, updatePreferences])

  return (
    <Container sx={{ mt: '4rem', mb: '4rem' }} maxWidth="md">
      <Button startIcon={<ArrowBack />} onClick={handleGoBack} sx={{ mb: 2 }}>
        {t('common:back')}
      </Button>
      <Typography variant="h4" component="h1">
        {t('changelog:title')}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {t('changelog:subtitle')}
      </Typography>

      {isError && <Alert severity="error">{t('changelog:error')}</Alert>}
      {isLoading && <Typography variant="body2">{t('changelog:loading')}</Typography>}
      {!isLoading && !isError && releases.length === 0 && <Typography variant="body2">{t('changelog:empty')}</Typography>}

      <Stack direction="column" gap={2}>
        {releases.map((release) => (
          <ReleaseCard key={release.version} release={release} />
        ))}
      </Stack>
    </Container>
  )
}
