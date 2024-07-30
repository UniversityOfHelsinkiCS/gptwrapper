import React from 'react'
import { Box, TextField, Typography, Tooltip } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { HelpOutline } from '@mui/icons-material'
import { SetState } from '../../types'

const Info = ({ infoText }: { infoText: string }) => {
  const { t } = useTranslation()

  return (
    <Box mb={1} sx={{ display: 'flex', alignItems: 'center' }}>
      <Typography variant="h6" display="inline" marginRight={1}>
        {t('chat:systemMessage')}
      </Typography>
      {infoText && (
        <Tooltip placement="right" title={infoText}>
          <HelpOutline color="action" />
        </Tooltip>
      )}
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
