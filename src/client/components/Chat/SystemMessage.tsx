import React from 'react'
import { Box, TextField, } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { Set } from '../../types'

const SystemMessage = ({
  system,
  setSystem,
  disabled,
}: {
  system: string
  setSystem: Set<string>
  disabled: boolean
}) => {
  const { t } = useTranslation()

  return (
    <Box mb={2}>
      <TextField
        fullWidth
        multiline
        minRows={1}
        value={system}
        onChange={(e) => setSystem(e.target.value)}
        placeholder={t('chat:exampleSystemMessage') as string}
        disabled={disabled}
      />
    </Box>
  )
}

export default SystemMessage
