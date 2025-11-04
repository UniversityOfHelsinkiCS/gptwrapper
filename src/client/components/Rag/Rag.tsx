import React, { useState } from 'react'
import { Box, Typography, Table, TableHead, TableBody, TableRow, TableCell, Paper, Link, Container } from '@mui/material'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { useCourseRagIndices } from '../../hooks/useRagIndices'
import useCourse from '../../hooks/useCourse'
import { RagCreator } from './RagCreator'
import { useTranslation } from 'react-i18next'
import { RagIndex } from './RagIndex'
import { OutlineButtonBlack } from '../ChatV2/general/Buttons'

const Rag = ({ courseId }: { courseId?: string }) => {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const { data: chatInstance } = useCourse(courseId ?? id)
  const [ragIndexId, setRagIndexId] = useState<number | undefined>(undefined)

  const { ragIndices } = useCourseRagIndices(chatInstance?.id, true)

  return (
    <Container sx={{ display: 'flex', gap: 2, mt: '4rem', mb: '10rem' }} maxWidth="xl">
      {!ragIndexId &&
        <Box>
          <Typography variant="h4" mb="1rem">
            {t('rag:sourceMaterials')}
          </Typography>
          {chatInstance?.id && <RagCreator chatInstance={chatInstance} />}
          {ragIndices?.map((index) => (
            <Paper
              key={index.id}
              sx={{
                mt: 2,
                p: 2,
                borderRadius: '1.25rem'
              }}
            >
              <Table sx={{ mb: 1 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('rag:name')}</TableCell>
                    <TableCell>{t('rag:language')}</TableCell>
                    <TableCell>{t('rag:numberOfFiles')}</TableCell>
                    <TableCell>{}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>{index.metadata?.name}</TableCell>
                    <TableCell>{index.metadata?.language}</TableCell>
                    <TableCell>{index.ragFileCount}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        {courseId ?
                          (<OutlineButtonBlack onClick={() => setRagIndexId(index.id)}>
                            {t('rag:viewDetails')}
                          </OutlineButtonBlack>) :
                          (<Link to={`/rag/${index.id}`} component={RouterLink} sx={{ ml: 'auto' }}>
                            {t('rag:viewDetails')}
                          </Link>)}
                      </Box>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>
          ))}
        </Box>
      }
      {(courseId && !!ragIndexId) &&
        <RagIndex ragIndexId={ragIndexId} setRagIndexId={setRagIndexId} />
      }
    </Container>
  )
}

export default Rag
