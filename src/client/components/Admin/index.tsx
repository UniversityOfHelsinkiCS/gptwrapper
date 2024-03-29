import React, { useState } from 'react'
import { Box, Tabs, Tab } from '@mui/material'
import { useTranslation } from 'react-i18next'

import ChatInstances from './ChatInstances'
import Usage from './Usage'

const Admin = () => {
  const [value, setValue] = useState(0)

  const { t } = useTranslation()

  return (
    <Box sx={{ margin: '0 auto', width: '90%', padding: '5%' }}>
      <Box mb={3}>
        <Tabs
          sx={{ borderBottom: 1, borderColor: 'divider' }}
          value={value}
          onChange={(_, newValue) => setValue(newValue)}
        >
          <Tab label={t('admin:courses')} />
          <Tab label={t('admin:usage')} />
        </Tabs>
      </Box>
      {value === 0 && <ChatInstances />}
      {value === 1 && <Usage />}
    </Box>
  )
}

export default Admin
