import React, { useState } from 'react'
import { Box, Divider, List, ListItemButton, ListItemText, Typography, useMediaQuery, useTheme } from '@mui/material'
import { useRagIndices } from '../../hooks/useRagIndices'
import { RagCreator } from './RagCreator'
import { useTranslation } from 'react-i18next'
import { ArrowBack } from '@mui/icons-material'
import { RagFileV2 } from './RagFileV2'
import { RagIndexV2 } from './RagIndexV2'
import { OutlineButtonBlue } from '../ChatV2/general/Buttons'

interface RagDetailsProps {
  selectedIndexId: number | null
  onBack: () => void
  onSelectFile: React.Dispatch<React.SetStateAction<number | null>>
  selectedFileId: number | null
  ragModal: boolean
}

export const RagDetails: React.FC<RagDetailsProps> = ({ selectedIndexId, onBack, onSelectFile, selectedFileId, ragModal }) => {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <Box
      sx={{
        display: !isMobile || selectedIndexId ? 'flex' : 'none',
        flex: 1,
        flexDirection: 'column',
        minWidth: 0,
        minHeight: 0,
        overflow: 'hidden',
        maxWidth: !isMobile ? '100%' : '90vw',
        mt: 2,
      }}
    >
      {isMobile && selectedIndexId && ragModal && (
        <Box sx={{ pb: 1 }}>
          <OutlineButtonBlue onClick={onBack}>
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
      {selectedIndexId && !selectedFileId && <RagIndexV2 indexId={selectedIndexId} onBack={onBack} onSelectFile={onSelectFile} />}
      {selectedIndexId && selectedFileId && <RagFileV2 indexId={selectedIndexId} fileId={selectedFileId} onBack={() => onSelectFile(null)} />}
    </Box>
  )
}

const RagModal: React.FC<{ rag?: number }> = ({ rag }) => {
  const { t } = useTranslation()

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const { ragIndices } = useRagIndices()

  const [selectedIndexId, setSelectedIndexId] = useState<number | null>(rag ?? null)
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null)

  const handleSelectIndex = (indexId: number) => {
    setSelectedIndexId(indexId)
    setSelectedFileId(null)
  }

  const handleBack = () => {
    setSelectedIndexId(null)
    setSelectedFileId(null)
  }

  const sortedRagIndices = ragIndices?.sort((a, b) => a.metadata?.name.localeCompare(b.metadata?.name, 'fi', { sensitivity: 'base', numeric: true }))

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, minHeight: 0 }}>
      <Box sx={{ display: 'flex', gap: 2, flex: 1, minHeight: 0 }}>
        {/* Left panel — collection list */}
        <Box sx={{ display: !isMobile || !selectedIndexId ? 'flex' : 'none', width: !isMobile ? 310 : '90vw', flexDirection: 'column', mt: 2 }}>
          <RagCreator onCreated={handleSelectIndex} />
          <Divider sx={{ my: 1 }} />
          <List sx={{ flex: 1, overflowY: 'auto' }}>
            {sortedRagIndices?.map((ragIndex) => (
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
        <RagDetails selectedIndexId={selectedIndexId} onBack={handleBack} onSelectFile={setSelectedFileId} selectedFileId={selectedFileId} ragModal={true} />
      </Box>
    </Box>
  )
}

export default RagModal
