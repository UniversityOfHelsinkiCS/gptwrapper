import React, { useState } from 'react'
import { Box, Divider, List, ListItemButton, ListItemText, Typography, useMediaQuery, useTheme } from '@mui/material'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useRagIndices } from '../../hooks/useRagIndices'
import { RagCreator } from './RagCreator'
import { useTranslation } from 'react-i18next'
import { RagIndexV2 } from './RagIndexV2'
import { RagFileV2 } from './RagFileV2'
import { OutlineButtonBlack, OutlineButtonBlue } from '../ChatV2/general/Buttons'
import { ArrowBack } from '@mui/icons-material'
import { createRagSearchParams, getRagNavigationState } from './ragNavigation'

const UserRags: React.FC = () => {
  const { t } = useTranslation()
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { returnToEditor, returnPromptId, promptTab } = getRagNavigationState(searchParams)

  const [selectedIndexId, setSelectedIndexId] = useState<number | null>(null)
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null)

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const { ragIndices } = useRagIndices()

  const handleSelectIndex = (indexId: number) => {
    setSelectedIndexId(indexId)
    setSelectedFileId(null)
  }

  const handleBack = () => {
    setSelectedIndexId(null)
    setSelectedFileId(null)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {returnToEditor && (
        <Box sx={{ pb: 2 }}>
          <OutlineButtonBlack
            onClick={() =>
              navigate(
                `/${courseId}/prompts?${createRagSearchParams({
                  returnToEditor,
                  returnPromptId,
                  promptTab,
                })}`,
              )
            }
            data-testid="back-to-prompt-editor"
          >
            <ArrowBack />
          </OutlineButtonBlack>
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 2, mt: 2, flex: 1, minHeight: 0 }}>
        {/* Left panel — collection list */}
        <Box sx={{ display: !isMobile || !selectedIndexId ? 'flex' : 'none', width: !isMobile ? 310 : '90vw', flexDirection: 'column' }}>
          <RagCreator onCreated={handleSelectIndex} />
          <Divider sx={{ my: 1 }} />
          <List sx={{ flex: 1, overflowY: 'auto' }}>
            {ragIndices?.map((ragIndex) => (
              <ListItemButton
                key={ragIndex.id}
                selected={selectedIndexId === ragIndex.id}
                onClick={() => handleSelectIndex(ragIndex.id)}
                sx={{
                  borderRadius: '8px',
                  mb: 0.5,
                  '&.Mui-selected': {
                    backgroundColor: 'action.selected',
                    borderLeft: '3px solid',
                    borderLeftColor: 'primary.main',
                  },
                }}
              >
                <ListItemText primary={ragIndex.metadata?.name} slotProps={{ primary: { noWrap: true } }} />
              </ListItemButton>
            ))}
          </List>
          {ragIndices?.length === 0 && (
            <Box sx={{ p: 2, color: 'text.secondary' }}>
              <Typography variant="body2">{t('rag:noCollections')}</Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ display: isMobile ? 'none' : 'flex' }} orientation="vertical" flexItem />

        {/* Right panel */}
        <Box sx={{ display: !isMobile || selectedIndexId ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0, overflow: 'hidden', maxWidth: !isMobile ? '100%' : '90vw' }}>
          {isMobile && selectedIndexId && (
            <Box sx={{ pb: 1 }}>
              <OutlineButtonBlue onClick={handleBack}>
                <ArrowBack />
                {t('rag:backToCollections')}
              </OutlineButtonBlue>
            </Box>
          )}
          {!selectedIndexId && (
            <Box sx={{ display: 'flex', justifyContent: 'center', height: '100%', color: 'text.secondary', pt: 4 }}>
              <Typography>{t('rag:selectCollection')}</Typography>
            </Box>
          )}
          {selectedIndexId && !selectedFileId && (
            <RagIndexV2
              indexId={selectedIndexId}
              onBack={handleBack}
              onSelectFile={setSelectedFileId}
            />
          )}
          {selectedIndexId && selectedFileId && (
            <RagFileV2
              indexId={selectedIndexId}
              fileId={selectedFileId}
              onBack={() => setSelectedFileId(null)}
            />
          )}
        </Box>
      </Box>
    </Box>
  )
}

export default UserRags
