import React from 'react'
import { Box, Tabs, Tab } from '@mui/material'
import { useTranslation } from 'react-i18next'
import {
  Route,
  Routes,
  Link,
  matchPath,
  useLocation,
  Navigate,
} from 'react-router-dom'
import { get } from 'lodash'

import ChatInstances from './ChatInstances'
import Usage from './Usage'
import Updater from './Updater'
import EditTexts from './EditTexts'

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
    <Box>
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
          <Tab
            label={t('admin:editTexts')}
            to="/admin/edit-texts"
            component={Link}
          />
        </RouterTabs>
      </Box>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/chatinstances" />} />
        <Route path="/chatinstances" element={<ChatInstances />} />
        <Route path="/usage" element={<Usage />} />
        <Route path="/updater" element={<Updater />} />
        <Route path="/edit-texts" element={<EditTexts />} />
      </Routes>
    </Box>
  )
}

export default Admin
