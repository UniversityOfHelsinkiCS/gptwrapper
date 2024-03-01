import React from 'react'
import { Button, Tooltip } from '@mui/material'
import { Mail } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { enqueueSnackbar } from 'notistack'

import { Message } from '../../types'
import useCurrentUser from '../../hooks/useCurrentUser'
import { sendEmail } from '../../util/email'

const formatEmail = (messages: Message[], t: any): string =>
  messages
    .map(
      ({ role, content }) =>
        `<div style="display: flex; margin-bottom: 10px;">
      <div style="margin-right: 10px;">
        ${role === 'user' ? t('email:user') : t('email:assistant')}
      </div>
      <div>
        ${content}
      </div>
    </div>`
    )
    .join('')

const Email = ({
  system,
  messages,
  disabled,
}: {
  system: string
  messages: Message[]
  disabled: boolean
}) => {
  const { t } = useTranslation()
  const { user, isLoading } = useCurrentUser()

  if (isLoading || !user?.email) return null

  const { email } = user

  const handleSend = async () => {
    const text = formatEmail(messages, t)

    const response = await sendEmail(email, text, system)

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
