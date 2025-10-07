import { Box, Paper, Typography, Tooltip, IconButton, Link } from '@mui/material'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined'
import DeleteOutline from '@mui/icons-material/DeleteOutline'
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined'
import { useTranslation } from 'react-i18next'

import { enqueueSnackbar } from 'notistack'
import type { Prompt as PromptType } from '../../../types'
import { useDeletePromptMutation } from '../../../hooks/usePromptMutation'
import { useParams, Link as RouterLink } from 'react-router-dom'
import { IframeCopy } from '../../common/IframeCopy'
import { PUBLIC_URL } from '@config'
import { OutlineButtonBlack } from '../../ChatV2/general/Buttons'

const Prompt = ({ prompt, handleEdit }: { prompt: PromptType; handleEdit: () => void }) => {
  const { t } = useTranslation()
  const { id: courseId } = useParams()

  const { id, name, hidden, ragIndexId } = prompt

  const chatPath = `/${courseId}?promptId=${id}`
  const directLink = `${window.location.origin}${PUBLIC_URL}/${chatPath}`

  const deleteMutation = useDeletePromptMutation()

  const handleDelete = (promptId: string) => {
    if (!window.confirm(t('confirmDeletePrompt') as string)) return

    try {
      deleteMutation.mutate(promptId)
      enqueueSnackbar('Prompt deleted', { variant: 'success' })
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' })
    }
  }

  return (
    <Box key={id} pt={2}>
      <Paper sx={{ py: '1rem', px: '2rem' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Box display="inline" mr={2}>
              {hidden ? (
                <Tooltip title={t('hiddenPromptInfo')}>
                  <VisibilityOff />
                </Tooltip>
              ) : (
                <Tooltip title={t('visiblePromptInfo')}>
                  <Visibility />
                </Tooltip>
              )}
            </Box>
            {ragIndexId && (
              <Box display="inline" mr={2}>
                <Tooltip title={t('rag:sourceMaterials')}>
                  <MenuBookOutlined />
                </Tooltip>
              </Box>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Typography variant="h6" display="inline">
                {name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Link component={RouterLink} to={chatPath} variant="caption">
                  {t('course:directPromptLink', { name: prompt.name })}
                </Link>
                <Tooltip title={t('course:copyDirectPromptLinkInfo', { name: prompt.name })}>
                  <IconButton size="small" onClick={() => navigator.clipboard.writeText(directLink)}>
                    <ContentCopyOutlined fontSize="small" />
                  </IconButton>
                </Tooltip>
                <IframeCopy courseId={courseId!} promptId={prompt.id} />
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={() => handleDelete(prompt.id)} color="error" data-testid={`delete-prompt-${prompt.name}`} aria-label={t('course:remove')}>
              <DeleteOutline />
            </IconButton>
            <OutlineButtonBlack onClick={handleEdit} color="primary" data-testid={`edit-prompt-${prompt.name}`} aria-label={t('common:edit')}>
              {t('common:edit')}
            </OutlineButtonBlack>
          </Box>
        </Box>
      </Paper>
    </Box>
  )
}

export default Prompt
