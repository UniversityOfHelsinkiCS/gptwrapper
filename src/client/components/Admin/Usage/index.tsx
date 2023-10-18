import React, { useState } from 'react'
import { Box, Tabs, Tab } from '@mui/material'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import useCurrentUser from '../../../hooks/useCurrentUser'
import CourseTable from './CourseTable'
import FacultyTable from './FacultyTable'
import UserTable from './UserTable'

const Usage = () => {
  const [value, setValue] = useState(0)

  const { t } = useTranslation()
  const { user, isLoading } = useCurrentUser()

  if (isLoading) return null
  if (!user?.isAdmin) return <Navigate to="/" />

  return (
    <Box>
      <Tabs
        sx={{ borderBottom: 1, borderColor: 'divider' }}
        value={value}
        onChange={(_, newValue) => setValue(newValue)}
      >
        <Tab label={t('admin:courses')} />
        <Tab label={t('admin:faculties')} />
        <Tab label={t('admin:users')} />
      </Tabs>
      {value === 0 && <CourseTable />}
      {value === 1 && <FacultyTable />}
      {value === 2 && <UserTable />}
    </Box>
  )
}

export default Usage
