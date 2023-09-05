import React from 'react'
import { Box, Paper, Typography, Button } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { Prompt as PromptType } from '../../../types'

const Prompt = ({
  prompt,
  handleDelete,
}: {
  prompt: PromptType
  handleDelete: (promptId: string) => void
}) => {
  const { t } = useTranslation()

  return (
    <Box key={prompt.id} pt="1%">
      <Paper
        variant="outlined"
        sx={{
          padding: '1%',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h6" display="inline">
          {prompt.systemMessage}
        </Typography>
        <Button onClick={() => handleDelete(prompt.id)} color="error">
          {t('common:delete')}
        </Button>
      </Paper>
    </Box>
  )
}

export default Prompt
