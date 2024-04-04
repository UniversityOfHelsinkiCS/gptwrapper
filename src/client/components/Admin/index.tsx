import React from 'react'
import { Box, Tabs, Tab } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Route, Routes, Link, matchPath, useLocation } from 'react-router-dom'
import { get } from 'lodash'

import ChatInstances from './ChatInstances'
import Usage from './Usage'
import Updater from './Updater'

const stripSearch = (path: string) => path.split('?')[0]

const RouterTabs = ({ children }: { children: React.ReactElement[] }) => {
  const { pathname } = useLocation()

  const activeIndex = React.Children.toArray(children)
    .filter((c) => React.isValidElement(c))
    .findIndex((c) => !!matchPath(pathname, stripSearch(get(c, 'props.to'))))

  return <Tabs value={activeIndex < 0 ? 0 : activeIndex}>{children}</Tabs>
}

const Admin = () => {
  const { t } = useTranslation()

  return (
    <Box sx={{ margin: '0 auto', width: '90%', padding: '5%' }}>
      <Box mb={3}>
        <RouterTabs>
          <Tab
            label={t('admin:courses')}
            to="/admin/chatinstances"
            component={Link}
          />
          <Tab label={t('admin:usage')} to="/admin/usage" component={Link} />
          <Tab
            label={t('admin:updater')}
            to="/admin/updater"
            component={Link}
          />
        </RouterTabs>
      </Box>
      <Routes>
        <Route path="/chatinstances" element={<ChatInstances />} />
        <Route path="/chatinstances" element={<Usage />} />
        <Route path="/updater" element={<Updater />} />
      </Routes>
    </Box>
  )
}

export default Admin
