import React, { useState } from 'react'
import { Box, IconButton, Tooltip } from '@mui/material'
import ContentCopy from '@mui/icons-material/ContentCopy'
import { useTranslation } from 'react-i18next'
import { announceToScreenReader } from '../common/accessibility/SnackbarAnnouncer'

interface CopyToClipboardButtonProps {
  copied: string
  id: string
  iconColor?: string
  buttonStyle?: React.CSSProperties
  label?: string
}

const CopyToClipboardButton: React.FC<CopyToClipboardButtonProps> = ({ copied, id, iconColor = 'primary', buttonStyle, label }) => {
  const { t } = useTranslation()
  const [tooltipMessage, setTooltipMessage] = useState(t('chat:copyToClipboard'))
  const ariaLabel = label ? t('accessibility:copyToClipboard', { item: label }) : t('chat:copyToClipboard')

  const handleClick = () => {
    const element = document.getElementById(id)
    if (!element) return

    setTooltipMessage(t('tooltip:copied'))

    const blobHtml = new Blob([element.innerHTML], {
      type: 'text/html',
    })
    const blobText = new Blob([copied], { type: 'text/plain' })
    const data = [
      new ClipboardItem({
        'text/plain': blobText,
        'text/html': blobHtml,
      }),
    ]
    navigator.clipboard.write(data).then(() => announceToScreenReader(t('tooltip:copied')))

    setTimeout(() => {
      setTooltipMessage(t('chat:copyToClipboard'))
    }, 2000)
  }

  return (
    <Box>
      <Tooltip title={tooltipMessage} arrow leaveDelay={0} enterTouchDelay={300}>
        <IconButton
          aria-label={ariaLabel}
          onClick={handleClick}
          style={{
            ...buttonStyle,
            opacity: '0.7',
          }}
        >
          <ContentCopy sx={{ color: iconColor }} />
        </IconButton>
      </Tooltip>
    </Box>
  )
}

export default CopyToClipboardButton
