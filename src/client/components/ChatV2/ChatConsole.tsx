import { Box, Chip, Divider, Link, Tooltip, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import type { Course, Prompt, User } from '../../types'
import { TextButton } from './general/Buttons'
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
import { formatDate } from '../Courses/util'
import { usePromptState } from './PromptState'
import { useNavigate } from 'react-router-dom'

const CourseStatus = ({ course }: { course?: Course }) => {
	const { t } = useTranslation()

	if (!course) return null;
	const courseEnabled = course.usageLimit > 0;
	const courseEnded = Date.parse(course.activityPeriod.endDate) < Date.now();

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

export default function ChatConsole({ user, course }: { user?: User | null, course?: Course }) {
	const navigate = useNavigate()
	const { courseId } = useParams()
	const { t, i18n } = useTranslation()
	const { activePrompt, handleChangePrompt, myPrompts } = usePromptState()
	const { language } = i18n
	const amongResponsibles = user?.isAdmin || course?.responsibilities.some((r) => r.user.id === user?.id)

	const showEditPrompt = (prompt: Prompt) => {
		return amongResponsibles || courseId === 'general' || myPrompts.some((a: Prompt) => a.id === prompt.id)
	}

	return (
		<>
			<Box p={3}>
				<Typography mb={0.5} color="textSecondary">
					{t('sidebar:courseTitle').toUpperCase()}
				</Typography>
				{course ? (
					<>
						<Box mb={1} sx={{ border: '1px solid rgba(0,0,0,0.2)', borderRadius: '0.5rem', p: 2 }}>
							<CourseStatus course={course} />
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
						{showEditPrompt(activePrompt) && (
							<TextButton
								data-testid="edit-prompt-button"
								startIcon={<TuneIcon />}
								onClick={() => navigate(courseId ? `/${courseId}/prompt/${activePrompt.id}` : `/prompt/${activePrompt.id}`)}
							>
								{t('sidebar:promptEdit')}
							</TextButton>
						)}
						<TextButton data-testid="prompt-details-button" startIcon={<HelpCenterIcon />} onClick={() => navigate(`/${courseId}/show/${activePrompt.id}`)}>
							{t('sidebar:promptDetails')}
						</TextButton>
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
		</>
	)
}
