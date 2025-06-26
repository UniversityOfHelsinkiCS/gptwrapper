import { useTranslation } from 'react-i18next'
import { Box, Typography, MenuItem, FormControl, Select, SelectChangeEvent, InputLabel } from '@mui/material'
import { RagIndexAttributes } from '../../../shared/types'

const RagSelector = ({
  currentRagIndex,
  setRagIndex,
  ragIndices,
}: {
  currentRagIndex?: RagIndexAttributes
  setRagIndex: (ragIndex: number) => void
  ragIndices: RagIndexAttributes[]
}) => {
  const { t } = useTranslation()

  return (
    <Box mb={2}>
      <FormControl sx={{ width: '200px' }}>
        <InputLabel>RAG index</InputLabel>
        <Select
          label={'RAG index'}
          value={String(currentRagIndex?.id ?? '')}
          onChange={(event: SelectChangeEvent) => setRagIndex(parseInt(event.target.value, 10))}
        >
          <MenuItem key={-1} value="none">
            None
          </MenuItem>
          {ragIndices.map((ragIndex) => (
            <MenuItem key={ragIndex.id} value={String(ragIndex.id)}>
              {ragIndex.metadata.name} ({ragIndex.id})
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  )
}

export default RagSelector
