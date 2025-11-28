import React from 'react'
import { Box, Table, TableHead, TableBody, TableRow, TableCell, Link, TableContainer } from '@mui/material'
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom'
import { useCourseRagIndices } from '../../hooks/useRagIndices'
import useCourse from '../../hooks/useCourse'
import { RagCreator } from './RagCreator'
import { useTranslation } from 'react-i18next'
import { RagIndex } from './RagIndex'
import { RagFile } from './RagFile'
import { GrayButton, LinkButtonHoc } from '../ChatV2/general/Buttons'

const Rag: React.FC = () => {
  const { t } = useTranslation()
  const { courseId } = useParams<{ courseId: string }>()
  const { data: chatInstance } = useCourse(courseId)
  const [searchParams, _setSearchParams] = useSearchParams()

  const index = Number(searchParams.get('index')) !== 0
  const file = Number(searchParams.get('file')) !== 0

  const { ragIndices } = useCourseRagIndices(chatInstance?.id, true)

  return (
    <Box sx={{ py: 3 }}>
      {index && !file && <RagIndex />}
      {index && file && <RagFile />}
      {!index && !file && (<>
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
              <TableRow sx={{ backgroundColor: 'grey.100' }}>
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
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Link to={`?index=${ragIndex.id}`} component={RouterLink} sx={{ ml: 'auto' }}>
                        {t('rag:viewDetails')}
                      </Link>
                    </Box>
                  </TableCell>
                </TableRow>
              </TableBody>
            ))}
          </Table>
        </TableContainer>
      </>)
      }
    </Box >
  )
}

export default Rag
