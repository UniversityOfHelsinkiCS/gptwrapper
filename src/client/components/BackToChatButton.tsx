import * as React from 'react'
import { useMediaQuery, useTheme } from '@mui/material'
import ArrowBack from '@mui/icons-material/ArrowBack'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { OutlineButtonBlack } from './ChatV2/general/Buttons'

const NON_CHAT_ROUTES = ['noaccess', 'login-helper', 'changelog']

const trackBackButtonBottom = (node: HTMLElement | null) => {
  if (!node) return
  const rootStyle = document.documentElement.style
  const update = () => {
    const rect = node.getBoundingClientRect()
    rootStyle.setProperty('--back-button-bottom', `${Math.ceil(rect.bottom + window.scrollY) + 8}px`)
    rootStyle.setProperty('--back-button-right', `${Math.ceil(rect.right) + 16}px`)
  }
  update()
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
  observer?.observe(node)
  return () => {
    observer?.disconnect()
    rootStyle.removeProperty('--back-button-bottom')
    rootStyle.removeProperty('--back-button-right')
  }
}

export const isManagementPage = (pathname: string) => pathname.includes('course-creator') || pathname.includes('admin') || pathname.includes('statistics')

export default function BackToChatButton() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const showBackButton = isManagementPage(pathname)
  const buttonRef = React.useCallback(trackBackButtonBottom, [])

  const lastChatPath = React.useRef('/general')
  React.useEffect(() => {
    const courseId = pathname.split('/')[1]
    if (!showBackButton && courseId && !NON_CHAT_ROUTES.includes(courseId)) {
      lastChatPath.current = `/${courseId}`
    }
  }, [pathname, showBackButton])

  if (!showBackButton) return null

  return (
    <OutlineButtonBlack
      ref={buttonRef}
      onClick={() => navigate(lastChatPath.current)}
      startIcon={<ArrowBack />}
      sx={{
        position: 'absolute',
        top: isMobile ? 10 : 20,
        left: 20,
        zIndex: 999,
      }}
    >
      {t('backToChat')}
    </OutlineButtonBlack>
  )
}
