import { useState } from 'react'
import { Tooltip } from '@mui/material'
import EmailIcon from '@mui/icons-material/Email'
import { enqueueSnackbar } from 'notistack'
import { useTranslation } from 'react-i18next'
import useCurrentUser from '../../hooks/useCurrentUser'
import type { ChatMessage } from '../../../shared/chat'
import { TextButton } from './general/Buttons'
import { sendConversationEmail } from './api'

const EmailButton = ({ messages, disabled, collapsed = false }: { messages: ChatMessage[]; disabled: boolean; collapsed?: boolean }) => {
  const { t } = useTranslation()
  const { user, isLoading } = useCurrentUser()
  const [isCooldown, setIsCooldown] = useState(false)

  if (isLoading || !user?.email) return null

  const handleSend = async () => {
    if (!user.email || !messages.length || isCooldown) {
      enqueueSnackbar(t('email:failure'), { variant: 'error' })
      return
    }

    setIsCooldown(true)

    await sendConversationEmail(user.email, messages, t)
    enqueueSnackbar(t('email:success'), { variant: 'success' })

    // Set cooldown for 3 seconds
    setTimeout(() => {
      setIsCooldown(false)
    }, 3000)
  }

  return (
    <Tooltip arrow placement="right" title={t('chat:email', { email: user.email })}>
      <TextButton startIcon={!collapsed && <EmailIcon />} onClick={handleSend} data-testid="email-button" size="large" disabled={disabled || isCooldown}>
        {collapsed ? <EmailIcon fontSize="small" /> : t('email:save')}
      </TextButton>
    </Tooltip>
  )
}

export default EmailButton
