import React, { useState, useEffect } from 'react'
import { Button, Tooltip } from '@mui/material'
import { Mail } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { enqueueSnackbar } from 'notistack'

import { PUBLIC_URL } from '../../../config'
import { Message, User } from '../../types'
import { sendEmail } from './util'

const formatEmail = (messages: Message[], t: any): string => (
  messages.map(({ role, content }) => (
    `<div style="display: flex; margin-bottom: 10px;">
      <div style="margin-right: 10px;">
        ${role === 'user' ? t('email:user') : t('email:assistant')}
      </div>
      <div>
        ${content}
      </div>
    </div>`
  )).join('')
)

const Email = ({ system, messages, disabled }: { system: string, messages: Message[], disabled: boolean }) => {
  const { t } = useTranslation()

  const [email, setEmail] = useState('')

  const handleSend = async () => {
    const text = formatEmail(messages, t)

    const response = await sendEmail(email, text, system)

    if (response.ok) {
      enqueueSnackbar(t('email:success'), { variant: 'success' })
    } else {
      enqueueSnackbar('email:failure', { variant: 'error' })
    }
  }

  useEffect(() => {
    const getEmail = async () => {
      const response = await fetch(`${PUBLIC_URL}/api/login`)
      const user: User = await response.json()

      if (user?.email) setEmail(user.email)
    }

    getEmail()
  }, [])

  if (!email) return null

  return (
    <Tooltip title={email} followCursor>
      <span>
        <Button
          sx={{ float: 'right', marginTop: -7 }}
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
