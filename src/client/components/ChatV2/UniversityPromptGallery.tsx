import { Box, Collapse, Paper, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import ExpandMore from '@mui/icons-material/ExpandMore'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { alpha } from '@mui/material/styles'

import type { CoursesViewCourse } from '../../hooks/useUserCourses'
import useUniversityPrompts, { groupLanguages, type UniversityPromptGroup } from '../../hooks/useUniversityPrompts'
import type { Prompt, PromptLanguage } from '../../types'
import { monospaceStyle } from '../../theme'
import { BlueButton, OutlineButtonBlue, TextButton } from './general/Buttons.tsx'
import CopyPromptMenu from './CopyPromptMenu.tsx'

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
  // Ephemeral on purpose: the choice is per card and per visit, never persisted.
  const [language, setLanguage] = useState<PromptLanguage | undefined>(() => defaultLanguage(languages, i18n.language))
  const [showSystemMessage, setShowSystemMessage] = useState(false)
  const [copyAnchor, setCopyAnchor] = useState<HTMLElement | null>(null)

  const prompt = group.prompts.find((p) => p.language === language) ?? group.prompts[0]

  if (!prompt) return null

  const isTemplate = prompt.type === 'TEMPLATE'

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2.5, borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: 1.5 }}
      data-testid={`uni-prompt-card-${prompt.name}`}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Typography variant="h6" fontWeight="bold" sx={{ wordBreak: 'break-word', minWidth: 0 }}>
          {prompt.name}
        </Typography>
        {languages.length > 1 && (
          <ToggleButtonGroup
            size="small"
            exclusive
            value={language}
            onChange={(_event, value) => {
              if (value) setLanguage(value as PromptLanguage)
            }}
            aria-label={t('uniPrompts:selectLanguage')}
            sx={{ flexShrink: 0 }}
            data-testid={`uni-prompt-languages-${group.id}`}
          >
            {languages.map((option) => (
              <ToggleButton key={option} value={option} sx={{ px: 1, py: 0.25, textTransform: 'uppercase' }} data-testid={`uni-prompt-language-${option}`}>
                {option}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        )}
      </Box>

      {prompt.userInstructions && (
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {prompt.userInstructions}
        </Typography>
      )}

      <Box>
        <TextButton
          size="small"
          onClick={() => setShowSystemMessage((open) => !open)}
          startIcon={showSystemMessage ? <ExpandLess /> : <ExpandMore />}
          data-testid="uni-prompt-toggle-system-message"
        >
          {showSystemMessage ? t('uniPrompts:hideSystemMessage') : t('uniPrompts:showSystemMessage')}
        </TextButton>
        <Collapse in={showSystemMessage} unmountOnExit>
          <Paper sx={{ p: 2, mt: 1, maxHeight: 240, overflow: 'auto', backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08) }}>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.primary', ...monospaceStyle }}>
              {prompt.systemMessage || '—'}
            </Typography>
          </Paper>
        </Collapse>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 'auto' }}>
        {isTemplate ? (
          <>
            <OutlineButtonBlue size="small" startIcon={<ContentCopyOutlined />} onClick={(e) => setCopyAnchor(e.currentTarget)} data-testid="uni-prompt-copy">
              {t('uniPrompts:copyTo')}
            </OutlineButtonBlue>
            <CopyPromptMenu prompt={prompt} targets={copyTargets} anchorEl={copyAnchor} onClose={() => setCopyAnchor(null)} onCopied={onCopied} />
          </>
        ) : (
          <BlueButton size="small" variant="contained" onClick={() => onSelect(prompt)} data-testid="uni-prompt-select">
            {t('settings:choosePrompt')}
          </BlueButton>
        )}
      </Box>
    </Paper>
  )
}

const GallerySection = ({
  title,
  description,
  groups,
  onSelect,
  copyTargets,
  onCopied,
}: {
  title: string
  description: string
  groups: UniversityPromptGroup[]
  onSelect: (prompt: Prompt) => void
  copyTargets: CoursesViewCourse[]
  onCopied: (course?: CoursesViewCourse) => void
}) => {
  if (groups.length === 0) return null

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" fontWeight="bold">
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {description}
      </Typography>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {groups.map((group) => (
          <UniversityPromptCard key={group.id} group={group} onSelect={onSelect} copyTargets={copyTargets} onCopied={onCopied} />
        ))}
      </Box>
    </Box>
  )
}

/**
 * The gallery pane of the prompt modal. University groups are selected and
 * chatted with; template groups are only ever copied. The split is behavioural
 * and enforced server-side too — the UI simply never offers the wrong action.
 */
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
      <GallerySection
        title={t('uniPrompts:sectionUniversity')}
        description={t('uniPrompts:sectionUniversityHelp')}
        groups={universityGroups}
        onSelect={onSelect}
        copyTargets={copyTargets}
        onCopied={onCopied}
      />
      <GallerySection
        title={t('uniPrompts:sectionTemplates')}
        description={t('uniPrompts:sectionTemplatesHelp')}
        groups={templateGroups}
        onSelect={onSelect}
        copyTargets={copyTargets}
        onCopied={onCopied}
      />
    </Box>
  )
}

export default UniversityPromptGallery
