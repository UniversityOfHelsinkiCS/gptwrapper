import { useState, useRef, useEffect } from 'react'
import { Box, Typography, Chip, Tooltip } from '@mui/material'
import Search from '@mui/icons-material/Search'
import ExpandMore from '@mui/icons-material/ExpandMore'
import ExpandLess from '@mui/icons-material/ExpandLess'
import { useTranslation } from 'react-i18next'
import { useToolResults } from './api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { OutlineButtonBlack, TextButton } from './general/Buttons'
import type { ToolCallResultEvent } from '../../../shared/chat'
import type { RagChunk } from '../../../shared/rag'
import { CustomIcon } from './general/CustomIcon'
import sidebarOpen from '../../assets/sidebar-open.svg'
import sidebarClose from '../../assets/sidebar-close.svg'

const AnnotationExpanded = ({ data, relevanceOrder }: { data: RagChunk; relevanceOrder: number }) => {
  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      <Box
        sx={{
          color: 'text.primary',
          backgroundColor: 'action.selected',
          minWidth: '1.8rem',
          height: '1.8rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: '100%',
        }}
      >
        {relevanceOrder}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            mb: { xs: 2, md: 3 },
            justifyContent: 'space-between',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'center' },
          }}
        >
          <Typography fontWeight={600}>{data.metadata.ragFileName}</Typography>
          {data.score && (
            <Typography
              sx={{
                opacity: 0.7,
                whiteSpace: 'nowrap',
                justifySelf: 'flex-end',
              }}
            >
              {`Score: ${data.score}`}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            p: '0.5rem 1.5rem',
            borderRadius: '0.5rem',
            backgroundColor: 'action.hover',
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.content}</ReactMarkdown>
        </Box>
      </Box>
    </Box>
  )
}

const Queries = ({ queries }: { queries: string[] }) => {
  const { t } = useTranslation()

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 1,
        mb: 5,
      }}
    >
      <Typography fontWeight={'500'}>{t('chat:searchTerms')}</Typography>
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
    </Box>
  )
}

const ToolResultDetails = ({ toolResult }: { toolResult: ToolCallResultEvent }) => {
  const { data: results, isSuccess: isResultsSuccess } = useToolResults(toolResult.callId)
  const arrayResults = Array.isArray(results) ? results : []
  const { t } = useTranslation()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <Queries queries={[toolResult.input?.query ?? '']} />
      {isResultsSuccess ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
          {arrayResults.length > 0 ? (
            arrayResults.map((result, i) => <AnnotationExpanded key={i} data={result} relevanceOrder={i + 1} />)
          ) : (
            <Typography>{t('chat:noToolResults')}</Typography>
          )}
        </Box>
      ) : (
        <Typography>{t('chat:failedSources')}</Typography>
      )}
    </Box>
  )
}

const ToolResult = ({ toolResults, open, onToggle }: { toolResults: ToolCallResultEvent[]; open: boolean; onToggle: () => void }) => {
  const [showDetails, setShowDetails] = useState<boolean>(false)
  const toggleButtonRef = useRef<HTMLButtonElement>(null)
  const { t } = useTranslation()
  const toggleLabel = open ? t('sidebar:closeSources') : t('sidebar:openSources')
  const fileNames = Array.from(new Set(toolResults.flatMap((toolResult) => (toolResult.result?.files ?? []).map((file) => file.fileName))))

  useEffect(() => {
    if (open) toggleButtonRef.current?.focus()
  }, [open])

  // The toggle button stays mounted in both states so it keeps its position and the focus, and screen readers announce the aria-expanded change
  return (
    <Box
      sx={{
        pt: 3,
        pb: '1rem',
        px: open ? '1rem' : 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflowY: open ? 'auto' : 'hidden',
      }}
      role="region"
      aria-labelledby="sources-header"
    >
      <Box
        sx={{
          display: 'flex',
          ml: open ? -1 : 0,
          mb: open ? 2 : 0,
          justifyContent: open ? 'flex-start' : 'center',
        }}
      >
        <Tooltip arrow placement="left" title={toggleLabel} describeChild>
          <TextButton
            id="right-sidebar-toggle"
            ref={toggleButtonRef}
            data-testid={open ? 'close-annotations' : 'open-annotations'}
            aria-label={toggleLabel}
            aria-expanded={open}
            aria-controls={open ? 'tool-result-content' : undefined}
            onClick={onToggle}
          >
            <CustomIcon src={open ? sidebarOpen : sidebarClose} alt="" />
          </TextButton>
        </Tooltip>
      </Box>
      {open && (
        <Box id="tool-result-content" sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography
            id="sources-header"
            variant="h5"
            component="h3"
            fontWeight={600}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              mb: { xs: 2, md: 3 },
            }}
            data-testid="sources-header"
          >
            <Search fontSize="large" sx={{ opacity: 0.8 }} />
            {t('chat:searchResults')}
          </Typography>
          {fileNames.length > 0 ? (
            <>
              <Typography fontWeight={500}>{t('chat:sources')}</Typography>
              <Box component="ul" data-testid="sources-summary" sx={{ pl: 3, mt: 1, mb: 3 }}>
                {fileNames.map((fileName) => (
                  <Typography component="li" key={fileName} sx={{ wordBreak: 'break-word' }}>
                    {fileName}
                  </Typography>
                ))}
              </Box>
            </>
          ) : (
            <Typography sx={{ mb: 3 }}>{t('chat:notFoundFromMaterial')}</Typography>
          )}
          <OutlineButtonBlack
            data-testid="toggle-source-details"
            aria-expanded={showDetails}
            aria-controls={showDetails ? 'tool-result-details' : undefined}
            endIcon={showDetails ? <ExpandLess /> : <ExpandMore />}
            onClick={() => setShowDetails(!showDetails)}
            sx={{ alignSelf: 'flex-start', mb: 3 }}
          >
            {showDetails ? t('chat:hideDetails') : t('chat:showDetails')}
          </OutlineButtonBlack>
          {showDetails && (
            <Box id="tool-result-details" sx={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
              {toolResults.map((toolResult) => (
                <ToolResultDetails key={toolResult.callId} toolResult={toolResult} />
              ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}

export default ToolResult
