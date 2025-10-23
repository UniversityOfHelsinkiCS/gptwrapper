import { Box, Button, Divider, Link, Typography } from '@mui/material'
import { lazy, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useSearchParams } from 'react-router-dom'
import { DEFAULT_MODEL, DEFAULT_MODEL_TEMPERATURE, FREE_MODEL, type ValidModelName, ValidModelNameSchema } from '../../../config'
import type { ChatMessage, MessageGenerationInfo, ToolCallResultEvent } from '@shared/chat'
import useUserStatus from '../../hooks/useUserStatus'
import type { Course, Prompt } from '../../types'
import { OutlineButtonBlack, TextButton } from './general/Buttons'
import MapsUgcIcon from '@mui/icons-material/MapsUgc';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import SettingsIcon from '@mui/icons-material/Settings';
import ArticleIcon from '@mui/icons-material/Article';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import LogoutIcon from '@mui/icons-material/Logout';
import TuneIcon from '@mui/icons-material/Tune'
import HelpCenterIcon from '@mui/icons-material/HelpCenter';
import AppsIcon from '@mui/icons-material/Apps';
import ViewSidebarOutlinedIcon from '@mui/icons-material/ViewSidebarOutlined';
import ExtensionOffIcon from '@mui/icons-material/ExtensionOff';

import hyLogo from '../../assets/hy_logo.svg'
import { formatDate } from '../Courses/util'
import EmailButton from './EmailButton'
import useCourse from '../../hooks/useCourse'
import useCurrentUser from '../../hooks/useCurrentUser'
import { usePromptState } from './PromptState'

import { useNavigate } from 'react-router-dom';


const SideBar = ({
  course,
  handleReset,
  onClose,
  setSettingsModalOpen,
  setBottomSheetContentId,
  setDisclaimerStatus,
  messages,
  currentModel,
  setModel,
  isAdmin,
  setNewSidebar,
}: {
  course: Course | undefined
  handleReset: () => void
  onClose?: () => void
  setBottomSheetContentId: React.Dispatch<React.SetStateAction<string | null>>,
  setSettingsModalOpen: React.Dispatch<React.SetStateAction<boolean>>
  setDisclaimerStatus: React.Dispatch<React.SetStateAction<boolean>>
  messages: ChatMessage[]
  currentModel: ValidModelName
  setModel: (model: ValidModelName) => void
  isAdmin: boolean | undefined,
  setNewSidebar: React.Dispatch<React.SetStateAction<boolean>>
}) => {
  const navigate = useNavigate();
  const { courseId } = useParams()
  const { t, i18n } = useTranslation()
  const { user } = useCurrentUser()
  const { data: chatInstance } = useCourse(courseId)
  const { userStatus, isLoading: statusLoading } = useUserStatus(courseId)
  const { activePrompt, handleChangePrompt } = usePromptState()

  const [isTokenLimitExceeded, setIsTokenLimitExceeded] = useState<boolean>(false)
  const { language } = i18n
  const [collapsed, setCollapsed] = useState<boolean>(false)


  useEffect(() => {
    if (!userStatus) return
    setIsTokenLimitExceeded(userStatus.usage > userStatus.limit)
  }, [statusLoading, userStatus])

  const amongResponsibles = isAdmin ?? chatInstance?.responsibilities.some((r) => r.user.id === user?.id)



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
          pt: 3,
          height: '100%',
          width: collapsed ? 60 : 340,
          borderRight: '1px solid rgba(0, 0, 0, 0.15)',
          zIndex: 999
        }}
        className="scrollable-styled"
      >
        {
          collapsed ?
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
              <Link href="/">
                <img src={hyLogo} alt="University of Helsinki" width="30" />
              </Link>
              <TextButton
                onClick={() => setCollapsed(prev => !prev)}
              >
                <Box sx={{}}>
                  <ViewSidebarOutlinedIcon sx={{ transform: 'scaleX(-1)' }} />
                  <Box className="chevron" sx={{ display: 'flex', alignItems: 'center' }}>
                    <ChevronRightIcon />
                  </Box>
                </Box>
              </TextButton>

              <Divider flexItem />

              {
                course &&
                <>
                  <TextButton>
                    <SettingsIcon fontSize='small' />
                  </TextButton>
                  <TextButton>
                    <ArticleIcon fontSize='small' />
                  </TextButton>
                  <TextButton>
                    <LibraryBooksIcon fontSize='small' />
                  </TextButton>
                  <TextButton>
                    <LogoutIcon sx={{ transform: 'scaleX(-1)' }} fontSize='small' />
                  </TextButton>

                  <Divider flexItem />
                </>
              }

              <TextButton onClick={handleReset}>
                <MapsUgcIcon fontSize='small' />
              </TextButton>
              <EmailButton messages={messages} disabled={!messages.length} collapsed />
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
                  onClick={() => setCollapsed(prev => !prev)}
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
                <Typography mb={0.5} color='textSecondary'>{"kurssi".toUpperCase()}</Typography>
                {
                  course ?
                    <>
                      <Box mb={3}>
                        <Typography variant="h5" my={0.5} fontWeight="bold">
                          {course?.name[language] || 'undefined course'}
                        </Typography>
                        <Typography variant="body2" color='textSecondary'>
                          {`${course.id} | ${formatDate(course.activityPeriod)}`}
                        </Typography>
                      </Box >
                      {amongResponsibles && <TextButton startIcon={<SettingsIcon />}>Kurssin asetukset</TextButton>}
                      <TextButton startIcon={<ArticleIcon />}>Kurssisivu</TextButton>
                      <TextButton startIcon={<LibraryBooksIcon />}>Vaihda kurssia</TextButton>
                      {amongResponsibles && <TextButton onClick={() => navigate("/")} startIcon={<LogoutIcon sx={{ transform: 'scaleX(-1)' }} />}>Poistu kurssinäkymästä</TextButton>}
                    </>
                    :
                    <TextButton startIcon={<ChevronRightIcon />} onClick={() => setBottomSheetContentId(prev => prev === 'course' ? null : 'course')}>
                      <Typography>Ei valittua kurssia</Typography>
                    </TextButton>
                }
              </Box>

              <Divider />

              <Box p={4}>
                <Typography mb={0.5} color='textSecondary' >{"alustus".toUpperCase()}</Typography>
                {
                  activePrompt ?
                    <>
                      <Typography fontWeight='bold' mb={2}>{activePrompt.name}</Typography>
                      <TextButton startIcon={<TuneIcon />} onClick={() => setBottomSheetContentId(prev => prev === 'editPrompt' ? null : 'editPrompt')}>Muokkaa alustusta</TextButton>
                      {!amongResponsibles && <TextButton startIcon={<HelpCenterIcon />} onClick={() => setBottomSheetContentId(prev => prev === 'showPrompt' ? null : 'showPrompt')}>Alustuksen tiedot</TextButton>}
                      <TextButton startIcon={<AppsIcon />} onClick={() => setBottomSheetContentId(prev => prev === 'selectPrompt' ? null : 'selectPrompt')}>Valitse alustus</TextButton>
                      <TextButton startIcon={<ExtensionOffIcon />} onClick={() => handleChangePrompt(undefined)}>Ei alustusta</TextButton>
                    </>
                    :
                    <TextButton startIcon={<ChevronRightIcon />} onClick={() => setBottomSheetContentId(prev => prev === 'prompt' ? null : 'prompt')}>
                      <Typography>Ei alustusta</Typography>
                    </TextButton>
                }
              </Box>

              <Divider />

              <Box p={4}>
                <Typography mb={0.5} color='textSecondary'>{"kielimalli".toUpperCase()}</Typography>
                <TextButton startIcon={<ChevronRightIcon />}>
                  <Typography>GPT-5</Typography>
                </TextButton>
              </Box>

              <Divider />

              <Box p={4}>
                <TextButton startIcon={<MapsUgcIcon />} onClick={handleReset} size='large'>
                  Uusi keskustelu
                </TextButton>

                <EmailButton messages={messages} disabled={!messages.length} />

                {isAdmin && <OutlineButtonBlack sx={{ mt: '2rem' }} onClick={() => setNewSidebar(prev => !prev)}>Admins: toggle old/new sidebar</OutlineButtonBlack>}
              </Box>
            </Box>
        }
      </Box>

    </Box>

  )
}

export default SideBar
