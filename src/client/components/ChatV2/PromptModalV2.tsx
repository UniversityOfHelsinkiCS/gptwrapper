import { Box, Divider, ListItemButton, ListItemText, Typography, Paper, IconButton, ListItemIcon, Tooltip } from '@mui/material'
import { enqueueSnackbar } from 'notistack'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import useCurrentUser from '../../hooks/useCurrentUser'
import type { Course, Prompt as PromptType } from '../../types'
import { PromptEditorV2 } from '../Prompt/PromptEditorV2'
import { usePromptState } from './PromptState'
import { useMediaQuery, useTheme } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { BlueButton, OutlineButtonBlue } from './general/Buttons.tsx'
import ConfirmDialog from './general/ConfirmDialog'
import { usePromptEditorState } from '../Prompt/context.tsx'
import { PromptListItem } from './PromptModal.tsx'
import AddIcon from '@mui/icons-material/Add'
import PersonIcon from '@mui/icons-material/Person'
import PromptPreview from './PromptPreview.tsx'
import CoursePrompts from './CoursePrompts.tsx'
import CoursePreview from './CoursePreview.tsx'
import ChevronRight from '@mui/icons-material/ChevronRight'
import ExpandMore from '@mui/icons-material/ExpandMore'
import useUserCourses from '../../hooks/useUserCourses'
import { getGroupedCourses } from './util'

const PromptModalV2 = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const { activePrompt, handleChangePrompt, myPrompts, deletePromptMutation } = usePromptState()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [deleteConfirm, setDeleteConfirm] = useState<PromptType | null>(null)
  const [previewPrompt, setPreviewPrompt] = useState<PromptType | undefined>(isMobile ? undefined : activePrompt)
  const [previewCourse, setPreviewCourse] = useState<Course | undefined>(undefined)
  const [isEditing, setIsEditing] = useState(false)
  const [showMyPrompts, setShowMyPrompts] = useState(myPrompts.some((p) => p.id === previewPrompt?.id) || false)

  const { hasChanges, setHasChanges, cacheKey, setCacheKey } = usePromptEditorState()

  const { user } = useCurrentUser()

  const studentsCourses = user?.enrolledCourses as Course[]
  const { courses } = useUserCourses()
  const { curreEnabled, curreDisabled } = getGroupedCourses(courses)
  const mergedCourses = courses ? [...curreEnabled, ...curreDisabled, ...studentsCourses] : studentsCourses ? studentsCourses : []
  const userCourses = Array.from(new Map(mergedCourses.map((course) => [course.id, course])).values())

  const [isPersonal, setIsPersonal] = useState<boolean>(false)
  const [courseId, setCourseId] = useState<string>('general')

  const onDone = (prompt?: PromptType) => {
    setIsEditing(false)
    setPreviewPrompt(prompt)
  }

  const handleDelete = (event: React.MouseEvent<HTMLButtonElement>, prompt: PromptType) => {
    event.stopPropagation()
    setDeleteConfirm(prompt)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    const prompt = deleteConfirm
    setDeleteConfirm(null)
    try {
      await deletePromptMutation(prompt.id)
      enqueueSnackbar(`${t('common:delete')} ${prompt.name}`, { variant: 'success' })
      if (previewPrompt?.id === prompt.id) setPreviewPrompt(undefined)
    } catch (error) {
      enqueueSnackbar(`Error: ${error}`, { variant: 'error' })
    }
  }

  const handleEdit = (courseId?: string) => {
    setIsEditing(!isEditing)
    setCourseId(courseId ?? 'general')
  }

  const handleCreateNew = (courseId?: string) => {
    if (!confirmClose()) return
    if (isEditing) {
      setIsEditing(false)
      return
    }
    setPreviewPrompt(undefined)
    setIsEditing(true)
    setCourseId(courseId ?? 'general')
    if (!courseId) {
      setIsPersonal(true)
    } else {
      setIsPersonal(false)
    }
  }

  const handleMobileBackToPromptList = () => {
    setPreviewPrompt(undefined)
    setPreviewCourse(undefined)
  }

  const confirmClose = () => {
    if (!hasChanges || !isEditing) return true

    const shouldClose = window.confirm(t('prompt:unSavedChanges'))

    if (!shouldClose) return false

    setHasChanges(false)
    localStorage.removeItem(cacheKey)
    setCacheKey('')
    return true
  }

  const sortedMyPrompts = myPrompts.sort((a, b) => a.name.localeCompare(b.name, 'fi', { sensitivity: 'base' }))

  if (!user) return null

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Box sx={{ display: 'flex', gap: 2, flex: 1, minHeight: 0 }}>
        {/* Left panel - prompt list */}
        <Box
          sx={{
            display: !isMobile || (!previewPrompt && !previewCourse && !isEditing) ? 'flex' : 'none',
            width: !isMobile ? 350 : '90vw',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ overflowY: 'auto', mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', borderRadius: 1, '&:hover': { backgroundColor: 'action.hover' } }}>
              <ListItemButton
                onClick={() => setShowMyPrompts(true)}
                sx={{
                  px: 1,
                  borderRadius: 1,
                  flex: 1,
                  minWidth: 0,
                  '&:hover': { backgroundColor: 'transparent' },
                }}
                data-testid="my-prompts-open"
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <PersonIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary={t('settings:myPrompts')} slotProps={{ primary: { variant: 'subtitle1', fontWeight: 600 } }} />
              </ListItemButton>

              <Tooltip title={t('settings:saveNewPrompt')}>
                <IconButton
                  aria-label={t('settings:saveNewPrompt')}
                  onClick={() => handleCreateNew()}
                  data-testid="create-myprompt-button"
                  sx={{ color: 'primary.main' }}
                >
                  <AddIcon />
                </IconButton>
              </Tooltip>

              <IconButton
                aria-label={t('course:togglePrompts')}
                onClick={() => setShowMyPrompts((open) => !open)}
                data-testid="my-prompts-toggle"
                sx={{ color: 'text.secondary' }}
              >
                {showMyPrompts ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
              </IconButton>
            </Box>
            {showMyPrompts && sortedMyPrompts.length > 0 ? (
              sortedMyPrompts.map((course) => (
                <Box key={course.id} sx={{ ml: 4 }}>
                  <PromptListItem
                    key={course.id}
                    prompt={course}
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
                    onSelect={(prompt) => {
                      if (!confirmClose()) return
                      handleChangePrompt(prompt)
                      navigate(`/general`)
                    }}
                  />
                </Box>
              ))
            ) : showMyPrompts && !sortedMyPrompts.length ? (
              <Box sx={{ ml: 6, mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('settings:noPrompts')}
                </Typography>
              </Box>
            ) : null}

            {userCourses.length > 0 && (
              <Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {userCourses.map((course, index) => (
                    <Box key={course.id}>
                      {index > 0 && <Divider sx={{ mb: 1 }} />}
                      <CoursePrompts
                        course={course}
                        previewPrompt={previewPrompt}
                        confirmClose={confirmClose}
                        setPreviewPrompt={setPreviewPrompt}
                        setIsEditing={setIsEditing}
                        setPreviewCourse={setPreviewCourse}
                        previewCourse={previewCourse}
                        handleCreateNew={handleCreateNew}
                      />
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </Box>
        <Divider sx={{ display: isMobile ? 'none' : 'flex' }} orientation="vertical" flexItem />
        {/* Right panel - preview */}
        {!isEditing && (
          <Box
            sx={{ display: !isMobile || previewPrompt || previewCourse ? 'flex' : 'none', maxWidth: !isMobile ? '100%' : '90vw', flex: 1, overflow: 'hidden' }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', flex: 1, minHeight: 0, mt: 2 }}>
              {previewPrompt ? (
                <PromptPreview prompt={previewPrompt} handleEdit={handleEdit} handleDelete={handleDelete} courses={userCourses} />
              ) : previewCourse ? (
                <CoursePreview course={previewCourse} />
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', height: '100%', color: 'text.secondary' }}>
                  <Typography>{t('settings:noPrompt')}</Typography>
                </Box>
              )}
              <Box sx={{ pt: 2, display: 'flex', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
                {isMobile && (previewPrompt || previewCourse) && (
                  <OutlineButtonBlue onClick={() => handleMobileBackToPromptList()}>
                    <ArrowBackIcon />
                    {t('prompt:backToPromptList')}
                  </OutlineButtonBlue>
                )}
                {previewPrompt && (
                  <BlueButton
                    data-testid="change-to-prompt-button"
                    variant="contained"
                    onClick={() => {
                      if (!confirmClose()) return
                      handleChangePrompt(previewPrompt)
                      const course = userCourses?.find((c) => c.id === previewPrompt.chatInstanceId)
                      if (course && course.courseId) navigate(`/${course.courseId}`)
                      if (!course) navigate(`/general`)
                    }}
                  >
                    {t('settings:choosePrompt')}
                  </BlueButton>
                )}
              </Box>
            </Box>
          </Box>
        )}
        {isEditing && (
          <Box sx={{ display: 'flex', maxWidth: !isMobile ? '100%' : '90vw', flex: 1, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', flex: 1, minHeight: 0 }}>
              <Paper variant="outlined" sx={{ p: 3, borderRadius: '12px', overflow: 'auto', maxHeight: '100%' }}>
                <PromptEditorV2 previewPrompt={previewPrompt} onDone={onDone} personal={isPersonal} courseId={courseId} />
              </Paper>
            </Box>
          </Box>
        )}
      </Box>

      <ConfirmDialog
        open={!!deleteConfirm}
        title={t('settings:confirmDeletePromptTitle')}
        message={t('settings:confirmDeletePrompt', { name: deleteConfirm?.name })}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm(null)}
      />
    </Box>
  )
}

export default PromptModalV2
