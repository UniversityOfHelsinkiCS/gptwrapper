import React from 'react'
import { Box, TextField, Typography, Tooltip } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { SetState } from '../../types'

const Info = ({ infoText }: { infoText: string }) => {
  const { t } = useTranslation()

  return (
    <Box mb={1}>
      <Tooltip placement="right" title={infoText}>
        <Typography variant="h6" display="inline">
          {t('chat:systemMessage')}
        </Typography>
      </Tooltip>
    </Box>
  )
}

const SystemMessage = ({
  system,
  setSystem,
  disabled,
  showInfo = true,
  infoText = '',
}: {
  system: string
  setSystem: SetState<string>
  disabled: boolean
  // eslint-disable-next-line react/require-default-props
  showInfo?: boolean
  infoText?: string
}) => {
  const { t } = useTranslation()

  return (
    <Box>
      {showInfo && <Info infoText={infoText} />}
      <TextField
        fullWidth
        multiline
        minRows={1}
        value={system}
        onChange={(e) => setSystem(e.target.value)}
        placeholder={disabled ? '' : (t('chat:exampleSystemMessage') as string)}
        disabled={disabled}
      />
    </Box>
  )
}

export default SystemMessage
