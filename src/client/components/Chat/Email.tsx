import { Mail } from '@mui/icons-material'
import { Button, Tooltip } from '@mui/material'
import { enqueueSnackbar } from 'notistack'
import { useTranslation } from 'react-i18next'
import useCurrentUser from '../../hooks/useCurrentUser'
import type { Message } from '../../types'
import { sendEmail } from '../../util/email'

const escapeHtml = (str: string): string => {
  const escapedStr = str.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
  return escapedStr
}

const formatEmail = (messages: Message[], t: any): string =>
  messages
    .map(
      ({ role, content }) =>
        ` <div style="margin-right: 10px;"> <div style="display: flex; margin-bottom: 10px;">

        ${t(`email:${role}`)}
      </div>
      <div>

        ${escapeHtml(content)}

      </div>
   </div>`,
    )
    .join('')

const Email = ({ system, messages, disabled, hidePrompt }: { system: string; messages: Message[]; disabled: boolean; hidePrompt: boolean }) => {
  const { t } = useTranslation()
  const { user, isLoading } = useCurrentUser()

  if (isLoading || !user?.email) return null

  const { email } = user

  const handleSend = async () => {
    const systemMessage: Message = { role: 'system', content: system }

    const newMessages = systemMessage.content && !hidePrompt ? ([] as Message[]).concat(systemMessage, messages) : messages

    const date = new Date()

    const formattedDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
    const subject = `CurreChat ${formattedDate}`

    const text = formatEmail(newMessages, t)

    const response = await sendEmail(email, text, subject)

    if (response.ok) {
      enqueueSnackbar(t('email:success'), { variant: 'success' })
    } else {
      enqueueSnackbar(t('email:failure'), { variant: 'error' })
    }
  }

  return (
    <Tooltip title={email} followCursor>
      <span>
        <Button
          sx={(theme) => ({
            [theme.breakpoints.up('lg')]: { float: 'right', marginTop: -7 },
          })}
          onClick={handleSend}
          disabled={disabled}
          startIcon={<Mail />}
        >
          {t('email:save')}
        </Button>
      </span>
    </Tooltip>
  )
}

export default Email
