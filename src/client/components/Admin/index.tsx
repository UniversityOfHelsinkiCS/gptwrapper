import { Container, Box, Tab, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Route, Routes, Link, Navigate } from 'react-router-dom'

import { format } from 'date-fns'
import ChatInstances from './ChatInstances'
import Usage from './Usage'
import Updater from './Updater'
import UserSearch from './UserSearch'
import useCurrentUser from '../../hooks/useCurrentUser'
import { RouterTabs } from '../common/RouterTabs'
import Feedbacks from './Feedbacks'
import Testing from './Testing'

const Admin = () => {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  if (!user) return null

  const lastRestart = format(new Date(user?.lastRestart), 'dd/MM/yyyy HH.mm.ss')

  return (
    <Container sx={{ mt: '4rem', mb: '10rem' }} maxWidth="xl">
      <Box m={2}>
        <Typography variant="body1">
          {t('admin:lastUpdate')}
          {lastRestart}
        </Typography>
      </Box>
      <Box mb={3}>
        <RouterTabs>
          <Tab label={t('admin:courses')} to="/admin/chatinstances" component={Link} />
          <Tab label={t('admin:usage')} to="/admin/usage" component={Link} />
          {user.iamGroups.includes('grp-toska') && <Tab label={t('admin:updater')} to="/admin/updater" component={Link} />}
          <Tab label={t('admin:searchUsers')} to="/admin/usersearch" component={Link} />
          <Tab label={t('admin:feedbacks')} to="/admin/feedbacks" component={Link} />
          <Tab label={t('admin:testing')} to="/admin/testing" component={Link} />
        </RouterTabs>
      </Box>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/chatinstances" />} />
        <Route path="/chatinstances" element={<ChatInstances />} />
        <Route path="/usage" element={<Usage />} />
        {user.iamGroups.includes('grp-toska') && <Route path="/updater" element={<Updater />} />}
        <Route path="/usersearch" element={<UserSearch />} />
        <Route path="/feedbacks" element={<Feedbacks />} />
        <Route path="/testing" element={<Testing />} />
      </Routes>
    </Container>
  )
}

export default Admin
