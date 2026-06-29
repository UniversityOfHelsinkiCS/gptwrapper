import { PUBLIC_URL } from '@config'
import { ContentCopyOutlined, EditOutlined } from '@mui/icons-material'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import DeleteOutline from '@mui/icons-material/DeleteOutline'
import { Box, Divider, List, ListItemButton, ListItemText, Typography, Paper, Tooltip, IconButton, ListItemIcon} from '@mui/material'
import { enqueueSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import useCourse from '../../hooks/useCourse'
import useCurrentUser from '../../hooks/useCurrentUser'
import type { Course, Prompt as PromptType } from '../../types'
import { PromptEditor } from '../Prompt/PromptEditor'
import { usePromptState } from './PromptState'
import PsychologyIcon from '@mui/icons-material/Psychology'
import { useMediaQuery, useTheme } from '@mui/material'
import { alpha } from '@mui/material/styles'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { BlueButton, OutlineButtonBlue } from './general/Buttons.tsx'
import ConfirmDialog from './general/ConfirmDialog'
import { monospaceStyle } from '../../theme'
import BookmarksIcon from '@mui/icons-material/Bookmarks'
import { useCourseRagIndices } from '../../hooks/useRagIndices'
import { usePromptEditorState } from '../Prompt/context.tsx'
import { PromptListItem } from './PromptModal.tsx'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import SchoolIcon from '@mui/icons-material/School'
import PersonIcon from '@mui/icons-material/Person'


interface CoursePromptsProps {
  course: Course
  previewPrompt?: PromptType
  confirmClose: () => boolean
  setPreviewPrompt: (prompt: PromptType | undefined) => void
  setIsEditing: (isEditing: boolean) => void

}

const CoursePrompts = (props: CoursePromptsProps) => {
  const { course, previewPrompt, confirmClose, setPreviewPrompt, setIsEditing } = props
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
        <ListItemButton
          onClick={() => setShowPrompts((open) => !open)}
          sx={{ 
            px: 1, 
            borderRadius: 1,
            
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
          {showPrompts ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          
        </ListItemButton>
        {showPrompts ? (
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
                  }}
                  onSelect={handleSelect}
                />
              ))}
            </List>
          </Box>
        ) : null}
      </Box>
    </Box>
  )
        
}


const StudentModal = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const { activePrompt, handleChangePrompt, myPrompts, deletePromptMutation } = usePromptState()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [deleteConfirm, setDeleteConfirm] = useState<PromptType | null>(null)
  const [previewPrompt, setPreviewPrompt] = useState<PromptType | undefined>(isMobile ? undefined : activePrompt)
  const [isEditing, setIsEditing] = useState(false)
  const [showMyPrompts, setShowMyPrompts] = useState(myPrompts.some((p) => p.id === previewPrompt?.id) || false)
  const [showCoursePrompts, setShowCoursePrompts] = useState((previewPrompt && !myPrompts.some((p) => p.id === previewPrompt.id)) || false)
  
  
  const { hasChanges, setHasChanges, cacheKey, setCacheKey } = usePromptEditorState()

  const { user } = useCurrentUser()

  const studentsCourses = user?.enrolledCourses as Course[]

  const courseId = studentsCourses.find((course) => course.id === previewPrompt?.chatInstanceId)?.courseId ?? 'general' 
  
  

  const { data: chatInstance } = useCourse(courseId)


  
 
  const { ragIndices } = useCourseRagIndices(chatInstance?.id, false)
  type RagIndex = NonNullable<typeof ragIndices>[number]
  const [rag, setRag] = useState<RagIndex | undefined>(undefined)

  useEffect(() => {
    setRag(ragIndices?.find((r) => r.id === previewPrompt?.ragIndexId))
  }, [previewPrompt?.ragIndexId, ragIndices])


  


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

  const handleCopyLink = (event: React.MouseEvent<HTMLButtonElement>, prompt: PromptType) => {
    event.stopPropagation()
    const course = studentsCourses?.find((c) => c.id === prompt.chatInstanceId)
    const link = `${window.location.origin}${PUBLIC_URL}/${course?.courseId}?promptId=${prompt.id}`
    navigator.clipboard.writeText(link)
    enqueueSnackbar(t('common:copiedToClipboard'), { variant: 'success' })
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
            display: !isMobile || (!previewPrompt && !isEditing) ? 'flex' : 'none',
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
            {showMyPrompts && sortedMyPrompts.map((course) => 
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
                }}
                onSelect={(prompt) => {
                  if (!confirmClose()) return
                  handleChangePrompt(prompt)
                  navigate(`/general`)
                }}
              />
              </Box>
            )}
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
              slotProps={{ primary: { variant: 'subtitle1' } }}
            />
            {showCoursePrompts ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </ListItemButton>
            <Box sx={{ height: 6 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, ml:2 }}>
            {showCoursePrompts && studentsCourses.map((course) => 
              <CoursePrompts 
                key={course.id} 
                course={course} 
                previewPrompt={previewPrompt} 
                confirmClose={confirmClose} 
                setPreviewPrompt={setPreviewPrompt} 
                setIsEditing={setIsEditing}
              />
            )}
            </Box>
          </Box>
        </Box>
        <Divider sx={{ display: isMobile ? 'none' : 'flex' }} orientation="vertical" flexItem />
        {/* Right panel - preview */}
        {!isEditing && (
          <Box sx={{ display: !isMobile || previewPrompt ? 'flex' : 'none', maxWidth: !isMobile ? '100%' : '90vw', flex: 1, overflow: 'hidden' }}>
            {previewPrompt ? (            
              <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', flex: 1, minHeight: 0 }}>
                <Paper variant="outlined" sx={{ p: 3, borderRadius: '12px', overflow: 'auto', maxHeight: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, mt: 2 }}>
                    <Box sx={{ flexDirection: 'column', display: 'flex', gap: 1, maxWidth: '80%' }}>  
                    <Typography variant="h4" fontWeight="bold" data-testid={`prompt-preview-title-for-${previewPrompt.name}`} sx={{ wordBreak: 'break-word' }}>
                      {previewPrompt.name}
                    </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      {(myPrompts.some((p) => p.id === previewPrompt.id)) && (
                        <Tooltip arrow placement="bottom" title={t('prompt:editPromptTooltip')}>
                          <IconButton size="small" onClick={handleEdit} color="primary" data-testid={`edit-prompt-${previewPrompt.name}`}>
                            <EditOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip arrow placement="bottom" title={t('prompt:copyPromptUrlTooltip')}>
                        <IconButton size="small" onClick={(e) => handleCopyLink(e, previewPrompt)}>
                          <ContentCopyOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {(myPrompts.some((p) => p.id === previewPrompt.id)) && (
                        <Tooltip arrow placement="bottom" title={t('prompt:deletePromptTooltip')}>
                          <IconButton
                            size="small"
                            onClick={(event) => handleDelete(event, previewPrompt)}
                            color="error"
                            data-testid={`delete-prompt-${previewPrompt.name}`}
                          >
                            <DeleteOutline fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                  {previewPrompt.userInstructions && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {previewPrompt.userInstructions}
                      </Typography>
                    </Box>
                  )}
                  <Divider sx={{ my: 3 }} />
                  <Box sx={{ mb: 3 }}>
                    <Box gap={1} sx={{ display: 'flex', alignItems: 'center', mb:1.5 }}>
                      <PsychologyIcon color="secondary" />
                      <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                        {t('prompt:promptModelSettings')}
                      </Typography>
                    </Box>
                    <Paper variant="outlined" sx={{ p: 3, mt: 1.5, backgroundColor: alpha(theme.palette.primary.main, 0.08), ...!isMobile && { maxHeight: '300px', overflow: 'auto' } }}>
                      {myPrompts.some((p) => p.id === previewPrompt.id) ? (
                        <Typography variant="body2">
                          {previewPrompt.systemMessage || '—'}
                        </Typography>
                      ) : (
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.primary', ...monospaceStyle }}>
                        {previewPrompt.hidden && !user?.isAdmin ? t('common:hiddenPromptInfo') : previewPrompt.systemMessage || '—'}
                      </Typography>
                      )}
                    </Paper>
                  </Box>
                  {!myPrompts.some((p) => p.id === previewPrompt.id) && (
                  <>
                  <Divider sx={{ my: 3 }} />
                    <Box gap={1} sx={{ display: 'flex', alignItems: 'center', mb:1.5 }}>
                      <BookmarksIcon color="secondary" />
                      <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                          {t('prompt:promptSourceMaterialData')}
                      </Typography>
                    </Box>
                  {rag ? (
                    <Box sx={{ mb: 5, flexDirection: 'column', display: 'flex', gap: 1, mt: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2, backgroundColor: alpha(theme.palette.primary.main, 0.08) }}>
                      <Typography variant="body2">
                        {previewPrompt.ragHidden && !user.isAdmin ? t('common:hiddenRag') : rag.metadata.name}
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ mb: 3, ml: 2, mt: 5 }}>
                      <Typography variant="body2">{t('prompt:noRag')}</Typography> 
                    </Box>
                  )}
                  </>
                  )}
                </Paper>
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