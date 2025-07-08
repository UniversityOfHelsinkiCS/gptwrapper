import { Box, Typography, Chip } from '@mui/material'
import { FileSearchCompletedData, FileSearchResultData } from '../../../shared/types'
import { useTranslation } from 'react-i18next'
import { useFileSearchResults } from './api'
import { GrayButton } from './generics/Buttons'
import { ShortText, Subject } from '@mui/icons-material'


const AnnotationBox = ({
    data,
    relevanceOrder
}: {
    data: FileSearchResultData,
    relevanceOrder: number // By default the backend returns the RAG results in most relevant results first 
}) => {
    const lineNum = 3;
    const multilineEllipsisTruncate = {
        // This is a trick to achieve a multu-line ellipsis truncation for max 3 rows of text. 
        // -webkit-box is used to support legacy browsers and for WebkitBoxOrient
        overflow: 'hidden',
        flex: '1',
        display: '-webkit-box',
        WebkitLineClamp: lineNum,
        WebkitBoxOrient: 'vertical',
        textOverflow: 'ellipsis',
        lineHeight: '1.5',
        maxHeight: `calc(1.5em * ${lineNum})`,
    }

    return (
        <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{
                color: 'black',
                backgroundColor: 'rgba(0,0,0,0.12)',
                width: 24,
                height: 24,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: '100%',
                fontSize: '0.8rem',
                mt: '0.4rem'
            }}>
                {relevanceOrder}
            </Box>
            <Typography sx={multilineEllipsisTruncate}>
                {data.text}
            </Typography>
        </Box>
    )
}

const Queries = ({ queries }: { queries: string[] }) => {
    const { t } = useTranslation()

    return (<Box
        sx={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 1,
            mb: 5,
        }}
    >
        <Typography fontWeight={'bold'}>{t('chat:searchTerms')}</Typography>
        {queries.map((q, idx) => (
            <Chip
                key={idx}
                label={q}
                sx={{
                    width: 'fit-content',
                    p: 0.5,
                    borderRadius: 2,
                    fontWeight: '600',
                    height: 'auto',
                    '& .MuiChip-label': {
                        display: 'block',
                        whiteSpace: 'normal',
                    },
                }}
                color="info"
            />
        ))}
    </Box>)
}

const Annotations = ({ fileSearchResult }: { fileSearchResult: FileSearchCompletedData }) => {
    const { data: results, isSuccess: isResultsSuccess } = useFileSearchResults(fileSearchResult.id)
    const arrayResults = Array.isArray(results) ? results : []
    const { t } = useTranslation()


    return (
        <Box>
            <Typography variant="h6" fontWeight={'bold'} sx={{ mb: 2.5 }}>
                {t('chat:sources')}
            </Typography>
            <Queries queries={fileSearchResult.queries} />
            {isResultsSuccess ?
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: 400 }}>
                    {arrayResults.map((result, i) => (
                        <AnnotationBox key={i} data={result} relevanceOrder={i + 1} />
                    ))}
                    {/* <Box>
                        <GrayButton startIcon={<Subject />}>{t('chat:readMore')}</GrayButton>
                    </Box> */}
                </Box> :
                <Typography>Failed to display search results</Typography>
            }
        </Box>
    )
}

export default Annotations