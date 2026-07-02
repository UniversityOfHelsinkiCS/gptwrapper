import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import { Box, List, ListItemButton, ListItemText, Typography, ListItemIcon, IconButton } from '@mui/material'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import useCourse from '../../hooks/useCourse'
import type { Course, Prompt as PromptType } from '../../types'
import { usePromptState } from './PromptState'
import { PromptListItem } from './PromptModal.tsx'
import SchoolIcon from '@mui/icons-material/School'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import useCurrentUser from '../../hooks/useCurrentUser'
import { useMediaQuery, useTheme } from '@mui/material'
import PreviewIcon from '@mui/icons-material/Preview'

interface CoursePromptsProps {
  course: Course
  previewPrompt?: PromptType
  confirmClose: () => boolean
  setPreviewPrompt: (prompt: PromptType | undefined) => void
  setIsEditing: (isEditing: boolean) => void
  setPreviewCourse: (course: Course | undefined) => void
  previewCourse?: Course
  handleCreateNew: (courseId?: string) => void
}

const CoursePrompts = (props: CoursePromptsProps) => {
  const { course, previewPrompt, confirmClose, setPreviewPrompt, setIsEditing, setPreviewCourse, previewCourse, handleCreateNew } = props
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const { language } = i18n
  const { activePrompt, handleChangePrompt } = usePromptState()
  const navigate = useNavigate()
  const { user } = useCurrentUser()

  const { data: courseData, isLoading } = useCourse(course.courseId)
  const [showPrompts, setShowPrompts] = useState(previewPrompt?.chatInstanceId === course.id || false)

  const amongResponsibles = courseData?.responsibilities ? courseData.responsibilities.some((r) => r.user.id === user?.id) : false

  const currentPrompts = courseData?.prompts || []

  useEffect(() => {
    if (!previewPrompt) return

    const thisCourseId = course.courseId ?? course.id
    const previewPromptCourseId = previewPrompt.chatInstanceId

    if (previewPromptCourseId !== thisCourseId) return

    const currentPrompt = currentPrompts.find((prompt) => previewPrompt.id === prompt.id)
    setPreviewPrompt(currentPrompt)
  }, [currentPrompts])

  if (isLoading) return null

  const sortedPrompts = currentPrompts.sort((a, b) => a.name.localeCompare(b.name, 'fi', { sensitivity: 'base' }))

  const handleSelect = (prompt?: PromptType) => {
    if (!confirmClose()) return
    if (!course.courseId) return
    handleChangePrompt(prompt)
    navigate(`/${course.courseId}`)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <ListItemButton
            onClick={() => {
              if (!showPrompts && !isMobile) {
                setPreviewCourse(course)
                setPreviewPrompt(undefined)
              }
              setShowPrompts((open) => !open)
            }}
            sx={{
              px: 1,
              borderRadius: 1,
              ...(isMobile
                ? {
                    backgroundColor: 'action.selected',
                    '&:hover': {
                      backgroundColor: 'action.selected',
                    },
                  }
                : previewCourse?.id === course.id
                  ? {
                      backgroundColor: 'background.subtle',
                      borderLeft: '2px solid',
                      borderLeftColor: 'primary.main',
                    }
                  : {}),
            }}
            data-testid={`show-course-info-${course.id}-button`}
          >
            <ListItemIcon>
              <SchoolIcon color={course.activated || !amongResponsibles || user?.isAdmin ? 'primary' : 'disabled'} />
            </ListItemIcon>
            <ListItemText
              primary={course.name[language]}
              slotProps={{ primary: { variant: 'subtitle1', color: course.activated || !amongResponsibles || user?.isAdmin ? 'default' : 'text.secondary' } }}
            />
            {showPrompts ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </ListItemButton>
        </Box>
        {showPrompts && (
          <>
            {isMobile && (
              <Box sx={{ ml: 3 }}>
                <IconButton
                  aria-label={t('course:showCourse')}
                  onClick={() => setPreviewCourse(course)}
                  data-testid={`show-course-info-${course.id}-mobile-button`}
                  sx={{ color: 'primary.main', borderRadius: 1, '&:hover': { backgroundColor: 'transparent' } }}
                >
                  <PreviewIcon />
                  <ListItemText primary={t('course:showCourse')} slotProps={{ primary: { noWrap: true } }} sx={{ minWidth: 0, ml: 1 }} />
                </IconButton>
              </Box>
            )}

            {(amongResponsibles || user?.isAdmin) && (
              <Box sx={{ ml: 3 }}>
                <IconButton
                  aria-label={t('settings:saveMyPrompt')}
                  onClick={() => handleCreateNew(course.courseId)}
                  data-testid="create-myprompt-button"
                  sx={{ color: 'primary.main', borderRadius: 1, '&:hover': { backgroundColor: 'transparent' } }}
                >
                  <AddCircleIcon />
                  <ListItemText primary={t('settings:saveNewPrompt')} slotProps={{ primary: { noWrap: true } }} sx={{ minWidth: 0, ml: 1 }} />
                </IconButton>
              </Box>
            )}

            {sortedPrompts.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, ml: 2, mb: 1 }}>
                <List sx={{ py: 0 }}>
                  {sortedPrompts.map((prompt) => (
                    <PromptListItem
                      key={prompt.id}
                      prompt={prompt}
                      previewPromptId={previewPrompt?.id}
                      activePromptId={activePrompt?.id}
                      confirmClose={confirmClose}
                      choosePromptLabel={t('settings:choosePrompt')}
                      onPreview={(selectedPrompt) => {
                        setPreviewPrompt(selectedPrompt)
                        setIsEditing(false)
                        setPreviewCourse(undefined)
                      }}
                      onSelect={handleSelect}
                    />
                  ))}
                </List>
              </Box>
            ) : (
              <Box sx={{ ml: 5, mt: 1 }}>
                <Typography variant="body1" color="text.secondary">
                  {t('settings:noPrompts')}
                </Typography>
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  )
}

export default CoursePrompts

