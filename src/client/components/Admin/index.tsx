import { Container, Box, Tab, Typography } from '@mui/material'
import { visuallyHidden } from '@mui/utils'
import { useTranslation } from 'react-i18next'
import { Route, Routes, Link, Navigate, useMatch } from 'react-router-dom'

import { format } from 'date-fns'
import ChatInstances from './ChatInstances'
import ChatInstanceSearch from './ChatInstanceSearch'
import Usage from './Usage'
import Updater from './Updater'
import UserSearch from './UserSearch'
import useCurrentUser from '../../hooks/useCurrentUser'
import { RouterTabs } from '../common/RouterTabs'
import { selectedTabStyle } from '../../util/accessibility'
import Feedbacks from './Feedbacks'
import Testing from './Testing'
import NotificationManagement from './NotificationManagement'
import UniversityPromptManagement from './UniversityPromptManagement'
import { usePageTitle } from '../../hooks/usePageTitle'

/**
 * React-router compatible lazy loaded component for Admin page
 */

export function Component() {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const tabPath = useMatch('/admin/:tab/*')?.params.tab
  const tabs = [
    { path: 'usersearch', label: t('admin:searchUsers') },
    { path: 'chatinstancesearch', label: t('admin:chatInstance') },
    { path: 'notifications', label: t('admin:notifications') },
    { path: 'uniprompts', label: t('admin:uniPrompts') },
    { path: 'feedbacks', label: t('admin:feedbacks') },
    ...(user?.iamGroups.includes('grp-toska') ? [{ path: 'updater', label: t('admin:updater') }] : []),
    { path: 'testing', label: t('admin:testing') },
  ]
  usePageTitle(tabs.find((tab) => tab.path === tabPath)?.label, t('common:admin'))
  if (!user) return null

  const lastRestart = format(new Date(user?.lastRestart), 'dd/MM/yyyy HH.mm.ss')

  return (
    <Container sx={{ mt: '8rem', mb: '10rem', position: 'relative' }} maxWidth="xl">
      <Typography component="h2" sx={visuallyHidden}>
        {t('common:admin')}
      </Typography>
      <Box m={2}>
        <Typography variant="body1">
          {t('admin:lastUpdate')}
          {lastRestart}
        </Typography>
      </Box>
      <Box mb={3}>
        <RouterTabs
          sx={{
            px: 1,
            py: 1,
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            backgroundColor: 'background.paper',
            '& .MuiTabs-indicator': {
              display: 'none',
            },
          }}
          tabSx={{
            borderRadius: 1.5,
            minHeight: 40,
            '&.Mui-selected': selectedTabStyle,
          }}
        >
          {tabs.map((tab) => (
            <Tab key={tab.path} label={tab.label} to={`/admin/${tab.path}`} component={Link} />
          ))}
        </RouterTabs>
      </Box>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/usersearch" />} />
        <Route path="/chatinstances" element={<ChatInstances />} />
        <Route path="/usage" element={<Usage />} />
        {user.iamGroups.includes('grp-toska') && <Route path="/updater" element={<Updater />} />}
        <Route path="/usersearch" element={<UserSearch />} />
        <Route path="/chatinstancesearch" element={<ChatInstanceSearch />} />
        <Route path="/feedbacks" element={<Feedbacks />} />
        <Route path="/notifications" element={<NotificationManagement />} />
        <Route path="/uniprompts" element={<UniversityPromptManagement />} />
        <Route path="/testing" element={<Testing />} />
      </Routes>
    </Container>
  )
}
