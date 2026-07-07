import ChevronRight from '@mui/icons-material/ChevronRight'
import ExpandMore from '@mui/icons-material/ExpandMore'
import { Box, List, ListItemButton, ListItemText, Typography, IconButton, Tooltip } from '@mui/material'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import useCourse from '../../hooks/useCourse'
import type { Course, Prompt as PromptType } from '../../types'
import { usePromptState } from './PromptState'
import { PromptListItem } from './PromptModalV2.tsx'
import AddIcon from '@mui/icons-material/Add'
import useCurrentUser from '../../hooks/useCurrentUser'

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
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            borderRadius: 1,
            '&:hover': { backgroundColor: 'action.hover' },
            ...(previewCourse?.id === course.id
              ? {
                  backgroundColor: 'background.subtle',
                  borderLeft: '2px solid',
                  borderLeftColor: 'primary.main',
                }
              : {}),
          }}
        >
          <ListItemButton
            onClick={() => {
              setPreviewCourse(course)
              setPreviewPrompt(undefined)
              setShowPrompts(true)
            }}
            sx={{
              px: 1,
              borderRadius: 1,
              flex: 1,
              minWidth: 0,
              '&:hover': { backgroundColor: 'transparent' },
            }}
            data-testid={`show-course-info-${course.id}-button`}
          >
            <ListItemText
              primary={course.name[language]}
              slotProps={{
                primary: {
                  variant: 'subtitle1',
                  fontWeight: 600,
                  color: course.activated || !amongResponsibles || user?.isAdmin ? 'default' : 'text.secondary',
                },
              }}
            />
          </ListItemButton>

          {(amongResponsibles || user?.isAdmin) && (
            <Tooltip title={t('settings:saveNewPrompt')}>
              <IconButton
                aria-label={t('settings:saveNewPrompt')}
                onClick={() => handleCreateNew(course.courseId)}
                data-testid="create-myprompt-button"
                sx={{ color: 'primary.main' }}
              >
                <AddIcon />
              </IconButton>
            </Tooltip>
          )}

          <IconButton
            aria-label={t('course:togglePrompts')}
            onClick={() => setShowPrompts((open) => !open)}
            data-testid={`toggle-course-prompts-${course.id}-button`}
            sx={{ color: 'text.secondary' }}
          >
            {showPrompts ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
          </IconButton>
        </Box>
        {showPrompts && (
          <>
            {sortedPrompts.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, ml: 0, mb: 1 }}>
                <List sx={{ py: 0 }}>
                  {sortedPrompts.map((prompt) => (
                    <PromptListItem
                      key={prompt.id}
                      prompt={prompt}
                      previewPromptId={previewPrompt?.id}
                      activePromptId={activePrompt?.id}
                      confirmClose={confirmClose}
                      choosePromptLabel={t('settings:choosePrompt')}
                      activeLabel={t('settings:promptInUse')}
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
              <Box sx={{ ml: 2, mt: 1 }}>
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
