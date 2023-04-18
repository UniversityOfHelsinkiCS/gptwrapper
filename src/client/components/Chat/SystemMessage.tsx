import React from 'react'
import { Box, TextField, } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { Set } from '../../types'

const SystemMessage = ({
  system,
  setSystem,
}: {
  system: string
  setSystem: Set<string>
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
      />
    </Box>
  )
}

export default SystemMessage
