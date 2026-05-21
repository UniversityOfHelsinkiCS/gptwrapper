import { Tabs } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import React from 'react'
import { useLocation } from 'react-router-dom'

const stripSearch = (path: string) => path.split('?')[0]

type RouterTabElement = React.ReactElement<{
  to: string
  sx?: SxProps<Theme>
}>

const mergeSx = (base?: SxProps<Theme>, extra?: SxProps<Theme>): SxProps<Theme> | undefined => {
  if (base && extra) {
    return [base, extra] as SxProps<Theme>
  }

  return extra ?? base
}

type RouterTabsProps = {
  children: React.ReactNode
  sx?: SxProps<Theme>
  tabSx?: SxProps<Theme>
}

export const RouterTabs = ({ children, sx, tabSx }: RouterTabsProps) => {
  const { pathname } = useLocation()

  const tabs = React.Children.toArray(children).filter((child): child is RouterTabElement => React.isValidElement(child))

  const activeIndex = tabs.reduce<number>((best, c, idx) => {
    const to = stripSearch(c.props.to)
    const matches = pathname === to || pathname.startsWith(to + '/')
    if (!matches) return best
    const bestTo = best >= 0 ? stripSearch(tabs[best].props.to) : ''
    return to.length > bestTo.length ? idx : best
  }, -1)

  return (
    <Tabs value={activeIndex < 0 ? false : activeIndex} slotProps={{ indicator: { style: { backgroundColor: 'black' } } }} textColor="inherit" sx={sx}>
      {tabs.map((tab) =>
        React.cloneElement(tab, {
          sx: mergeSx(tab.props.sx, tabSx),
        }),
      )}
    </Tabs>
  )
}
