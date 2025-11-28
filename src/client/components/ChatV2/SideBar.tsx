import { Box, Chip, Divider, Link, Tooltip, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import type { ChatMessage } from '@shared/chat'
import useUserStatus from '../../hooks/useUserStatus'
import type { Course, Prompt } from '../../types'
import { TextButton } from './general/Buttons'
import MapsUgcIcon from '@mui/icons-material/MapsUgc'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import SettingsIcon from '@mui/icons-material/Settings'
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks'
import LogoutIcon from '@mui/icons-material/Logout'
import TuneIcon from '@mui/icons-material/Tune'
import HelpCenterIcon from '@mui/icons-material/HelpCenter'
import AppsIcon from '@mui/icons-material/Apps'
import ExtensionOffIcon from '@mui/icons-material/ExtensionOff'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import hyLogo from '../../assets/hy_logo.svg'
import sidebarClose from '../../assets/sidebar-close.svg'
import sidebarOpen from '../../assets/sidebar-open.svg'
import { formatDate } from '../Courses/util'
import EmailButton from './EmailButton'
import useCourse from '../../hooks/useCourse'
import useCurrentUser from '../../hooks/useCurrentUser'
import { usePromptState } from './PromptState'

import { useNavigate } from 'react-router-dom'
import ModelSelector from './ModelSelector'
import { ValidModelName } from '../../../config'
import Footer from '../Footer'
import { CustomIcon } from './general/CustomIcon'

const SideBar = ({
  open,
  setOpen,
  course,
  handleReset,
  messages,
  currentModel,
  setModel,
}: {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  course: Course | undefined
  handleReset: () => void
  onClose?: () => void
  messages: ChatMessage[]
  currentModel: ValidModelName
  setModel: (model: ValidModelName) => void
}) => {
  const { user } = useCurrentUser()
  const navigate = useNavigate()
  const { courseId } = useParams()
  const { t, i18n } = useTranslation()
  const { data: chatInstance } = useCourse(courseId)
  const { userStatus, isLoading: statusLoading } = useUserStatus(courseId)
  const { activePrompt, handleChangePrompt, myPrompts } = usePromptState()

  const [isTokenLimitExceeded, setIsTokenLimitExceeded] = useState<boolean>(false)
  const { language } = i18n

  useEffect(() => {
    if (!userStatus) return
    setIsTokenLimitExceeded(userStatus.usage > userStatus.limit)
  }, [statusLoading, userStatus])

  const amongResponsibles = user?.isAdmin || chatInstance?.responsibilities.some((r) => r.user.id === user?.id)

  const showEditPrompt = (prompt: Prompt) => {
    return amongResponsibles || courseId === 'general' || myPrompts.some((a: Prompt) => a.id === prompt.id)
  }

  const CourseStatus = () => {
    if (!chatInstance) return null;
    const courseEnabled = chatInstance.usageLimit > 0;
    const courseEnded = Date.parse(chatInstance.activityPeriod.endDate) < Date.now();

    if (courseEnded) {
      return (
        <Tooltip title={t('chat:courseChatEndedInfo')}>
          <Chip
            label={t('chat:courseChatEnded')}
            color="error"
            icon={<InfoOutlinedIcon fontSize="small" />}
          />
        </Tooltip>
      );
    } else if (!courseEnabled) {
      return (
        <Tooltip title={t('chat:courseChatNotActivatedInfo')}>
          <Chip
            label={t('chat:courseChatNotActivated')}
            color="warning"
            icon={<InfoOutlinedIcon fontSize="small" />}
          />
        </Tooltip>
      );
    }

    return null;
  };

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

            <Box p={3}>
              <Typography mb={0.5} color="textSecondary">
                {t('sidebar:courseTitle').toUpperCase()}
              </Typography>
              {course ? (
                <>
                  <Box mb={1} sx={{ border: '1px solid rgba(0,0,0,0.2)', borderRadius: '0.5rem', p: 2 }}>
                    <CourseStatus />
                    <Typography my={0.5} fontWeight="bold" sx={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                      {course?.name[language] || 'undefined course'}
                    </Typography>

                    <Typography
                      variant="caption"
                      component="span"
                      sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                    >
                      {course.courseUnits[0].code}

                      <Divider orientation="vertical" flexItem />

                      {formatDate(course.activityPeriod)}

                      <Divider orientation="vertical" flexItem />

                      <Link
                        href={t('links:studiesCur', { curId: course.courseId })}
                        underline="hover"
                        sx={{ display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t('course:coursePage')}
                        <OpenInNewIcon sx={{ fontSize: '1rem', ml: 0.3 }} />
                      </Link>
                    </Typography>

                  </Box>
                  {amongResponsibles && (
                    <TextButton data-testid="course-settings-button" startIcon={<SettingsIcon />} onClick={() => navigate(`/${courseId}/course`)}>
                      {t('sidebar:courseSettings')}
                    </TextButton>
                  )}
                  <TextButton startIcon={<LibraryBooksIcon />} onClick={() => navigate(`/${courseId}/courses`)}>
                    {t('sidebar:courseChange')}
                  </TextButton>
                  {amongResponsibles && (
                    <TextButton data-testid="course-exit-button" onClick={() => { navigate('/general'); handleChangePrompt(undefined) }} startIcon={<LogoutIcon sx={{ transform: 'scaleX(-1)' }} />}>
                      {t('sidebar:courseExit')}
                    </TextButton>
                  )}
                </>
              ) : (
                <TextButton startIcon={<ChevronRightIcon />} onClick={() => navigate(`/general/courses`)}>
                  <Typography>{t('sidebar:noCourse')}</Typography>
                </TextButton>
              )}
            </Box>
            <Divider />
            <Box p={3}>
              <Typography mb={0.5} color="textSecondary">
                {t('sidebar:promptTitle').toUpperCase()}
              </Typography>
              {activePrompt ? (
                <>
                  <Box mb={1} sx={{ border: '1px solid rgba(0,0,0,0.2)', borderRadius: '0.5rem', p: 2 }}>
                    <Typography data-testid="prompt-name" fontWeight="bold">
                      {activePrompt.name}
                    </Typography>
                  </Box>
                  {showEditPrompt(activePrompt) ? (
                    <TextButton
                      data-testid="edit-prompt-button"
                      startIcon={<TuneIcon />}
                      onClick={() => navigate(courseId ? `/${courseId}/prompt/${activePrompt.id}` : `/prompt/${activePrompt.id}`)}
                    >
                      {t('sidebar:promptEdit')}
                    </TextButton>
                  ) : (
                    <TextButton data-testid="prompt-details-button" startIcon={<HelpCenterIcon />} onClick={() => navigate(`/${courseId}/show/${activePrompt.id}`)}>
                      {t('sidebar:promptDetails')}
                    </TextButton>
                  )}
                  <TextButton data-testid="choose-prompt-button" startIcon={<AppsIcon />} onClick={() => navigate(`/${courseId}/prompts`)}>
                    {t('sidebar:promptChange')}
                  </TextButton>
                  <TextButton startIcon={<ExtensionOffIcon />} onClick={() => handleChangePrompt(undefined)}>
                    {t('sidebar:promptNone')}
                  </TextButton>
                </>
              ) : (
                <TextButton data-testid="choose-prompt-button" startIcon={<ChevronRightIcon />} onClick={() => navigate(`/${courseId}/prompts`)}>
                  <Typography>{t('sidebar:promptSelect')}</Typography>
                </TextButton>
              )}
            </Box>

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
