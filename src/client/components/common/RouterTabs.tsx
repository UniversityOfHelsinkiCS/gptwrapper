import { Tabs } from '@mui/material'
import { get } from 'lodash'
import React from 'react'
import { matchPath, useLocation } from 'react-router-dom'

const stripSearch = (path: string) => path.split('?')[0]

export const RouterTabs = ({ children }: { children: (React.ReactElement | false)[] }) => {
  const { pathname } = useLocation()

  const activeIndex = React.Children.toArray(children)
    .filter((c) => React.isValidElement(c))
    .findIndex((c) => !!matchPath(pathname, stripSearch(get(c, 'props.to'))))

  return <Tabs value={activeIndex < 0 ? 0 : activeIndex}>{children}</Tabs>
}
