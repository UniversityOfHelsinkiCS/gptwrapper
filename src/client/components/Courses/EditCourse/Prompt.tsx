import React, { useState } from 'react'
import { Box, Paper, Typography, Button } from '@mui/material'
import { ExpandLess, ExpandMore } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

import { Prompt as PromptType, Set } from '../../../types'

const ExpandButton = ({
  expand,
  setExpand,
}: {
  expand: boolean
  setExpand: Set<boolean>
}) => {
  return null

  return (
    <Button onClick={() => setExpand(!expand)}>
      {expand ? <ExpandLess /> : <ExpandMore />}
    </Button>
  )
}

const Prompt = ({
  prompt,
  handleDelete,
}: {
  prompt: PromptType
  handleDelete: (promptId: string) => void
}) => {
  const { t } = useTranslation()

  const [expand, setExpand] = useState(false)

  return (
    <Box key={prompt.id} pt="1%">
      <Paper
        variant="outlined"
        sx={{
          padding: '2%',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h6" display="inline">
          {prompt.systemMessage}
        </Typography>
        <Box>
          {/* <Button onClick={() => handleDelete(prompt.id)}>
            {t('common:edit')}
          </Button> */}
          <Button onClick={() => handleDelete(prompt.id)} color="error">
            {t('common:delete')}
          </Button>
          <ExpandButton expand={expand} setExpand={setExpand} />
        </Box>
      </Paper>
    </Box>
  )
}

export default Prompt
