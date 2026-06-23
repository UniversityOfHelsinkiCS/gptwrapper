import React from 'react'
import { Box, Table, TableHead, TableBody, TableRow, TableCell, Link, TableContainer } from '@mui/material'
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useRagIndices } from '../../hooks/useRagIndices'
import useCourse from '../../hooks/useCourse'
import { RagCreator } from './RagCreator'
import { useTranslation } from 'react-i18next'
import { RagIndex } from './RagIndex'
import { RagFile } from './RagFile'
import { GrayButton, LinkButtonHoc, OutlineButtonBlack } from '../ChatV2/general/Buttons'
import { Settings } from '@mui/icons-material'
import { ArrowBack } from '@mui/icons-material'
import { createRagSearchParams, getRagNavigationState } from './ragNavigation'

const UserRags: React.FC = () => {
  const { t } = useTranslation()
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const { data: chatInstance } = useCourse(courseId)
  const [searchParams, _setSearchParams] = useSearchParams()
  const { indexId, fileId, returnToEditor, returnPromptId, promptTab } = getRagNavigationState(searchParams)

  const index = indexId !== undefined
  const file = fileId !== undefined

  const { ragIndices } = useRagIndices()

  return (
    <Box sx={{ py: 3 }}>
      {index && !file && <RagIndex ragTab="user" />}
      {index && file && <RagFile />}
      {!index && !file && (
        <>
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
          {chatInstance?.id && (
            <Box display="flex" justifyContent="space-between" sx={{ pb: 2 }}>
              <RagCreator chatInstance={chatInstance} />
              <LinkButtonHoc button={GrayButton} external to="https://github.com/UniversityOfHelsinkiCS/gptwrapper/blob/main/documentation/rag.md">
                {t('rag:readMoreAboutRag')}
              </LinkButtonHoc>
            </Box>
          )}
          <TableContainer sx={{ borderRadius: 1, minWidth: 800 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'background.subtle' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>{t('rag:name')}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{t('rag:language')}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{t('rag:numberOfFiles')}</TableCell>
                  <TableCell>{}</TableCell>
                </TableRow>
              </TableHead>
              {ragIndices?.map((ragIndex) => (
                <TableBody key={`tbody-${ragIndex.id}`}>
                  <TableRow key={`${ragIndex.id}-index`}>
                    <TableCell>{ragIndex.metadata?.name}</TableCell>
                    <TableCell>{ragIndex.metadata?.language}</TableCell>
                    <TableCell>{ragIndex.ragFileCount}</TableCell>
                    <TableCell>
                      <Link
                        to={`?${createRagSearchParams({
                          indexId: ragIndex.id,
                          returnToEditor,
                          returnPromptId,
                          promptTab,
                          ragTab: 'user',
                        })}`}
                        component={RouterLink}
                        sx={{ ml: 'auto' }}
                        data-testid="ragIndexDetails"
                      >
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          {t('rag:viewDetails')} <Settings fontSize="small" />
                        </Box>
                      </Link>
                    </TableCell>
                  </TableRow>
                </TableBody>
              ))}
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  )
}

export default UserRags
