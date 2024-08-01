import React, { useState } from 'react'
import { Box, IconButton, Snackbar } from '@mui/material'
import ContentCopy from '@mui/icons-material/ContentCopy'

interface CopyToClipboardButtonProps {
  copied: string
}

const CopyToClipboardButton: React.FC<CopyToClipboardButtonProps> = ({
  copied,
}) => {
  const [open, setOpen] = useState(false)

  const handleClick = () => {
    setOpen(true)
    navigator.clipboard.writeText(copied)
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
