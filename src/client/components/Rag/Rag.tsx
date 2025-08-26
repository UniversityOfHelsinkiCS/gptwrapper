import React, { useState } from 'react'
import {
  TextField,
  Button,
  Box,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Link,
  Container,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
} from '@mui/material'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { useCourseRagIndices } from '../../hooks/useRagIndices'
import useCourse from '../../hooks/useCourse'
import { RagCreator } from './RagCreator'
import { useTranslation } from 'react-i18next'

const Rag: React.FC = () => {
  const { t } = useTranslation()
  const { id: courseId } = useParams<{ id: string }>()
  const { data: chatInstance } = useCourse(courseId)

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
              mb: 2,
              p: 1,
            }}
          >
            <Table sx={{ mb: 1 }}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('rag:id')}</TableCell>
                  <TableCell>{t('rag:name')}</TableCell>
                  <TableCell>{t('rag:language')}</TableCell>
                  <TableCell>{t('rag:numberOfFiles')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>{index.id}</TableCell>
                  <TableCell>{index.metadata?.name}</TableCell>
                  <TableCell>{index.metadata?.language}</TableCell>
                  <TableCell>{index.ragFileCount}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Link to={`/rag/${index.id}`} component={RouterLink} sx={{ ml: 'auto' }}>
                {t('rag:viewDetails')}
              </Link>
            </Box>
          </Paper>
        ))}
      </Box>
    </Container>
  )
}

export default Rag
