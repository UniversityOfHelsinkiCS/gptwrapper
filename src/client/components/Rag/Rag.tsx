import React from 'react'
import { Box, Typography, Table, TableHead, TableBody, TableRow, TableCell, Paper, Link, Container } from '@mui/material'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { useCourseRagIndices } from '../../hooks/useRagIndices'
import useChatInstance from '../../hooks/useCourse'
import { RagCreator } from './RagCreator'
import { useTranslation } from 'react-i18next'

const Rag: React.FC = () => {
  const { t } = useTranslation()
  const { id: courseId } = useParams<{ id: string }>()
  const { data: chatInstance } = useChatInstance(courseId)

  const { ragIndices } = useCourseRagIndices(chatInstance?.id, true)

  return (
    <Container sx={{ display: 'flex', gap: 2, mt: '4rem', mb: '10rem' }} maxWidth="xl">
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
                      <Link to={`/rag/${index.id}`} component={RouterLink} sx={{ ml: 'auto' }}>
                        {t('rag:viewDetails')}
                      </Link>
                    </Box>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Paper>
        ))}
      </Box>
    </Container>
  )
}

export default Rag
