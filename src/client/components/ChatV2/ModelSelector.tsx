import { useTranslation } from 'react-i18next'
import { MenuItem, FormControl, Select, SelectChangeEvent, Typography, Tooltip } from '@mui/material'
import { FREE_MODEL } from '../../../config'
import { KeyCombinations } from './useKeyboardCommands'
import React from 'react'

const ModelSelector = ({
  currentModel,
  setModel,
  availableModels,
  isTokenLimitExceeded,
  isOpen,
  setIsOpen,
}: {
  currentModel: string
  setModel: (model: string) => void
  availableModels: string[]
  isTokenLimitExceeded: boolean
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}) => {
  const { t } = useTranslation()
  const selectRef = React.useRef<HTMLSelectElement>(null)

  /**
   * Extra tooltip logic because kb shortcut focusing would leave the tooltip annoyingly open without this.
   */
  const [tooltipOpen, setTooltipOpen] = React.useState(false)
  const validModel = availableModels.includes(currentModel) ? currentModel : ''

  return (
    <FormControl
      sx={{
        minWidth: 100,
        maxWidth: { xs: 60, md: 250 },
        opacity: 0.7,
      }}
      size="small"
    >
      <Tooltip
        title={t('chat:modelSelectorTooltip', { hint: KeyCombinations.OPEN_MODEL_SELECTOR?.hint })}
        arrow
        placement="top"
        disableFocusListener
        disableHoverListener
        onPointerEnter={() => setTooltipOpen(true)}
        onFocus={() => setTooltipOpen(true)}
        onBlur={() => setTooltipOpen(false)}
        onPointerLeave={() => setTooltipOpen(false)}
        ref={selectRef}
        open={tooltipOpen}
      >
        <Select
          ref={selectRef}
          open={isOpen}
          onOpen={() => {
            setIsOpen(true)
            setTooltipOpen(true)
          }}
          onClose={(event) => {
            event.stopPropagation()
            setTooltipOpen(false)
            selectRef.current?.blur()
            setIsOpen(false)
          }}
          sx={{
            '& .MuiOutlinedInput-notchedOutline': {
              border: 'none',
            },
            '& .MuiSelect-select': {
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              paddingLeft: { xs: '4px !important', md: '10px !important' },
              paddingRight: { xs: '20px !important', md: '30px !important' },
              maxWidth: { xs: '50px', md: '240px' },
              transition: 'background-color 0.3s ease',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
              '&:focus': {
                backgroundColor: 'action.focus',
              },
            },
          }}
          data-testid="model-selector"
          value={validModel}
          onChange={(event: SelectChangeEvent) => setModel(event.target.value)}
        >
          {availableModels.map((model) => (
            <MenuItem key={model} value={model} disabled={isTokenLimitExceeded && model !== FREE_MODEL}>
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
                    ({t('chat:modelDisabled')})
                  </Typography>
                )}
              </Typography>
            </MenuItem>
          ))}
        </Select>
      </Tooltip>
    </FormControl>
  )
}

export default ModelSelector
