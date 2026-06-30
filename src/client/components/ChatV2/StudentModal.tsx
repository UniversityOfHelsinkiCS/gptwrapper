import { Box, Divider, ListItemButton, ListItemText, Typography, Paper, IconButton, ListItemIcon} from '@mui/material'
import { enqueueSnackbar } from 'notistack'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import useCurrentUser from '../../hooks/useCurrentUser'
import type { Course, Prompt as PromptType } from '../../types'
import { PromptEditor } from '../Prompt/PromptEditor'
import { usePromptState } from './PromptState'
import { useMediaQuery, useTheme } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { BlueButton, OutlineButtonBlue } from './general/Buttons.tsx'
import ConfirmDialog from './general/ConfirmDialog'
import { usePromptEditorState } from '../Prompt/context.tsx'
import { PromptListItem } from './PromptModal.tsx'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import SchoolIcon from '@mui/icons-material/School'
import PersonIcon from '@mui/icons-material/Person'
import PromptPreview from './PromptPreview.tsx'
import CoursePrompts from './CoursePrompts.tsx'
import CoursePreview from './CoursePreview.tsx'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'



const StudentModal = () => {
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
  const [showCoursePrompts, setShowCoursePrompts] = useState((previewPrompt && !myPrompts.some((p) => p.id === previewPrompt.id)) || false)
  
  const { hasChanges, setHasChanges, cacheKey, setCacheKey } = usePromptEditorState()

  const { user } = useCurrentUser()

  const studentsCourses = user?.enrolledCourses as Course[]

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


  const handleEdit = () => {
    setIsEditing(!isEditing)
  }

  const handleCreateNew = () => {
    if (!confirmClose()) return
    if (isEditing) {
      setIsEditing(false)
      return
    }
    setPreviewPrompt(undefined)
    setIsEditing(true)
  }

  const handleMobileBackToPromptList = () => {
    setPreviewPrompt(undefined)
    setPreviewCourse(undefined)
  }

  const confirmClose = () => {
    if (!hasChanges || !isEditing) return true

    const shouldClose = window.confirm(
      t('prompt:unSavedChanges'),
    )

    if (!shouldClose) return false

    setHasChanges(false)
    localStorage.removeItem(cacheKey)
    setCacheKey('')
    return true
  }

  const sortedMyPrompts = myPrompts.sort((a, b) =>
    a.name.localeCompare(b.name, 'fi', { sensitivity: 'base' })
  )

  if (!user) return null

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Box sx={{ display: 'flex', gap: 2, mt: 2, flex: 1, minHeight: 0 }}>
        {/* Left panel - prompt list */}
        <Box
          sx={{
            display: !isMobile || (!previewPrompt && !previewCourse && !isEditing) ? 'flex' : 'none',
            width: !isMobile ? 350 : '90vw',
            flexDirection: 'column',
          }}
        >            
        <Box sx={{ overflowY: 'auto', mt: 1 }}>
          <ListItemButton
            onClick={() => setShowMyPrompts((open) => !open)}
            sx={{ 
              px: 1, 
              borderRadius: 1, 
              backgroundColor: !showMyPrompts ? 'background.subtle' : 'action.selected',
              ...(showMyPrompts && {
                borderLeft: '2px solid',
                borderLeftColor: 'primary.main',
              }),
            }}
            data-testid={`my-prompts-toggle`}
          >
            <ListItemIcon>
              <PersonIcon />
            </ListItemIcon>
            <ListItemText
              primary={t('settings:myPrompts')} 
              slotProps={{ primary: { variant: 'subtitle1' } }}
            />
            {showMyPrompts ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </ListItemButton>
            {showMyPrompts && (
              <IconButton
                aria-label={t('settings:saveMyPrompt')}
                onClick={handleCreateNew}
                data-testid="create-myprompt-button"
                sx={{ color: 'primary.main', borderRadius: 1 }}
              >
                <AddCircleIcon/>
                <ListItemText
                  primary={t('settings:saveNewPrompt')}
                  slotProps={{ primary: { noWrap: true } }}
                  sx={{ minWidth: 0, ml: 1 }}
                />
              </IconButton>
            )}           
            {showMyPrompts && sortedMyPrompts.length > 0 ?
            sortedMyPrompts.map((course) => 
            <Box key={course.id} sx={{ ml: 3 }}>
              <PromptListItem
                key={course.id} 
                prompt={course}
                previewPromptId={previewPrompt?.id}
                activePromptId={activePrompt?.id}
                confirmClose={confirmClose}
                choosePromptLabel={t('settings:choosePrompt')}
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
            ) : showMyPrompts && !sortedMyPrompts.length ? (
              <Box sx={{ ml: 3, mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('settings:noPrompts')}
                </Typography>
              </Box>
            ) : null}
            
            {studentsCourses.length > 0 && (   
              <Box>
                <Divider sx={{ p: 1 }} />
                <ListItemButton
                    onClick={() => setShowCoursePrompts((open) => !open)}
                    sx={{
                      px: 1,
                      borderRadius: 1,
                      backgroundColor: !showCoursePrompts ? 'background.subtle' : 'action.selected',
                      ...(showCoursePrompts && {
                        borderLeft: '2px solid',
                        borderLeftColor: 'primary.main',
                      }),
                    }}
                    data-testid={`course-prompts-toggle`}
                  >
                    <ListItemIcon>
                      <SchoolIcon />
                    </ListItemIcon>

                    <ListItemText
                      primary={t('prompt:coursePrompts')}
                      slotProps={{ primary: { variant: 'subtitle1' } }} />
                    {showCoursePrompts ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                  </ListItemButton>
                    <Box sx={{ height: 6 }} /><Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, ml: 2 }}>
                      {showCoursePrompts && studentsCourses.map((course) => 
                      <CoursePrompts
                        key={course.id}
                        course={course}
                        previewPrompt={previewPrompt}
                        confirmClose={confirmClose}
                        setPreviewPrompt={setPreviewPrompt}
                        setIsEditing={setIsEditing} 
                        setPreviewCourse={setPreviewCourse}
                      />
                      )}
                    </Box>
                </Box>
              )}
            </Box>
        </Box>
        <Divider sx={{ display: isMobile ? 'none' : 'flex' }} orientation="vertical" flexItem />
        {/* Right panel - preview */}
        {!isEditing && (
          <Box sx={{ display: !isMobile || previewPrompt || previewCourse ? 'flex' : 'none', maxWidth: !isMobile ? '100%' : '90vw', flex: 1, overflow: 'hidden' }}>
            {previewPrompt ? (            
              <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', flex: 1, minHeight: 0 }}>
                <PromptPreview
                  prompt={previewPrompt}
                  handleEdit={handleEdit}
                  handleDelete={handleDelete}
                />
                <Box sx={{ pt: 2, display: 'flex', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
                  {isMobile && (
                    <OutlineButtonBlue onClick={() => handleMobileBackToPromptList()}>
                      <ArrowBackIcon />
                      {t('prompt:backToPromptList')}
                    </OutlineButtonBlue>
                  )}
                  <BlueButton 
                    data-testid="change-to-prompt-button" 
                    variant="contained" 
                    onClick={() => {
                      if (!confirmClose()) return
                      handleChangePrompt(previewPrompt)
                      const course = studentsCourses?.find((c) => c.id === previewPrompt.chatInstanceId)
                      if (course && course.courseId) navigate(`/${course.courseId}`)
                      if (!course) navigate(`/general`)
                    }}>
                    {t('settings:choosePrompt')}
                  </BlueButton>
                </Box>
              </Box>
            ) : previewCourse ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', flex: 1, minHeight: 0 }}>
                <CoursePreview course={previewCourse}/>
                <Box sx={{ pt: 2, display: 'flex', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
                  {isMobile && (
                    <OutlineButtonBlue onClick={() => handleMobileBackToPromptList()}>
                      <ArrowBackIcon />
                      {t('prompt:backToPromptList')}
                    </OutlineButtonBlue>
                  )}
                </Box>
              </Box>
              
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', height: '100%', color: 'text.secondary' }}>
                <Typography>{t('settings:noPrompt')}</Typography>
              </Box>
            )}
          </Box>
        )}
        {isEditing && (
          <Box sx={{ display:'flex', maxWidth: !isMobile ? '100%' : '90vw', flex: 1, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', flex: 1, minHeight: 0 }}>
              <Paper variant="outlined" sx={{ p: 3, borderRadius: '12px', overflow: 'auto', maxHeight: '100%' }}>
                <PromptEditor previewPrompt={previewPrompt} onDone={onDone} personal={true} />
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

export default StudentModal