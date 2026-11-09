import * as React from 'react'
import { useMediaQuery, useTheme } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { BlueButton } from './ChatV2/general/Buttons'

const NON_CHAT_ROUTES = ['noaccess', 'login-helper', 'changelog']

export default function BackToChatButton() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const showBackButton = pathname.includes('course-creator') || pathname.includes('admin') || pathname.includes('statistics')

  const lastChatPath = React.useRef('/general')
  React.useEffect(() => {
    const courseId = pathname.split('/')[1]
    if (!showBackButton && courseId && !NON_CHAT_ROUTES.includes(courseId)) {
      lastChatPath.current = `/${courseId}`
    }
  }, [pathname, showBackButton])

  if (!showBackButton) return null

  return (
    <BlueButton
      onClick={() => navigate(lastChatPath.current)}
      sx={{
        position: 'fixed',
        top: isMobile ? 10 : 20,
        left: isMobile ? 15 : 20,
        zIndex: 999,
      }}
    >
      {t('backToChat')}
    </BlueButton>
  )
}
