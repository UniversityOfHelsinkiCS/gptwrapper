import { useState } from 'react'
import { Box, Button, TextField, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { DEFAULT_TOKEN_LIMIT } from '@config'
import { MAX_TOKEN_LIMIT, TokenLimitSchema } from '@shared/course'
import type { Course } from '../../../types'
import { useEditCourseMutation } from '../../../hooks/useCourseMutation'
import { enqueueSnackbar } from '../../common/Snackbar'
import { FormError, useFormError } from '../../common/accessibility/FormError'
import { AdminBox } from './AdminBox'

const formatLimit = new Intl.NumberFormat('fi').format
const digitsOf = (value: string) => value.replace(/\D/g, '')

const caretAfterDigits = (formatted: string, digitCount: number) => {
  let caret = 0
  for (let seen = 0; seen < digitCount && caret < formatted.length; caret++) {
    if (/\d/.test(formatted[caret])) seen++
  }
  return caret
}

export const CourseTokenLimitEditor = ({ course }: { course: Course }) => {
  const { t } = useTranslation()
  const mutation = useEditCourseMutation(course.courseId as string)
  const [error, setError] = useFormError()
  const [limit, setLimit] = useState<number | undefined>(course.usageLimit)

  const parsed = TokenLimitSchema.safeParse(limit)
  const invalid = !parsed.success
  const unchanged = limit === course.usageLimit

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const digits = digitsOf(input.value)
    const next = digits ? Number(digits) : undefined
    if (next !== undefined && next > MAX_TOKEN_LIMIT) return

    const digitsBeforeCaret = digitsOf(input.value.slice(0, input.selectionStart ?? input.value.length)).length
    setLimit(next)
    requestAnimationFrame(() => {
      const caret = caretAfterDigits(input.value, digitsBeforeCaret)
      input.setSelectionRange(caret, caret)
    })
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!parsed.success) return
    try {
      await mutation.mutateAsync({ usageLimit: parsed.data })
      enqueueSnackbar(t('course:tokenLimitSaved', { limit: formatLimit(parsed.data) }), { variant: 'success' })
    } catch (err: any) {
      setError(err.message || t('error:unexpected'))
    }
  }

  return (
    <AdminBox
      component="form"
      onSubmit={handleSubmit}
      header={
        <Typography variant="body2" fontWeight="bold">
          {t('course:tokenLimitTitle')}
        </Typography>
      }
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          label={t('course:tokenLimitLabel')}
          value={limit === undefined ? '' : formatLimit(limit)}
          onChange={handleChange}
          error={invalid}
          helperText={t(invalid ? 'course:tokenLimitInvalid' : 'course:tokenLimitHelp', {
            default: formatLimit(DEFAULT_TOKEN_LIMIT),
          })}
          slotProps={{ htmlInput: { inputMode: 'numeric', 'data-testid': 'course-token-limit-input' } }}
          sx={{ flex: '1 1 220px' }}
        />
        <Button type="submit" variant="outlined" disabled={invalid || unchanged || mutation.isPending} data-testid="course-token-limit-save">
          {t('common:save')}
        </Button>
      </Box>
      <FormError error={error} />
    </AdminBox>
  )
}
