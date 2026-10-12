import React from 'react'
import { useTranslation } from 'react-i18next'
import { FREE_MODEL, getModelDisplayName, inProduction, isMockModel, ModelConfig, ValidModelName, validModels } from '@config'
import { Box, Chip, MenuItem, Typography, Menu, ListSubheader } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import PsychologyIcon from '@mui/icons-material/Psychology'
import { usePromptState } from './PromptState'
import useCurrentUser from '../../hooks/useCurrentUser'
import { visuallyHidden } from '@mui/utils'

const filterAvailableModels = (models: ModelConfig[], isTokenLimitExceeded: boolean, isAdmin: boolean | undefined): ModelConfig[] => {
  return models
    .filter((model) => !isTokenLimitExceeded || model.name === FREE_MODEL)
    .filter((model) => !isMockModel(model.name) || !inProduction || isAdmin)
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
  const open = Boolean(anchorEl)
  const { user } = useCurrentUser()
  const { activePrompt } = usePromptState()

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleSelect = (model: ValidModelName) => {
    setModel(model)
    setAnchorEl(null)
  }

  const availableModels = React.useMemo(
    () => filterAvailableModels(validModels, isTokenLimitExceeded, user?.isAdmin),
    [isTokenLimitExceeded, user, activePrompt],
  )

  const disabled = availableModels.length === 1

  const isFree = (model: string) => model === FREE_MODEL

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
        {isFree(currentModel) && (
          <Chip
            label={t('chat:freeModel')}
            size="small"
            color="success"
            sx={{
              height: 18,
              fontSize: '0.65rem',
              fontWeight: 600,
              letterSpacing: '0.03em',
              '& .MuiChip-label': { px: 0.75 },
            }}
          />
        )}
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
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{
          list: { 'aria-label': t('sidebar:modelTitle') },
          paper: {
            style: {
              minWidth: 260,
              borderRadius: '0.75rem',
              marginTop: '-8px',
            },
          },
        }}
      >
        <ListSubheader sx={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, letterSpacing: '0.1em', color: 'text.disabled' }}>
          {t('sidebar:modelTitle')}
        </ListSubheader>

        {availableModels.map(({ name, displayName, descriptionKey }) => {
          const active = name === currentModel
          return (
            <MenuItem
              key={name}
              value={name}
              onClick={() => handleSelect(name)}
              data-testid={`${name}-option`}
              selected={active}
              role="menuitemradio"
              aria-checked={active}
              aria-label={[displayName, descriptionKey && t(descriptionKey), isFree(name) && t('chat:freeModel')].filter(Boolean).join(', ')}
              sx={{ gap: 1, py: 1, px: 1.75, alignItems: 'flex-start', mt: 1 }}
            >
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                <Typography sx={{ fontSize: '0.875rem', fontWeight: active ? 600 : 400 }}>{displayName}</Typography>
                {descriptionKey && <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.3 }}>{t(descriptionKey)}</Typography>}
              </Box>
              {isFree(name) && (
                <Chip
                  label={t('chat:freeModel')}
                  size="small"
                  color="success"
                  sx={{
                    height: 18,
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    letterSpacing: '0.03em',
                    '& .MuiChip-label': { px: 0.75 },
                  }}
                />
              )}
              {active && <CheckIcon sx={{ fontSize: 16, color: 'primary.main' }} />}
            </MenuItem>
          )
        })}
      </Menu>
    </>
  )
}

export default ModelSelector
