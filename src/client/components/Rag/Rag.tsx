import React from 'react'
import { Box, Table, TableHead, TableBody, TableRow, TableCell, Link } from '@mui/material'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { useCourseRagIndices } from '../../hooks/useRagIndices'
import useCourse from '../../hooks/useCourse'
import { RagCreator } from './RagCreator'
import { useTranslation } from 'react-i18next'

const Rag: React.FC = () => {
  const { t } = useTranslation()
  const { courseId } = useParams<{ courseId: string }>()
  const { data: chatInstance } = useCourse(courseId)

  const { ragIndices } = useCourseRagIndices(chatInstance?.id, true)

  return (
    <>
      {chatInstance?.id && <RagCreator chatInstance={chatInstance} />}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell><strong>{t('rag:name')}</strong></TableCell>
            <TableCell><strong>{t('rag:language')}</strong></TableCell>
            <TableCell><strong>{t('rag:numberOfFiles')}</strong></TableCell>
            <TableCell>{}</TableCell>
          </TableRow>
        </TableHead>
        {ragIndices?.map((index) => (
          <TableBody>
            <TableRow>
              <TableCell>{index.metadata?.name}</TableCell>
              <TableCell>{index.metadata?.language}</TableCell>
              <TableCell>{index.ragFileCount}</TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Link to={`${index.id}`} component={RouterLink} sx={{ ml: 'auto' }}>
                    {t('rag:viewDetails')}
                  </Link>
                </Box>
              </TableCell>
            </TableRow>
          </TableBody>
        ))}
      </Table>
    </>
  )
}

export default Rag
