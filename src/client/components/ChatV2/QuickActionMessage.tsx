import LightbulbOutlined from '@mui/icons-material/LightbulbOutlined'
import Notes from '@mui/icons-material/Notes'
import Translate from '@mui/icons-material/Translate'
import { Box, Typography } from '@mui/material'
import type { SvgIconComponent } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import type { UserMessage } from '@shared/chat'
import type { QuickAction } from '@shared/quote'
import { QuoteCard } from './QuoteCard'

const ICONS: Record<QuickAction, SvgIconComponent> = { explain: LightbulbOutlined, summarize: Notes, translate: Translate }

/**
 * A user message sent with a quick action on a quote (Explain, Summarize, Translate): the action's name as a header
 * and the quote under it. The request the model got (`content`) is not shown.
 */
export const QuickActionMessage = ({ message, action }: { message: UserMessage; action: QuickAction }) => {
  const { t } = useTranslation()
  const labels: Record<QuickAction, string> = {
    explain: t('fileViewer:explain'),
    summarize: t('fileViewer:summarize'),
    translate: t('fileViewer:translate'),
  }
  const Icon = ICONS[action]
  return (
    <Box data-testid="quick-action-message" data-action={action}>
      <Typography
        component="p"
        variant="subtitle2"
        data-testid="quick-action-header"
        sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1, color: 'text.primary', fontWeight: 600 }}
      >
        <Icon fontSize="small" aria-hidden />
        {labels[action]}
      </Typography>
      <Box sx={{ '& > figure:last-of-type': { mb: 0 } }}>{message.quotes?.map((quote, idx) => <QuoteCard key={idx} quote={quote} />)}</Box>
    </Box>
  )
}
