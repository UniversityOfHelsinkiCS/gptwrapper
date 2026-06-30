import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import { Box, List, ListItemButton, ListItemText, Typography, IconButton } from '@mui/material'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import useCourse from '../../hooks/useCourse'
import type { Course, Prompt as PromptType } from '../../types'
import { usePromptState } from './PromptState'
import { PromptListItem } from './PromptModal.tsx'



interface CoursePromptsProps {
  course: Course
  previewPrompt?: PromptType
  confirmClose: () => boolean
  setPreviewPrompt: (prompt: PromptType | undefined) => void
  setIsEditing: (isEditing: boolean) => void
  setPreviewCourse: (course: Course | undefined) => void

}

const CoursePrompts = (props: CoursePromptsProps) => {
  const { course, previewPrompt, confirmClose, setPreviewPrompt, setIsEditing, setPreviewCourse } = props
  const { t, i18n } = useTranslation()
  const { language } = i18n
  const { activePrompt, handleChangePrompt } = usePromptState()
  const navigate = useNavigate()

  const { data: courseData, isLoading } = useCourse(course.courseId) 
  const [showPrompts, setShowPrompts] = useState(previewPrompt?.chatInstanceId === course.id || false)

  
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


  const sortedPrompts = currentPrompts.sort((a, b) =>
    a.name.localeCompare(b.name, 'fi', { sensitivity: 'base' })
  )

  const handleSelect = (prompt?: PromptType) => {
    if (!confirmClose()) return
    if (!course.courseId) return
    handleChangePrompt(prompt)
    if (course.courseId) navigate(`/${course.courseId}`)
  }
  
  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <IconButton
            onClick={() => setShowPrompts((open) => !open)}
            data-testid={`show-course-info-${course.id}-button`}
            sx={{ color: 'primary.main', borderRadius: 1 }}
          >
            {showPrompts ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}       
          </IconButton>
          <ListItemButton
            onClick={() => {
              setPreviewCourse(course)
              setPreviewPrompt(undefined)
            }}
            sx={{ 
              px: 1, 
              borderRadius: 1,
              flex: 1,
              gap: 2,
              '&:hover': {
                backgroundColor: 'transparent',
              }
            }}
            data-testid={`course-prompts-toggle-${course.id}`}
          >
            <ListItemText
              primary={course.name[language]}
              slotProps={{ primary: { variant: 'subtitle1'} }}
            />
          </ListItemButton>
          
        </Box>
        {showPrompts && sortedPrompts.length > 0 ? (
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
        ) : showPrompts && !sortedPrompts.length ? (
          <Box sx={{ ml: 3, mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('settings:noPrompts')}
            </Typography>
          </Box>
        ) : null}
      </Box>
    </Box>
  )
}

export default CoursePrompts