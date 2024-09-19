import React, { useState } from 'react'
import { Box, IconButton, Snackbar } from '@mui/material'
import ContentCopy from '@mui/icons-material/ContentCopy'

interface CopyToClipboardButtonProps {
  copied: string
  id: string
}

const CopyToClipboardButton: React.FC<CopyToClipboardButtonProps> = ({
  copied,
  id,
}) => {
  const [open, setOpen] = useState(false)

  const handleClick = () => {
    setOpen(true)

    const innerHtml = document.getElementById(id).innerHTML
    const blobHtml = new Blob([innerHtml], { type: 'text/html' })
    const blobText = new Blob([copied], { type: 'text/plain' })
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
      <IconButton onClick={handleClick} color="primary">
        <ContentCopy />
      </IconButton>
      <Snackbar
        message="Copied to clipboard"
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        autoHideDuration={2000}
        onClose={() => setOpen(false)}
        open={open}
      />
    </Box>
  )
}

export default CopyToClipboardButton
