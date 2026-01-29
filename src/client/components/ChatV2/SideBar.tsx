import { Box, Divider, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import type { ChatMessage } from '@shared/chat'
import useUserStatus from '../../hooks/useUserStatus'
import type { Course, User } from '../../types'
import { TextButton } from './general/Buttons'
import MapsUgcIcon from '@mui/icons-material/MapsUgc'
import sidebarClose from '../../assets/sidebar-close.svg'
import sidebarOpen from '../../assets/sidebar-open.svg'
import EmailButton from './EmailButton'
import DownloadButton from './DownloadButton'
import hyLogo from '../../assets/hy_logo.svg'

import ModelSelector from './ModelSelector'
import { ValidModelName } from '../../../config'
import Footer from '../Footer'
import { CustomIcon } from './general/CustomIcon'
import ChatConsole from './ChatConsole'

const SideBar = ({
  open,
  setOpen,
  course,
  user,
  handleReset,
  messages,
  currentModel,
  setModel,
}: {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  course: Course | undefined
  user?: User | null
  handleReset: () => void
  messages: ChatMessage[]
  currentModel: ValidModelName
  setModel: (model: ValidModelName) => void
}) => {
  const { courseId } = useParams()
  const { t } = useTranslation()
  const { userStatus, isLoading: statusLoading } = useUserStatus(courseId)

  const [isTokenLimitExceeded, setIsTokenLimitExceeded] = useState<boolean>(false)

  useEffect(() => {
    if (!userStatus) return
    setIsTokenLimitExceeded(userStatus.usage > userStatus.limit)
  }, [statusLoading, userStatus])

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          pt: 3,
          height: '100%',
          width: !open ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)',
          borderRight: '1px solid rgba(0, 0, 0, 0.15)',
          zIndex: 999,
        }}
        className="scrollable-styled"
      >
        {!open ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
            <TextButton onClick={() => setOpen((prev) => !prev)}>
              <CustomIcon src={sidebarOpen} />
            </TextButton>
            <TextButton onClick={handleReset} data-testid="new-conversation-button">
              <MapsUgcIcon fontSize='small' />
            </TextButton>
            <EmailButton messages={messages} disabled={!messages.length} collapsed />
            {user?.isAdmin && <DownloadButton messages={messages} disabled={!messages.length} collapsed />}
          </Box>
        ) : (
          <Box>
            <Box
              sx={{
                position: 'absolute',
                right: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                color: 'text.secondary',
                '& .chevron': {
                  opacity: 1,
                },
              }}
            >
              <TextButton onClick={() => setOpen((prev) => !prev)}>
                <CustomIcon src={sidebarClose} />
              </TextButton>
            </Box>

            <Box sx={{ px: 3, mb: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
              <img src={hyLogo} alt="University of Helsinki" width="36" />
              <Typography fontWeight="bold" color="textPrimary">
                {t('appName').toUpperCase()}
              </Typography>
            </Box>

            <ChatConsole user={user} course={course} />

            <Divider />

            <Box p={3}>
              <Typography mb={0.5} color="textSecondary">
                {t('sidebar:modelTitle').toUpperCase()}
              </Typography>
              <ModelSelector currentModel={currentModel} setModel={setModel} isTokenLimitExceeded={isTokenLimitExceeded} />
            </Box>

            <Divider />

            <Box p={3}>
              <TextButton startIcon={<MapsUgcIcon />} onClick={handleReset} size="large" data-testid="new-conversation-button">
                {t('sidebar:chatNew')}
              </TextButton>

              <EmailButton messages={messages} disabled={!messages.length} />
              {user?.isAdmin && <DownloadButton messages={messages} disabled={!messages.length} />}
            </Box>
          </Box>
        )}
        {open && (
          <Box px={3} py={2}>
            <Footer />
          </Box>
        )}
      </Box>
    </Box >
  )
}

export default SideBar
