import { useState } from 'react'
import { Box, Button, InputAdornment, TextField, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { BudgetBonusPercentSchema, MAX_BUDGET_BONUS_PERCENT } from '@shared/course'
import type { Course } from '../../../types'
import { useEditCourseMutation } from '../../../hooks/useCourseMutation'
import { enqueueSnackbar } from '../../common/Snackbar'
import { FormError, useFormError } from '../../common/accessibility/FormError'
import { AdminBox } from './AdminBox'

export const CourseBudgetBonusEditor = ({ course }: { course: Course }) => {
  const { t } = useTranslation()
  const mutation = useEditCourseMutation(course.courseId as string)
  const [error, setError] = useFormError()
  const current = course.budgetBonusPercent ?? null
  // An empty field clears the bonus
  const [percent, setPercent] = useState<number | null>(current)

  const parsed = BudgetBonusPercentSchema.safeParse(percent)
  const unchanged = percent === current

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/\D/g, '')
    const next = digits ? Number(digits) : null
    if (next !== null && next > MAX_BUDGET_BONUS_PERCENT) return
    setPercent(next)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!parsed.success) return
    try {
      await mutation.mutateAsync({ budgetBonusPercent: parsed.data })
      enqueueSnackbar(parsed.data === null ? t('course:budgetBonusCleared') : t('course:budgetBonusSaved', { percent: parsed.data }), {
        variant: 'success',
      })
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
          {t('course:budgetBonusTitle')}
        </Typography>
      }
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          label={t('course:budgetBonusLabel')}
          value={percent === null ? '' : String(percent)}
          onChange={handleChange}
          helperText={t('course:budgetBonusHelp')}
          slotProps={{
            htmlInput: { inputMode: 'numeric', 'data-testid': 'course-budget-bonus-input' },
            input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
          }}
          sx={{ flex: '1 1 220px' }}
        />
        <Button type="submit" variant="outlined" disabled={!parsed.success || unchanged || mutation.isPending} data-testid="course-budget-bonus-save">
          {t('common:save')}
        </Button>
      </Box>
      <FormError error={error} />
    </AdminBox>
  )
}
