import { Box, Typography } from '@mui/material'
import { FileSearchCompletedData } from '../../../shared/types'
import { useTranslation } from 'react-i18next'
import { useFileSearchResults } from './api'

export default function Annotations({ fileSearchResult }: { fileSearchResult: FileSearchCompletedData }) {
    const { data: results, isSuccess: isResultsSuccess } = useFileSearchResults(fileSearchResult.id)
    const arrayResults = Array.isArray(results) ? results : []
    const { t } = useTranslation()


    return (
        <Box sx={{ borderLeft: '1px solid rgba(0, 0, 0, 0.12)', padding: '2rem 1.5rem' }}>
            <Typography variant="h6" fontWeight={'bold'} sx={{ pb: 3 }}>
                {t('chat:sources')}
            </Typography>
            {isResultsSuccess ?
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}>
                    {/* <pre>{JSON.stringify(fileSearchResult, null, 2)}</pre> */}
                    {arrayResults.map((result, i) => (
                        <Typography key={i}>{result.text}</Typography>
                    ))}
                </Box> :
                <Typography>Failed to display search results</Typography>
            }
        </Box>
    )
}
