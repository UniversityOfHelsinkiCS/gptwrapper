import React from 'react'
import { useTranslation } from 'react-i18next'
import { getModelDisplayName, inProduction, isFreeModel, isMockModel, ModelConfig, ValidModelName, validModels } from '@config'
import { Box, Chip, Divider, MenuItem, Typography, Menu, ListSubheader, useMediaQuery } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import PsychologyIcon from '@mui/icons-material/Psychology'
import { usePromptState } from './PromptState'
import useCurrentUser from '../../hooks/useCurrentUser'
import { visuallyHidden } from '@mui/utils'
import { useIsEmbedded } from '../../contexts/EmbeddedContext'
import { focusIndicatorStyle } from '../../util/accessibility'
import { modelPriceIndicator, PRICE_BASELINE_MODEL } from '@shared/usage'

const tagChipSx = {
  height: 18,
  display: 'flex',
  flexShrink: 0,
  fontSize: '0.75rem',
  fontWeight: 500,
  letterSpacing: '0.03em',
  '& .MuiChip-label': { px: 0.75 },
}

const priceIndicatorSx = {
  fontSize: '0.75rem',
  lineHeight: '18px',
  whiteSpace: 'nowrap',
  fontVariantNumeric: 'tabular-nums',
  color: 'text.secondary',
  '&::after': { content: 'attr(data-price)' },
} as const

const isPointerOver = (element: Element | null | undefined, { clientX, clientY }: React.MouseEvent) => {
  const rect = element?.getBoundingClientRect()
  return !!rect && clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
}

const filterAvailableModels = (models: ModelConfig[], isTokenLimitExceeded: boolean, isAdmin: boolean | undefined): ModelConfig[] => {
  return models
    .filter((model) => !model.tags.includes('internal'))
    .filter((model) => !isTokenLimitExceeded || isFreeModel(model.name))
    .filter((model) => !isMockModel(model.name) || !inProduction || isAdmin)
}

const ModelSelector = ({
  currentModel,
  setModel,
  isTokenLimitExceeded,
  isMobile,
}: {
  currentModel: ValidModelName
  setModel: (model: ValidModelName) => void
  isTokenLimitExceeded: boolean
  isMobile: boolean
}) => {
  const { t, i18n } = useTranslation()
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const [moreOpen, setMoreOpen] = React.useState(false)
  const menuPaperRef = React.useRef<HTMLDivElement>(null)
  const open = Boolean(anchorEl)
  const { user } = useCurrentUser()
  const { activePrompt } = usePromptState()
  const isEmbedded = useIsEmbedded()
  const sideBySide = !isMobile && !isEmbedded
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const transitionDuration = reduceMotion ? 0 : 'auto'

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
    setMoreOpen(!sideBySide && isCurrentInMore)
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setMoreOpen(false)
    setAnchorEl(null)
  }

  const handleBackdropMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    event.currentTarget.style.cursor = isPointerOver(anchorEl, event) ? 'pointer' : ''
  }

  const handleSelect = (model: ValidModelName) => {
    setModel(model)
    handleClose()
  }

  const disabled = availableModels.length === 1

  const isCurrentFree = isFreeModel(currentModel)

  const renderOption = (model: ModelConfig, nested = false) => {
    const { name, displayName, descriptionKey, tags } = model
    const active = name === currentModel
    const description = descriptionKey && t(descriptionKey)
    const selfHostedLabel = tags.includes('local') && t('chat:selfHostedModel')
    const freeLabel = isFreeModel(name) && t('chat:freeModel')
    const priceIndicator = modelPriceIndicator(name)
    const multiplier = priceIndicator?.multiplier.toLocaleString(i18n.language)
    const baselineName = getModelDisplayName(PRICE_BASELINE_MODEL)
    const costLabel =
      priceIndicator &&
      (priceIndicator.multiplier === 1 ? t('chat:modelCostSame', { model: baselineName }) : t('chat:modelCost', { multiplier, model: baselineName }))
    return (
      <MenuItem
        key={name}
        value={name}
        onClick={() => handleSelect(name)}
        data-testid={`${name}-option`}
        selected={active}
        role="menuitemradio"
        aria-checked={active}
        aria-label={[displayName, description, selfHostedLabel, freeLabel, costLabel].filter(Boolean).join(', ')}
        sx={{ gap: 1, py: 1, pr: 1.75, pl: nested ? 3.5 : 1.75, alignItems: 'flex-start', mt: nested ? 0 : 1, ...focusIndicatorStyle() }}
      >
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.25, whiteSpace: 'normal' }}>
          <Typography sx={{ fontSize: '0.875rem', fontWeight: active ? 600 : 400 }}>{displayName}</Typography>
          {description && <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.3 }}>{description}</Typography>}
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 18 }}>
            {selfHostedLabel && <Chip label={selfHostedLabel} size="small" variant="outlined" sx={tagChipSx} />}
            {freeLabel && <Chip label={freeLabel} size="small" color="success" sx={tagChipSx} />}
            {active && <CheckIcon sx={{ fontSize: 16, color: 'primary.main' }} />}
          </Box>
          {priceIndicator && (
            // Drawn with ::after so the text is not part of the option's visible text, which axe's label-in-name check
            // compares with the aria-label. The cost is in the aria-label as a sentence instead.
            <Box
              component="span"
              aria-hidden
              data-testid={`${name}-price`}
              data-price={`${'●'.repeat(priceIndicator.dots)} ×${multiplier}`}
              sx={priceIndicatorSx}
            />
          )}
        </Box>
      </MenuItem>
    )
  }

  const menuPaperStyle = { minWidth: 260, borderRadius: '0.75rem' }
  const MoreToggleIcon = sideBySide ? ChevronRightIcon : moreOpen ? ExpandLessIcon : ExpandMoreIcon
  const currentDisplayName = getModelDisplayName(currentModel)
  const featuredPaper = menuPaperRef.current
  const sideMenuToggleProps = sideBySide
    ? {
        'aria-haspopup': 'menu' as const,
        'aria-controls': moreOpen ? 'more-models-menu' : undefined,
        onKeyDown: (event: React.KeyboardEvent) => {
          if (event.key === 'ArrowRight') {
            event.preventDefault()
            setMoreOpen(true)
          }
        },
      }
    : {}

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
        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'text.primary', lineHeight: 1 }}>{currentDisplayName}</Typography>
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
        transitionDuration={transitionDuration}
        slotProps={{
          list: { 'aria-label': t('sidebar:modelTitle') },
          paper: { ref: menuPaperRef, style: { ...menuPaperStyle, marginTop: '-8px' } },
          transition: { onEntering: () => isCurrentInMore && setMoreOpen(true) },
          backdrop: { onMouseMove: handleBackdropMouseMove },
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
            onClick={() => setMoreOpen((prev) => !prev)}
            {...sideMenuToggleProps}
            selected={isCurrentInMore}
            aria-label={isCurrentInMore ? t('chat:moreModelsSelected', { model: currentDisplayName }) : undefined}
            aria-expanded={moreOpen}
            data-testid="more-models-toggle"
            sx={{ gap: 1, py: 1, px: 1.75, alignItems: 'center', color: 'primary.main', ...focusIndicatorStyle() }}
          >
            <Typography sx={{ flex: 1, fontSize: '0.8125rem', fontWeight: 600 }}>{t('chat:moreModels')}</Typography>
            <MoreToggleIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          </MenuItem>,
        ]}
        {!sideBySide && moreOpen && moreModels.map((model) => renderOption(model, true))}
      </Menu>
      {sideBySide && (
        <Menu
          id="more-models-menu"
          anchorReference="anchorPosition"
          anchorPosition={
            featuredPaper
              ? { left: featuredPaper.offsetLeft + featuredPaper.offsetWidth, top: featuredPaper.offsetTop + featuredPaper.offsetHeight }
              : undefined
          }
          open={open && moreOpen}
          onClose={() => setMoreOpen(false)}
          sx={{ pointerEvents: 'none' }}
          disableEnforceFocus
          transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transitionDuration={transitionDuration}
          slotProps={{
            list: {
              'aria-label': t('chat:moreModels'),
              onKeyDown: (event: React.KeyboardEvent) => {
                if (event.key === 'ArrowLeft') {
                  event.preventDefault()
                  setMoreOpen(false)
                }
              },
            },
            paper: { style: { ...menuPaperStyle, marginLeft: '4px', pointerEvents: 'auto' } },
          }}
        >
          {moreModels.map((model) => renderOption(model))}
        </Menu>
      )}
    </>
  )
}

export default ModelSelector
