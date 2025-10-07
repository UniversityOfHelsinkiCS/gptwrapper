import { useTranslation } from 'react-i18next'
import { Box, MenuItem, Menu, Typography } from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { useState } from 'react'
import { RagIndexAttributes } from '../../../shared/types'
import { OutlineButtonBlack } from './general/Buttons'
import MenuBook from '@mui/icons-material/MenuBook'
import MenuBookTwoTone from '@mui/icons-material/MenuBookTwoTone'

const RagSelector = ({
  currentRagIndex,
  setRagIndex,
  ragIndices,
}: {
  currentRagIndex?: RagIndexAttributes
  setRagIndex: (ragIndex: number | undefined) => void
  ragIndices: RagIndexAttributes[]
}) => {
  const { t } = useTranslation()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const displayText = currentRagIndex ? currentRagIndex.metadata.name : t('settings:selectedSource')

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleSelect = (ragIndexId: number | undefined) => {
    setRagIndex(ragIndexId)

    handleClose()
  }

  return (
    <Box mb={2}>
      <OutlineButtonBlack
        endIcon={<KeyboardArrowDownIcon />}
        onClick={handleClick}
        sx={{
          width: '100%',
          justifyContent: 'space-between',
        }}
        id="rag-index-selector"
      >
        {displayText}
      </OutlineButtonBlack>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{
          paper: {
            style: {
              minWidth: anchorEl?.offsetWidth || 200,
            },
          },
        }}
      >
        <MenuItem onClick={() => handleSelect(undefined)}>{t('settings:selectedSource')}</MenuItem>
        {ragIndices.map((ragIndex) => (
          <MenuItem key={ragIndex.id} onClick={() => handleSelect(ragIndex.id)}>
            {ragIndex.metadata.name}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  )
}

export const RagSelectorDescription = () => {
  const { t } = useTranslation()

  return (
    <>
      <Typography variant="h6" sx={{ mb: 1, display: 'flex', gap: 1, alignItems: 'center' }} fontWeight="bold">
        <MenuBookTwoTone />
        {t('chat:sources')}
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        {t('settings:sourceDescription')}
      </Typography>
    </>
  )
}

export default RagSelector
