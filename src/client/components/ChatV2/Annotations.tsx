import { useState } from 'react'
import { Box, Typography, Chip, IconButton, Drawer } from '@mui/material'
import { Close } from '@mui/icons-material'
import { FileSearchCompletedData, FileSearchResultData } from '../../../shared/types'
import { useTranslation } from 'react-i18next'
import { useFileSearchResults } from './api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'


const AnnotationTruncated = ({
    data,
    relevanceOrder,
    setIsDrawerOpen
}: {
    data: FileSearchResultData,
    relevanceOrder: number // By default the backend returns the RAG results in most relevant results first 
    setIsDrawerOpen: (open: boolean) => void
}) => {
    const [isHovering, setIsHovering] = useState<boolean>(false)

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
        <Box
            sx={{
                display: 'flex',
                gap: 2,
                backgroundColor: isHovering ? '#efefef' : 'transparent',
                transition: 'background-color 0.1s ease-in-out',
                padding: '0.8rem 0.6rem',
                borderRadius: '0.6rem',
                cursor: 'pointer'
            }}
            onClick={() => setIsDrawerOpen(true)}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}

        >
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
            }}>
                {relevanceOrder}
            </Box>
            <Typography sx={multilineEllipsisTruncate}>
                {data.text}
            </Typography>
        </Box>
    )
}

const AnnotationFull = ({ data, relevanceOrder }: { data: FileSearchResultData, relevanceOrder: number }) => {
    return (
        <Box key={relevanceOrder} sx={{ display: 'flex', gap: 2, }}>
            <Box sx={{
                color: 'black',
                backgroundColor: 'rgba(0,0,0,0.12)',
                minWidth: '1.8rem',
                height: '1.8rem',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: '100%',
            }}>
                {relevanceOrder + 1}
            </Box>
            <Box>
                <Box sx={{ display: 'flex', gap: 2, mb: '0.8rem', alignItems: 'center' }}>
                    <Typography fontWeight={600}>{data.filename}</Typography>
                    <Typography sx={{ opacity: 0.7 }}>{`Score: ${data.score}`}</Typography>
                </Box>
                <Box sx={{ p: "0.5rem 2rem", borderRadius: '0.5rem', backgroundColor: '#f5f5f5' }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.text}</ReactMarkdown>
                </Box>
            </Box>
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

const Annotations = ({ fileSearchResult, setShowAnnotations }: { fileSearchResult: FileSearchCompletedData; setShowAnnotations: (show: boolean) => void }) => {
    const { data: results, isSuccess: isResultsSuccess } = useFileSearchResults(fileSearchResult.id)
    const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false)
    const arrayResults = Array.isArray(results) ? results : []
    const { t } = useTranslation()

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h6" fontWeight={'bold'}>
                    {t('chat:sources')}
                </Typography>
                <IconButton
                    id="close-annotations"
                    onClick={() => setShowAnnotations(false)}
                >
                    <Close />
                </IconButton>
            </Box>
            <Queries queries={fileSearchResult.queries} />
            {isResultsSuccess ?
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minHeight: 400 }}>
                    {arrayResults.map((result, i) => (
                        <AnnotationTruncated key={i} data={result} relevanceOrder={i + 1} setIsDrawerOpen={setIsDrawerOpen} />
                    ))}
                </Box> :
                <Typography>{t('chat:failedSources')}</Typography>
            }
            <Drawer anchor={'right'} open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
                <Box sx={{ maxWidth: '60vw', padding: '8rem 3rem', display: 'flex', gap: '4rem', flexDirection: 'column' }}>
                    {arrayResults.map((result, i) => (
                        <AnnotationFull data={result} relevanceOrder={i + 1} />
                    ))}
                </Box>
            </Drawer>
        </Box>
    )
}

export default Annotations