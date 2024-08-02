import React from 'react'
import { Button } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'

interface AttachmentButtonProps {
  fileName: string
  handleDeleteFile: () => void
}

const AttachmentButton: React.FC<AttachmentButtonProps> = ({
  fileName,
  handleDeleteFile,
}) => {
  const maxLength = 30
  const displayName =
    fileName.length > maxLength
      ? `${fileName.substring(0, maxLength)}...`
      : fileName

  return (
    <Button onClick={() => handleDeleteFile()} endIcon={<DeleteIcon />}>
      {displayName}
    </Button>
  )
}

export default AttachmentButton
