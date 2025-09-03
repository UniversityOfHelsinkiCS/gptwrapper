import React from 'react'
import { useTranslation } from 'react-i18next'
import { MenuItem, Typography, Tooltip, Menu } from '@mui/material'
import { KeyboardArrowDown, SmartToy } from '@mui/icons-material'
import { FREE_MODEL, ValidModelName } from '../../../config'
import { OutlineButtonBlack } from './general/Buttons'

const ModelSelector = ({
  currentModel,
  setModel,
  availableModels,
  isTokenLimitExceeded,
}: {
  currentModel: ValidModelName
  setModel: (model: ValidModelName) => void
  availableModels: ValidModelName[]
  isTokenLimitExceeded: boolean
}) => {
  const { t } = useTranslation()
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  const validModel = availableModels.includes(currentModel) ? currentModel : ''

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleSelect = (model: ValidModelName) => {
    setModel(model)
    setAnchorEl(null)
  }

  return (
    <>
      <OutlineButtonBlack startIcon={<SmartToy />} endIcon={<KeyboardArrowDown />} onClick={handleClick} data-testid="model-selector">
        {`${t('admin:model')}: ${validModel}`}
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
          <MenuItem
            key={model}
            value={model}
            onClick={() => handleSelect(model)}
            disabled={isTokenLimitExceeded && model !== FREE_MODEL}
            data-testid={`${model}-option`}
          >
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
