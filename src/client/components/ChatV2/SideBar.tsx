import { Box, Button, Divider, Link, Typography } from '@mui/material'
import { lazy, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useSearchParams } from 'react-router-dom'
import { DEFAULT_MODEL, DEFAULT_MODEL_TEMPERATURE, FREE_MODEL, type ValidModelName, ValidModelNameSchema } from '../../../config'
import type { ChatMessage, MessageGenerationInfo, ToolCallResultEvent } from '@shared/chat'
import useUserStatus from '../../hooks/useUserStatus'
import type { Course } from '../../types'
import { OutlineButtonBlack, TextButton } from './general/Buttons'
import MapsUgcIcon from '@mui/icons-material/MapsUgc';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
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

import hyLogo from '../../assets/hy_logo.svg'
import { formatDate } from '../Courses/util'

const SideBar = ({
    course,
    handleReset,
    onClose,
    setSettingsModalOpen,
    setDisclaimerStatus,
    messages,
    currentModel,
    setModel,
}: {
    course: Course | undefined
    handleReset: () => void
    onClose?: () => void
    setSettingsModalOpen: React.Dispatch<React.SetStateAction<boolean>>
    setDisclaimerStatus: React.Dispatch<React.SetStateAction<boolean>>
    messages: ChatMessage[]
    currentModel: ValidModelName
    setModel: (model: ValidModelName) => void
}) => {
    const { courseId } = useParams()
    const { userStatus, isLoading: statusLoading } = useUserStatus(courseId)
    const [isTokenLimitExceeded, setIsTokenLimitExceeded] = useState<boolean>(false)
    const { t, i18n } = useTranslation()
    const { language } = i18n
    const [collapsed, setCollapsed] = useState<boolean>(false)

    useEffect(() => {
        if (!userStatus) return
        setIsTokenLimitExceeded(userStatus.usage > userStatus.limit)
    }, [statusLoading, userStatus])

    const isAdminOrTeacher = true

    return (
        <Box
            sx={{
                position: 'relative',
            }}
        >
            <Box sx={{
                position: 'sticky',
                top: 0,
                py: 3,
                height: '100vh',
                width: collapsed ? 60 : 400,
                borderRight: '1px solid rgba(0, 0, 0, 0.15)',
                zIndex: 999
            }}>

                <Box sx={{
                    position: 'absolute',
                    right: -80,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    color: 'text.secondary',
                    '& .chevron': {
                        opacity: 0,
                        transition: 'opacity 0.2s',
                    },
                    '&:hover .chevron': {
                        opacity: 1,
                    },
                }}>
                    <TextButton
                        onClick={() => setCollapsed(prev => !prev)}

                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <ViewSidebarOutlinedIcon sx={{ transform: 'scaleX(-1)' }} />
                            <Box className="chevron" sx={{ display: 'flex', alignItems: 'center' }}>
                                {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                            </Box>
                        </Box>
                    </TextButton>
                </Box>


                {
                    collapsed ?
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', opacity: 0.86 }}>
                            <Link href="/">
                                <img src={hyLogo} alt="University of Helsinki" width="30" />
                            </Link>
                            <Divider flexItem />
                            <SettingsIcon fontSize='small' />
                            <ArticleIcon fontSize='small' />
                            <LibraryBooksIcon fontSize='small' />
                            <LogoutIcon sx={{ transform: 'scaleX(-1)' }} fontSize='small' />
                            <Divider flexItem />
                            <MapsUgcIcon fontSize='small' />
                            <SaveAltIcon fontSize='small' />
                        </Box>
                        :
                        <Box>
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
                                            {isAdminOrTeacher && <TextButton startIcon={<SettingsIcon />}>Kurssin asetukset</TextButton>}
                                            <TextButton startIcon={<ArticleIcon />}>Kurssisivu</TextButton>
                                            <TextButton startIcon={<LibraryBooksIcon />}>Vaihda kurssia</TextButton>
                                            {isAdminOrTeacher && <TextButton startIcon={<LogoutIcon sx={{ transform: 'scaleX(-1)' }} />}>Poistu kurssinäkymästä</TextButton>}
                                        </>
                                        :
                                        <TextButton startIcon={<ChevronRightIcon />}>
                                            <Typography>Ei valittua kurssia</Typography>
                                        </TextButton>
                                }
                            </Box>

                            <Divider />

                            <Box p={4}>
                                <Typography mb={0.5} color='textSecondary' >{"alustus".toUpperCase()}</Typography>
                                {
                                    course ?
                                        <>
                                            <Typography mb={2}>Aivan erikoiset ohjeet</Typography>
                                            {isAdminOrTeacher && <TextButton startIcon={<TuneIcon />}>Muokkaa alustusta</TextButton>}
                                            <TextButton startIcon={<HelpCenterIcon />}>Alustuksen tiedot</TextButton>
                                            <TextButton startIcon={<AppsIcon />}>Valitse alustus</TextButton>
                                        </>
                                        :
                                        <TextButton startIcon={<ChevronRightIcon />}>
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
                                <TextButton startIcon={<SaveAltIcon />} size='large'>
                                    Tallenna sähköpostina
                                </TextButton>
                            </Box>

                            {/* Legacy ----- */}

                            {/* <Box p="1rem">
        {course && <ChatInfo course={course} />}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <OutlineButtonBlack startIcon={<RestartAltIcon />} onClick={handleReset} data-testid="empty-conversation-button">
            {t('chat:emptyConversation')}
          </OutlineButtonBlack>
          <ModelSelector currentModel={currentModel} setModel={setModel} isTokenLimitExceeded={isTokenLimitExceeded} />
          <PromptSelector />
          <EmailButton messages={messages} disabled={!messages?.length} />
          <OutlineButtonBlack startIcon={<Tune />} onClick={() => setSettingsModalOpen(true)} data-testid="settings-button">
            {t('chat:settings')}
          </OutlineButtonBlack>
          <OutlineButtonBlack startIcon={<HelpIcon />} onClick={() => setDisclaimerStatus(true)} data-testid="help-button">
            {t('info:title')}
          </OutlineButtonBlack>
        </Box>
      </Box> */}
                            {/* {onClose && (
        <OutlineButtonBlack sx={{ m: '1rem', mt: 'auto' }} onClick={onClose} startIcon={<ChevronLeft />}>
          {t('common:close')}
        </OutlineButtonBlack>
      )} */}
                            {/* <Footer /> */}
                        </Box>
                }
            </Box>

        </Box>

    )
}

export default SideBar