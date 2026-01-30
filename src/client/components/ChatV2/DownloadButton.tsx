import { useState } from 'react'
import { Tooltip, Menu, MenuItem } from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import { enqueueSnackbar } from 'notistack'
import { useTranslation } from 'react-i18next'
import type { ChatMessage } from '../../../shared/chat'
import { TextButton } from './general/Buttons'
import { downloadDiscussionAsFile } from './api'

const DownloadButton = ({ messages, disabled, collapsed = false }: { messages: ChatMessage[]; disabled: boolean; collapsed?: boolean }) => {
  const { t } = useTranslation()
  const [isCooldown, setIsCooldown] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!messages.length || isCooldown) {
      enqueueSnackbar(t('download:failure'), { variant: 'error' })
      return
    }
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleDownload = async (format: 'md' | 'docx' | 'pdf' | 'txt') => {
    handleClose()

    try {
      setIsCooldown(true)
      downloadDiscussionAsFile(messages, t, format)
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
    <>
      <Tooltip arrow placement="right" title={t('chat:download')}>
        <TextButton 
          startIcon={!collapsed && <DownloadIcon />} 
          onClick={handleClick} 
          data-testid="download-button" 
          size="large" 
          disabled={disabled || isCooldown}
        >
          {collapsed ? <DownloadIcon fontSize="small" /> : t('download:save')}
        </TextButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        <MenuItem onClick={() => handleDownload('md')} data-testid="download-md">
          {t('download:formatMarkdown')}
        </MenuItem>
        <MenuItem onClick={() => handleDownload('docx')} data-testid="download-docx">
          {t('download:formatDocx')}
        </MenuItem>
        <MenuItem onClick={() => handleDownload('pdf')} data-testid="download-pdf">
          {t('download:formatPdf')}
        </MenuItem>
        <MenuItem onClick={() => handleDownload('txt')} data-testid="download-txt">
          {t('download:formatText')}
        </MenuItem>
      </Menu>
    </>
  )
}

export default DownloadButton
