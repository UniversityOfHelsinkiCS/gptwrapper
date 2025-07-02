import React, { useState } from 'react'
import { Box, IconButton, Snackbar, Tooltip } from '@mui/material'
import ContentCopy from '@mui/icons-material/ContentCopy'
import markdownToTxt from 'markdown-to-txt'
import { useTranslation } from 'react-i18next'

interface CopyToClipboardButtonProps {
  copied: string
  id: string
  iconColor?: string
  buttonStyle?: React.CSSProperties
}

const CopyToClipboardButton: React.FC<CopyToClipboardButtonProps> = ({ copied, id, iconColor = 'primary', buttonStyle }) => {
  const [open, setOpen] = useState(false)
  const { t } = useTranslation()

  const handleClick = () => {
    const element = document.getElementById(id)
    if (!element) return
    setOpen(true)
    const blobHtml = new Blob([element.innerHTML], {
      type: 'text/html',
    })
    const blobText = new Blob([markdownToTxt(copied)], { type: 'text/plain' })
    const data = [
      new ClipboardItem({
        'text/plain': blobText,
        'text/html': blobHtml,
      }),
    ]
    navigator.clipboard.write(data)
  }

  return (
    <Box>
      <Tooltip title={t('chat:copyToClipboard')} arrow>
        <IconButton
          onClick={handleClick}
          style={{
            ...buttonStyle,
            opacity: '0.7',
          }}
        >
          <ContentCopy sx={{ color: iconColor }} />
        </IconButton>
      </Tooltip>
      <Snackbar
        message={t('tooltip:copied')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        autoHideDuration={2000}
        onClose={() => setOpen(false)}
        open={open}
      />
    </Box>
  )
}

export default CopyToClipboardButton
