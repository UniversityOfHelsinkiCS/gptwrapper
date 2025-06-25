import React from 'react'
import { Container, Box, Tabs, Tab, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Route, Routes, Link, matchPath, useLocation, Navigate } from 'react-router-dom'
import { get } from 'lodash'

import { format } from 'date-fns'
import ChatInstances from './ChatInstances'
import Usage from './Usage'
import Updater from './Updater'
import EditTexts from './EditTexts'
import UserSearch from './UserSearch'
import useCurrentUser from '../../hooks/useCurrentUser'

const stripSearch = (path: string) => path.split('?')[0]

const RouterTabs = ({ children }: { children: (React.ReactElement | false)[] }) => {
  const { pathname } = useLocation()

  const activeIndex = React.Children.toArray(children)
    .filter((c) => React.isValidElement(c))
    .findIndex((c) => !!matchPath(pathname, stripSearch(get(c, 'props.to'))))

  return <Tabs value={activeIndex < 0 ? 0 : activeIndex}>{children}</Tabs>
}

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
          <Tab label={t('admin:editTexts')} to="/admin/edit-texts" component={Link} />
          <Tab label={t('admin:searchUsers')} to="/admin/usersearch" component={Link} />
        </RouterTabs>
      </Box>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/chatinstances" />} />
        <Route path="/chatinstances" element={<ChatInstances />} />
        <Route path="/usage" element={<Usage />} />
        {user.iamGroups.includes('grp-toska') && <Route path="/updater" element={<Updater />} />}
        <Route path="/edit-texts" element={<EditTexts />} />
        <Route path="/usersearch" element={<UserSearch />} />
      </Routes>
    </Container>
  )
}

export default Admin
