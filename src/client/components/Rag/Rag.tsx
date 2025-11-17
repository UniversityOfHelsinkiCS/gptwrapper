import React from 'react'
import { Box, Table, TableHead, TableBody, TableRow, TableCell, Link } from '@mui/material'
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom'
import { useCourseRagIndices } from '../../hooks/useRagIndices'
import useCourse from '../../hooks/useCourse'
import { RagCreator } from './RagCreator'
import { useTranslation } from 'react-i18next'
import { RagIndex } from './RagIndex'
import { EnergySavingsLeafTwoTone } from '@mui/icons-material'
import { RagFile } from './RagFile'

const Rag: React.FC = () => {
  const { t } = useTranslation()
  const { courseId } = useParams<{ courseId: string }>()
  const { data: chatInstance } = useCourse(courseId)
  const [searchParams, setSearchParams] = useSearchParams()

  const index = Number(searchParams.get('index')) !== 0
  const file = Number(searchParams.get('file')) !== 0

  const { ragIndices } = useCourseRagIndices(chatInstance?.id, true)

  return (
    <>
      {index && !file && <RagIndex />}
      {index && file && <RagFile />}
      {!index && !file && (<>
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
                    <Link to={`?index=${index.id}`} component={RouterLink} sx={{ ml: 'auto' }}>
                      {t('rag:viewDetails')}
                    </Link>
                  </Box>
                </TableCell>
              </TableRow>
            </TableBody>
          ))}
        </Table>
      </>)}
    </>
  )
}

export default Rag
