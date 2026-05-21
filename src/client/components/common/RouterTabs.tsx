import { Tabs } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import React from 'react'
import { useLocation } from 'react-router-dom'

const stripSearch = (path: string) => path.split('?')[0]

type RouterTabsProps = {
  children: React.ReactNode
  sx?: SxProps<Theme>
  tabSx?: SxProps<Theme>
}

export const RouterTabs = ({ children, sx, tabSx }: RouterTabsProps) => {
  const { pathname } = useLocation()

  const tabs = React.Children.toArray(children).filter((c) => React.isValidElement(c))

  const activeIndex = tabs.reduce<number>((best, c, idx) => {
    const to = stripSearch((c.props as { to: string }).to)
    const matches = pathname === to || pathname.startsWith(to + '/')
    if (!matches) return best
    const bestTo = best >= 0 ? stripSearch((tabs[best].props as { to: string }).to) : ''
    return to.length > bestTo.length ? idx : best
  }, -1)

  return (
    <Tabs value={activeIndex < 0 ? false : activeIndex} slotProps={{ indicator: { style: { backgroundColor: 'black' } } }} textColor="inherit" sx={sx}>
      {tabs.map((tab) =>
        React.isValidElement(tab)
          ? React.cloneElement(tab as React.ReactElement<{ sx?: SxProps<Theme> }>, {
              sx: [tab.props.sx, tabSx],
            })
          : tab,
      )}
    </Tabs>
  )
}
