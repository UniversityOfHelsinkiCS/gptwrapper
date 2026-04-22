import React from 'react'
import { useTranslation } from 'react-i18next'
import { FREE_MODEL, inProduction, isAdminOnlyModel, ValidModelName, validModels } from '@config'
import { Box, Chip, MenuItem, Typography, Menu, alpha } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import { usePromptState } from './PromptState'
import useCurrentUser from '../../hooks/useCurrentUser'

const filterAvailableModels = (models: ValidModelName[], isTokenLimitExceeded: boolean, isAdmin: boolean | undefined): ValidModelName[] => {
  return models.filter((model) => !isTokenLimitExceeded || model === FREE_MODEL).filter((model) => isAdmin || !inProduction || !isAdminOnlyModel(model))
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

  const availableModels = React.useMemo(() => {
    if (activePrompt?.model) {
      return [activePrompt.model]
    }
    const models = validModels.map((model) => model.name)
    return filterAvailableModels(models, isTokenLimitExceeded, user?.isAdmin)
  }, [isTokenLimitExceeded, user, activePrompt])

  const displayModel = activePrompt?.model ?? currentModel
  const disabled = availableModels.length === 1

  const isFree = (model: string) => model === FREE_MODEL

  return (
    <>
      <Box
        component="button"
        type="button"
        onClick={disabled ? undefined : handleClick}
        disabled={disabled}
        data-testid="model-selector"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          padding: '4px 8px 4px 10px',
          borderRadius: 999,
          border: '1px solid',
          borderColor: open ? 'divider' : 'transparent',
          backgroundColor: (theme) => (open ? alpha(theme.palette.text.primary, 0.09) : alpha(theme.palette.text.primary, 0.055)),
          cursor: disabled ? 'default' : 'pointer',
          fontFamily: 'inherit',
          transition: 'background-color 0.12s, border-color 0.12s',
          '&:hover': {
            backgroundColor: (theme) => (disabled ? alpha(theme.palette.text.primary, 0.055) : alpha(theme.palette.text.primary, 0.08)),
          },
          '&:disabled': {
            opacity: 0.7,
          },
        }}
      >
        <SmartToyIcon sx={{ fontSize: 14, color: 'primary.main' }} />
        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'text.primary', lineHeight: 1 }}>{displayModel}</Typography>
        {isFree(displayModel) && (
          <Chip
            label={t('chat:freeModel')}
            size="small"
            sx={{
              height: 18,
              fontSize: '0.65rem',
              fontWeight: 600,
              letterSpacing: '0.03em',
              color: 'success.main',
              backgroundColor: (theme) => alpha(theme.palette.success.main, 0.12),
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
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{
          paper: {
            style: {
              minWidth: 260,
              borderRadius: '0.75rem',
              marginTop: '-8px',
            },
          },
        }}
      >
        <Typography
          variant="overline"
          sx={{ display: 'block', px: 1.75, pt: 0.5, pb: 1, fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.1em', color: 'text.disabled' }}
        >
          {t('sidebar:modelTitle')}
        </Typography>
        {availableModels.map((model) => {
          const active = model === displayModel
          return (
            <MenuItem key={model} value={model} onClick={() => handleSelect(model)} data-testid={`${model}-option`} sx={{ gap: 1, py: 1, px: 1.75 }}>
              <Typography sx={{ flex: 1, fontSize: '0.875rem', fontWeight: active ? 600 : 400 }}>{model}</Typography>
              {isFree(model) && (
                <Chip
                  label={t('chat:freeModel')}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    letterSpacing: '0.03em',
                    color: 'success.main',
                    backgroundColor: (theme) => alpha(theme.palette.success.main, 0.12),
                    '& .MuiChip-label': { px: 0.75 },
                  }}
                />
              )}
              {isTokenLimitExceeded && !isFree(model) && (
                <Typography component="span" sx={{ fontStyle: 'italic', opacity: 0.8, fontSize: '0.75rem' }}>
                  {t('chat:modelDisabled')}
                </Typography>
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
