import { Box, Paper, ToggleButton, Typography } from '@mui/material'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { alpha } from '@mui/material/styles'

import type { CoursesViewCourse } from '../../hooks/useUserCourses'
import useUniversityPrompts, { groupLanguages, type UniversityPromptGroup } from '../../hooks/useUniversityPrompts'
import type { Prompt, PromptLanguage } from '../../types'
import CopyPromptMenu from './CopyPromptMenu.tsx'
import { StatusAnnouncer } from '../common/StatusAnnouncer.tsx'

const isPromptLanguage = (language: string): language is PromptLanguage => language === 'fi' || language === 'en' || language === 'sv'

/**
 * The language shown first: the UI language when the group has it, otherwise the
 * group's first available one. Groups may be partial — fi+en today, sv later.
 */
const defaultLanguage = (languages: PromptLanguage[], uiLanguage: string): PromptLanguage | undefined => {
  const preferred = uiLanguage.split('-')[0]

  if (isPromptLanguage(preferred) && languages.includes(preferred)) return preferred

  return languages[0]
}

const UniversityPromptCard = ({
  group,
  onSelect,
  copyTargets,
  onCopied,
}: {
  group: UniversityPromptGroup
  onSelect: (prompt: Prompt) => void
  copyTargets: CoursesViewCourse[]
  onCopied: (course?: CoursesViewCourse) => void
}) => {
  const { t, i18n } = useTranslation()
  const languages = groupLanguages(group)
  const [language, setLanguage] = useState<PromptLanguage | undefined>(() => defaultLanguage(languages, i18n.language))
  const [copyAnchor, setCopyAnchor] = useState<HTMLElement | null>(null)

  const prompt = group.prompts.find((p) => p.language === language) ?? group.prompts[0]

  if (!prompt) return null

  const isTemplate = prompt.type === 'TEMPLATE'

  const activate = (element: HTMLElement) => {
    if (isTemplate) {
      setCopyAnchor(element)
      return
    }

    onSelect(prompt)
  }

  return (
    <>
      <Paper
        variant="outlined"
        sx={{
          position: 'relative',
          ml: 0.5,
          p: 2,
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'background.elevated',
          transition: 'border-color 120ms ease, background-color 120ms ease',
          '&:hover, &:focus-within': {
            borderColor: 'primary.main',
            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.04),
          },
        }}
      >
        <Box
          component="button"
          type="button"
          aria-label={
            isTemplate
              ? `${t('uniPrompts:categoryTemplate')} ${prompt.name} ${t('uniPrompts:copyTo')}`
              : `${t('uniPrompts:categoryUniversity')} ${prompt.name} ${t('accessibility:chooseUniPrompt')}`
          }
          aria-describedby={prompt.userInstructions ? `uni-prompt-user-instructions-${group.id}` : undefined}
          onClick={(event) => activate(event.currentTarget)}
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            m: 0,
            p: 0,
            border: 0,
            borderRadius: 'inherit',
            background: 'none',
            cursor: 'pointer',
            font: 'inherit',
          }}
          data-testid={`uni-prompt-card-${prompt.name}`}
        />

        <Box sx={{ mb: 1.5, pointerEvents: 'none' }}>
          <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
            {prompt.name}
          </Typography>

          {prompt.userInstructions && (
            <Typography
              id={`uni-prompt-user-instructions-${group.id}`}
              variant="body2"
              color="text.secondary"
              aria-hidden
              sx={{ mt: 0.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            >
              {prompt.userInstructions}
            </Typography>
          )}
        </Box>

        {languages.length > 0 && (
          <Box
            role="group"
            aria-label={t('accessibility:chooseLanguageVersion', { name: prompt.name })}
            sx={{ position: 'relative', zIndex: 1, display: 'flex', gap: 0.75, mt: 'auto', pt: 1.25, borderTop: '1px solid', borderColor: 'divider' }}
            data-testid={`uni-prompt-languages-${group.id}`}
          >
            {languages.map((option) => (
              <ToggleButton
                key={option}
                value={option}
                size="small"
                selected={option === language}
                onClick={(event) => {
                  event.stopPropagation()
                  setLanguage(option)
                }}
                sx={{
                  px: 1.1,
                  py: 0.4,
                  minWidth: 24,
                  minHeight: 24,
                  lineHeight: 1,
                  fontSize: '0.6875rem',
                  letterSpacing: '0.06em',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  color: 'text.primary',
                  '&.Mui-selected, &.Mui-selected:hover': {
                    color: 'primary',
                    borderColor: (theme) => alpha(theme.palette.primary.main, 0.5),
                    backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.12),
                  },
                }}
                data-testid={`uni-prompt-language-${option}`}
              >
                {option}
              </ToggleButton>
            ))}
          </Box>
        )}
      </Paper>
      {languages.length > 0 && <StatusAnnouncer message={language ? t('accessibility:languageSelected', { name: prompt.name }) : ''} />}

      {isTemplate && <CopyPromptMenu prompt={prompt} targets={copyTargets} anchorEl={copyAnchor} onClose={() => setCopyAnchor(null)} onCopied={onCopied} />}
    </>
  )
}

const CardGrid = ({
  groups,
  onSelect,
  copyTargets,
  onCopied,
}: {
  groups: UniversityPromptGroup[]
  onSelect: (prompt: Prompt) => void
  copyTargets: CoursesViewCourse[]
  onCopied: (course?: CoursesViewCourse) => void
}) => (
  <Box sx={{ display: 'grid', gap: 1.25, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))' }}>
    {groups.map((group) => (
      <UniversityPromptCard key={group.id} group={group} onSelect={onSelect} copyTargets={copyTargets} onCopied={onCopied} />
    ))}
  </Box>
)

const SectionLabel = ({ children }: { children: string }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mt: 3, mb: 1.5 }}>
    <Typography
      variant="overline"
      component="h2"
      sx={{ fontWeight: 500, letterSpacing: '0.09em', lineHeight: 1, color: 'text.secondary', whiteSpace: 'nowrap' }}
    >
      {children}
    </Typography>
    <Box sx={{ flex: 1, height: '1px', backgroundColor: 'divider' }} />
  </Box>
)

const UniversityPromptGallery = ({
  onSelect,
  copyTargets,
  onCopied,
}: {
  onSelect: (prompt: Prompt) => void
  copyTargets: CoursesViewCourse[]
  onCopied: (course?: CoursesViewCourse) => void
}) => {
  const { t } = useTranslation()
  const { groups, isLoading } = useUniversityPrompts()

  if (isLoading) return null

  const withPrompts = groups.filter((group) => group.prompts.length > 0)
  const universityGroups = withPrompts.filter((group) => group.prompts[0].type === 'UNIVERSITY')
  const templateGroups = withPrompts.filter((group) => group.prompts[0].type === 'TEMPLATE')

  if (withPrompts.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', color: 'text.secondary' }}>
        <Typography>{t('uniPrompts:galleryEmpty')}</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ overflowY: 'auto', pr: 1 }} data-testid="uni-prompt-gallery">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mt: 1 }}>
        <AccountBalanceIcon color="primary" fontSize="large" />
        <Typography variant="h4" component="h1" fontWeight="bold" sx={{ wordBreak: 'break-word', hyphens: 'auto' }}>
          {t('uniPrompts:galleryNav')}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 620 }}>
        {t('uniPrompts:galleryHelp')}
      </Typography>

      {universityGroups.length > 0 && (
        <>
          <SectionLabel>{t('uniPrompts:sectionReady')}</SectionLabel>
          <CardGrid groups={universityGroups} onSelect={onSelect} copyTargets={copyTargets} onCopied={onCopied} />
        </>
      )}

      {templateGroups.length > 0 && (
        <Box sx={{ mt: 3, p: 2.5, borderRadius: '10px', border: '1px solid', borderColor: 'divider', backgroundColor: 'background.subtle' }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 1.5, mb: 1.75 }}>
            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
              {t('uniPrompts:sectionTemplates')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('uniPrompts:sectionTemplatesHelp')}
            </Typography>
          </Box>
          <CardGrid groups={templateGroups} onSelect={onSelect} copyTargets={copyTargets} onCopied={onCopied} />
        </Box>
      )}
    </Box>
  )
}

export default UniversityPromptGallery
