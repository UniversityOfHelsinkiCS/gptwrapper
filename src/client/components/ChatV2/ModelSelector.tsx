import React from 'react'
import { useTranslation } from 'react-i18next'
import { getModelDisplayName, inProduction, isFreeModel, isMockModel, ModelConfig, ValidModelName, validModels } from '@config'
import { Box, Chip, Divider, MenuItem, Typography, Menu, ListSubheader } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import PsychologyIcon from '@mui/icons-material/Psychology'
import { usePromptState } from './PromptState'
import useCurrentUser from '../../hooks/useCurrentUser'
import { visuallyHidden } from '@mui/utils'

const tagChipSx = {
  height: 18,
  display: 'flex',
  flexShrink: 0,
  fontSize: '0.75rem',
  fontWeight: 500,
  letterSpacing: '0.03em',
  '& .MuiChip-label': { px: 0.75 },
}

const filterAvailableModels = (models: ModelConfig[], isTokenLimitExceeded: boolean, isAdmin: boolean | undefined): ModelConfig[] => {
  return models.filter((model) => !isTokenLimitExceeded || isFreeModel(model.name)).filter((model) => !isMockModel(model.name) || !inProduction || isAdmin)
}

const ModelSelector = ({
  currentModel,
  setModel,
  isTokenLimitExceeded,
}: {
  currentModel: ValidModelName
  setModel: (model: ValidModelName) => void
  isTokenLimitExceeded: boolean
}) => {
  const { t } = useTranslation()
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const [moreAnchorEl, setMoreAnchorEl] = React.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  const moreOpen = Boolean(moreAnchorEl)
  const { user } = useCurrentUser()
  const { activePrompt } = usePromptState()

  const { availableModels, mainModels, moreModels } = React.useMemo(() => {
    const availableModels = filterAvailableModels(validModels, isTokenLimitExceeded, user?.isAdmin)
    return {
      availableModels,
      mainModels: availableModels.filter((model) => !model.tags.includes('more')),
      moreModels: availableModels.filter((model) => model.tags.includes('more')),
    }
  }, [isTokenLimitExceeded, user, activePrompt])

  const isCurrentInMore = moreModels.some((model) => model.name === currentModel)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setMoreAnchorEl(null)
    setAnchorEl(null)
  }

  const handleSelect = (model: ValidModelName) => {
    setModel(model)
    handleClose()
  }

  const disabled = availableModels.length === 1

  const isCurrentFree = isFreeModel(currentModel)

  const renderOption = (model: ModelConfig) => {
    const { name, displayName, descriptionKey, tags } = model
    const active = name === currentModel
    const description = descriptionKey && t(descriptionKey)
    const selfHostedLabel = tags.includes('local') && t('chat:selfHostedModel')
    const freeLabel = isFreeModel(name) && t('chat:freeModel')
    return (
      <MenuItem
        key={name}
        value={name}
        onClick={() => handleSelect(name)}
        data-testid={`${name}-option`}
        selected={active}
        role="menuitemradio"
        aria-checked={active}
        aria-label={[displayName, description, selfHostedLabel, freeLabel].filter(Boolean).join(', ')}
        sx={{ gap: 1, py: 1, px: 1.75, alignItems: 'flex-start', mt: 1 }}
      >
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.25, whiteSpace: 'normal' }}>
          <Typography sx={{ fontSize: '0.875rem', fontWeight: active ? 600 : 400 }}>{displayName}</Typography>
          {description && <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.3 }}>{description}</Typography>}
        </Box>
        {selfHostedLabel && <Chip label={selfHostedLabel} size="small" variant="outlined" sx={tagChipSx} />}
        {freeLabel && <Chip label={freeLabel} size="small" color="success" sx={tagChipSx} />}
        {active && <CheckIcon sx={{ fontSize: 16, color: 'primary.main' }} />}
      </MenuItem>
    )
  }

  const menuPaperStyle = { minWidth: 260, borderRadius: '0.75rem' }

  return (
    <>
      <Box
        component="button"
        type="button"
        onClick={disabled ? undefined : handleClick}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? 'model-selector-menu' : undefined}
        data-testid="model-selector"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          padding: '4px 8px 4px 10px',
          borderRadius: 999,
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          cursor: disabled ? 'default' : 'pointer',
          fontFamily: 'inherit',
          transition: 'background-color 0.12s, border-color 0.12s',
          '&:hover': {
            backgroundColor: 'background.default',
          },
          '&:disabled': {
            opacity: 0.7,
          },
        }}
      >
        <PsychologyIcon sx={{ fontSize: 14, color: 'primary.main' }} />
        <Typography sx={visuallyHidden}>{t('accessibility:selectModel')}</Typography>
        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'text.primary', lineHeight: 1 }}>{getModelDisplayName(currentModel)}</Typography>
        {isCurrentFree && <Chip label={t('chat:freeModel')} size="small" color="success" sx={tagChipSx} />}
        {!disabled &&
          (open ? (
            <ExpandLessIcon sx={{ fontSize: 16, color: 'text.secondary', ml: -0.25 }} />
          ) : (
            <ExpandMoreIcon sx={{ fontSize: 16, color: 'text.secondary', ml: -0.25 }} />
          ))}
      </Box>
      <Menu
        id="model-selector-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{
          list: { 'aria-label': t('sidebar:modelTitle') },
          paper: { style: { ...menuPaperStyle, marginTop: '-8px' } },
        }}
      >
        <ListSubheader sx={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, letterSpacing: '0.1em', color: 'text.secondary' }}>
          {t('sidebar:modelTitle')}
        </ListSubheader>

        {mainModels.map((model) => renderOption(model))}

        {moreModels.length > 0 && [
          <Divider key="more-divider" />,
          <MenuItem
            key="more-toggle"
            onClick={(event) => setMoreAnchorEl(event.currentTarget)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') {
                event.preventDefault()
                setMoreAnchorEl(event.currentTarget)
              }
            }}
            selected={isCurrentInMore}
            aria-haspopup="menu"
            aria-expanded={moreOpen}
            aria-controls={moreOpen ? 'more-models-menu' : undefined}
            data-testid="more-models-toggle"
            sx={{ gap: 1, py: 1, px: 1.75, alignItems: 'center', color: 'primary.main' }}
          >
            <Typography sx={{ flex: 1, fontSize: '0.8125rem', fontWeight: 600 }}>{t('chat:moreModels')}</Typography>
            <ChevronRightIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          </MenuItem>,
        ]}
      </Menu>
      <Menu
        id="more-models-menu"
        anchorEl={moreAnchorEl}
        open={moreOpen}
        onClose={() => setMoreAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          list: {
            'aria-label': t('chat:moreModels'),
            onKeyDown: (event: React.KeyboardEvent) => {
              if (event.key === 'ArrowLeft') {
                event.preventDefault()
                setMoreAnchorEl(null)
              }
            },
          },
          paper: { style: { ...menuPaperStyle, marginLeft: '4px' } },
        }}
      >
        {moreModels.map(renderOption)}
      </Menu>
    </>
  )
}

export default ModelSelector
