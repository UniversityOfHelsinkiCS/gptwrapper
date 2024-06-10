import React from 'react'
import { Alert, Box, Button } from '@mui/material'

type TokenUsageWarningProps = {
  tokenUsageWarning: string
  handleCancel: () => void
  handleContinue: () => void
  visible: boolean
}

const TokenUsageWarning = ({
  tokenUsageWarning,
  handleCancel,
  handleContinue,
  visible,
}: TokenUsageWarningProps) => {
  if (visible) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        sx={{ my: 4 }}
      >
        <Alert severity="warning">
          {tokenUsageWarning}
          <Button
            variant="outlined"
            sx={{ mt: 2, borderRadius: '0.5rem', marginX: 2 }}
            onClick={handleCancel}
            color="primary"
            type="button"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            sx={{ mt: 2, borderRadius: '0.5rem' }}
            onClick={handleContinue}
            color="primary"
            type="button"
          >
            Continue
          </Button>
        </Alert>
      </Box>
    )
  }
  return null
}

export default TokenUsageWarning
