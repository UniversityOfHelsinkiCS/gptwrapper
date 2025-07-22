import { Fab, Tooltip } from '@mui/material'
import FeedbackIcon from '@mui/icons-material/Feedback'
import { useTranslation } from 'react-i18next'

export const Feedback: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation()

  return (
    <>
      <Tooltip title={t('feedback:giveFeedback')} placement="top">
        <Fab color="default" aria-label="feedback" sx={{ position: 'absolute', bottom: 80, right: 32 }} onClick={() => console.log('Feedback button clicked')}>
          <FeedbackIcon />
        </Fab>
      </Tooltip>
      {children}
    </>
  )
}
