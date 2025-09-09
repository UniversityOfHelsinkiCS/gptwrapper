import React from 'react'
import { useTranslation } from 'react-i18next'
import { MenuItem, Typography, Menu } from '@mui/material'
import { KeyboardArrowDown, SmartToy } from '@mui/icons-material'
import { FREE_MODEL, inProduction, ValidModelName, validModels } from '@config'
import { OutlineButtonBlack } from './general/Buttons'
import { usePromptState } from './PromptState'
import useCurrentUser from '../../hooks/useCurrentUser'

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
    return models.filter((model) => !isTokenLimitExceeded || model === FREE_MODEL).filter((model) => user?.isAdmin || !inProduction || model !== 'mock')
  }, [isTokenLimitExceeded, user, activePrompt])

  return (
    <>
      <OutlineButtonBlack
        startIcon={<SmartToy />}
        endIcon={<KeyboardArrowDown />}
        onClick={handleClick}
        data-testid="model-selector"
        disabled={availableModels.length === 1}
      >
        {`${t('admin:model')}: ${currentModel}`}
      </OutlineButtonBlack>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        slotProps={{
          paper: {
            style: {
              minWidth: anchorEl?.offsetWidth || 200,
            },
          },
        }}
      >
        {availableModels.map((model) => (
          <MenuItem key={model} value={model} onClick={() => handleSelect(model)} data-testid={`${model}-option`}>
            <Typography>
              {model}
              {model === FREE_MODEL && (
                <Typography component="span" sx={{ fontStyle: 'italic', opacity: 0.8 }}>
                  {' '}
                  ({t('chat:freeModel')})
                </Typography>
              )}
              {isTokenLimitExceeded && model !== FREE_MODEL && (
                <Typography component="span" sx={{ fontStyle: 'italic', opacity: 0.8 }}>
                  {' '}
                  {t('chat:modelDisabled')}
                </Typography>
              )}
            </Typography>
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

export default ModelSelector
