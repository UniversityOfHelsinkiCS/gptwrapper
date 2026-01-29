import { useState } from 'react'
import { Tooltip } from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import { enqueueSnackbar } from 'notistack'
import { useTranslation } from 'react-i18next'
import type { ChatMessage } from '../../../shared/chat'
import { TextButton } from './general/Buttons'
import { downloadDiscussionAsFile } from './api'

const DownloadButton = ({ messages, disabled, collapsed = false }: { messages: ChatMessage[]; disabled: boolean; collapsed?: boolean }) => {
  const { t } = useTranslation()
  const [isCooldown, setIsCooldown] = useState(false)

  const handleDownload = async () => {
    if (!messages.length || isCooldown) {
      enqueueSnackbar(t('download:failure'), { variant: 'error' })
      return
    }

    try {
      setIsCooldown(true)
      downloadDiscussionAsFile(messages, t)
      enqueueSnackbar(t('download:success'), { variant: 'success' })

      // Set cooldown for 3 seconds
      setTimeout(() => {
        setIsCooldown(false)
      }, 3000)
    } catch (error) {
      enqueueSnackbar(t('download:failure'), { variant: 'error' })
      setIsCooldown(false)
    }
  }

  return (
    <Tooltip arrow placement="right" title={t('chat:download')}>
      <TextButton startIcon={!collapsed && <DownloadIcon />} onClick={handleDownload} data-testid="download-button" size="large" disabled={disabled || isCooldown}>
        {collapsed ? <DownloadIcon fontSize="small" /> : t('download:save')}
      </TextButton>
    </Tooltip>
  )
}

export default DownloadButton
