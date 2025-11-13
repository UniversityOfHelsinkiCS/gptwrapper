import { Box, Divider, Link, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import type { ChatMessage } from '@shared/chat'
import useUserStatus from '../../hooks/useUserStatus'
import type { Course, Prompt } from '../../types'
import { TextButton } from './general/Buttons'
import MapsUgcIcon from '@mui/icons-material/MapsUgc'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import SettingsIcon from '@mui/icons-material/Settings'
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks'
import LogoutIcon from '@mui/icons-material/Logout'
import TuneIcon from '@mui/icons-material/Tune'
import HelpCenterIcon from '@mui/icons-material/HelpCenter'
import AppsIcon from '@mui/icons-material/Apps'
import ViewSidebarOutlinedIcon from '@mui/icons-material/ViewSidebarOutlined'
import ExtensionOffIcon from '@mui/icons-material/ExtensionOff'
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import hyLogo from '../../assets/hy_logo.svg'
import { formatDate } from '../Courses/util'
import EmailButton from './EmailButton'
import useCourse from '../../hooks/useCourse'
import useCurrentUser from '../../hooks/useCurrentUser'
import { usePromptState } from './PromptState'

import { useNavigate } from 'react-router-dom'
import ModelSelector from './ModelSelector'
import { ValidModelName } from '../../../config'
import Footer from '../Footer'


const SideBar = ({
  expanded,
  setExpanded,
  course,
  handleReset,
  messages,
  currentModel,
  setModel,
}: {
  expanded: boolean,
  setExpanded: React.Dispatch<React.SetStateAction<boolean>>
  course: Course | undefined
  handleReset: () => void
  onClose?: () => void
  messages: ChatMessage[]
  currentModel: ValidModelName
  setModel: (model: ValidModelName) => void
}) => {
  const { user } = useCurrentUser()
  const navigate = useNavigate();
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

  const amongResponsibles = user?.isAdmin ?? chatInstance?.responsibilities.some((r) => r.user.id === user?.id)


  const showEditPrompt = (prompt: Prompt) => {

    return (amongResponsibles || courseId === 'general' || myPrompts.some((a: Prompt) => a.id === prompt.id))
  }

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
          width: !expanded ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)',
          borderRight: '1px solid rgba(0, 0, 0, 0.15)',
          zIndex: 999
        }}
        className="scrollable-styled"
      >
        {
          !expanded ?
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
              <Link href="/">
                <img src={hyLogo} alt="University of Helsinki" width="30" />
              </Link>
              <TextButton
                onClick={() => setExpanded(prev => !prev)}
              >
                <Box sx={{}}>
                  <ViewSidebarOutlinedIcon sx={{ transform: 'scaleX(-1)' }} />
                  <Box className="chevron" sx={{ display: 'flex', alignItems: 'center' }}>
                    <ChevronRightIcon />
                  </Box>
                </Box>
              </TextButton>

            </Box>
            :
            <Box>
              <Box sx={{
                position: 'absolute',
                right: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                color: 'text.secondary',
                '& .chevron': {
                  opacity: 1,
                },
              }}>
                <TextButton
                  onClick={() => setExpanded(prev => !prev)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <ViewSidebarOutlinedIcon sx={{ transform: 'scaleX(-1)' }} />
                    <Box className="chevron" sx={{ display: 'flex', alignItems: 'center' }}>
                      <ChevronLeftIcon />
                    </Box>
                  </Box>
                </TextButton>
              </Box>
              <Link
                href="/"
                sx={{ px: 4, mb: 1, display: 'flex', gap: 1, textDecoration: 'none', alignItems: 'center' }}
              >
                <img src={hyLogo} alt="University of Helsinki" width="36" />
                <Typography fontWeight="bold" color='textPrimary' >{t('appName').toUpperCase()}</Typography>
              </Link>

              <Box p={4}>
                <Typography mb={0.5} color='textSecondary'>{t("sidebar:courseTitle").toUpperCase()}</Typography>
                {
                  course ?
                    <>
                      <Box mb={3}>
                        <Typography
                          variant="h6"
                          my={0.5}
                          fontWeight="bold"
                          sx={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                        >
                          {course?.name[language] || 'undefined course'}
                        </Typography>

                        <Typography
                          variant="body2"
                          color="textSecondary"
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
                            <OpenInNewIcon sx={{ fontSize: '0.9rem', ml: 0.5 }} />
                          </Link>
                        </Typography>



                      </Box >
                      {amongResponsibles && <TextButton startIcon={<SettingsIcon />} onClick={() => navigate(`/${courseId}/course`)}>{t("sidebar:courseSettings")}</TextButton>}
                      <TextButton startIcon={<LibraryBooksIcon />} onClick={() => navigate(`/${courseId}/courses`)}>{t("sidebar:courseChange")}</TextButton>
                      {amongResponsibles && <TextButton onClick={() => navigate("/general")} startIcon={<LogoutIcon sx={{ transform: 'scaleX(-1)' }} />}>{t("sidebar:courseExit")}</TextButton>}
                    </>
                    :
                    <TextButton startIcon={<ChevronRightIcon />} onClick={() => navigate(`/general/courses`)}>
                      <Typography>{t("sidebar:noCourse")}</Typography>
                    </TextButton>
                }
              </Box>
              <Divider />
              <Box p={4}>
                <Typography mb={0.5} color='textSecondary' >{t("sidebar:promptTitle").toUpperCase()}</Typography>
                {
                  activePrompt ?
                    <>
                      <Typography data-testid='prompt-name' fontWeight='bold' mb={2}>{activePrompt.name}</Typography>
                      {showEditPrompt(activePrompt) ? (<TextButton data-testid="edit-prompt-button" startIcon={<TuneIcon />} onClick={() => navigate(courseId ? `/${courseId}/prompt/${activePrompt.id}` : `/prompt/${activePrompt.id}`)}>{t("sidebar:promptEdit")}</TextButton>)
                        : (<TextButton startIcon={<HelpCenterIcon />} onClick={() => navigate(`/${courseId}/show/${activePrompt.id}`)}>{t("sidebar:promptDetails")}</TextButton>)}
                      <TextButton data-testid='choose-prompt-button' startIcon={<AppsIcon />} onClick={() => navigate(`/${courseId}/prompts`)}>{t("sidebar:promptSelect")}</TextButton>
                      <TextButton startIcon={<ExtensionOffIcon />} onClick={() => handleChangePrompt(undefined)}>{t("sidebar:promptNone")}</TextButton>
                    </>
                    :
                    <TextButton data-testid='choose-prompt-button' startIcon={<ChevronRightIcon />} onClick={() => navigate(`/${courseId}/prompts`)}>
                      <Typography>{t("sidebar:promptSelect")}</Typography>
                    </TextButton>
                }
              </Box>

              <Divider />

              <Box p={4}>
                <Typography mb={0.5} color='textSecondary'>{t("sidebar:modelTitle").toUpperCase()}</Typography>
                <ModelSelector currentModel={currentModel} setModel={setModel} isTokenLimitExceeded={isTokenLimitExceeded} />
              </Box>

              <Divider />

              <Box p={4}>
                <TextButton startIcon={<MapsUgcIcon />} onClick={handleReset} size='large' data-testid="new-conversation-button">
                  {t("sidebar:chatNew")}
                </TextButton>

                <EmailButton messages={messages} disabled={!messages.length} />
              </Box>
            </Box>
        }
        {
          expanded &&
          <Box px={4} py={2}>
            <Footer />
          </Box>
        }
      </Box>
    </Box >
  )
}

export default SideBar
