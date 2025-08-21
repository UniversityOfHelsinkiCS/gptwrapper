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
import { useNavigate, Link as RouterLink, useParams } from 'react-router-dom'
import { useCourseRagIndices, useRagIndices } from '../../hooks/useRagIndices'
import { useCreateRagIndexMutation } from './api'
import useCourse from '../../hooks/useCourse'

const Rag: React.FC = () => {
  const { id: courseId } = useParams<{ id: string }>()
  const { data: chatInstance } = useCourse(courseId)
  const navigate = useNavigate()
  const { ragIndices } = useCourseRagIndices(chatInstance?.id, true)
  const createIndexMutation = useCreateRagIndexMutation()
  const [indexName, setIndexName] = useState('')
  const [language, setLanguage] = useState<'Finnish' | 'English'>('English')

  return (
    <Container sx={{ display: 'flex', gap: 2, mt: '4rem', mb: '10rem' }} maxWidth="xl">
      <Box>
        <Typography variant="h4" mb="1rem">
          RAG Indices
        </Typography>
        {chatInstance?.id && (
          <Box sx={{ display: 'flex', gap: 2, marginBottom: 2 }}>
            <TextField
              label="Index Name"
              helperText="Use a descriptive name. It is shown to users when RAG is used."
              variant="outlined"
              value={indexName}
              onChange={(e) => setIndexName(e.target.value)}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel id="language-label">Language</InputLabel>
              <Select labelId="language-label" id="language-select" value={language} onChange={(e) => setLanguage(e.target.value as 'Finnish' | 'English')}>
                <MenuItem value={'Finnish'}>Finnish</MenuItem>
                <MenuItem value={'English'}>English</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              color="primary"
              onClick={async () => {
                const newIndex = await createIndexMutation.mutateAsync({
                  chatInstanceId: chatInstance?.id,
                  indexName,
                  language,
                })
                setIndexName('')
                navigate(`/rag/${newIndex.id}`)
              }}
            >
              Create Index
            </Button>
          </Box>
        )}
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
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Language</TableCell>
                  <TableCell>Number of files</TableCell>
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
                View details
              </Link>
            </Box>
          </Paper>
        ))}
      </Box>
    </Container>
  )
}

export default Rag
