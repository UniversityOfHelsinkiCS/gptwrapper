import { Box, Chip, FormControlLabel, Switch, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { getLanguageValue } from '@shared/utils'
import type { Course } from '../../../types'
import { useSaveDiscussionsMutation } from '../../../hooks/useCourseMutation'
import { ORANGE } from '../../ChatV2/general/Buttons'
import { switchFocusIndicatorStyle } from 'src/client/util/accessibility'

// Admin-only: same orange as OrangeButton to set it apart from the controls teachers see
export const ResearchCourseToggle = ({ course }: { course: Course }) => {
  const { t, i18n } = useTranslation()
  const mutation = useSaveDiscussionsMutation()

  const handleChange = (checked: boolean) =>
    window.confirm(t(checked ? 'course:saveDiscussions' : 'course:unsaveDiscussions', { course: getLanguageValue(course.name, i18n.language) })) &&
    mutation.mutate({ chatId: course.courseId as string, saveDiscussions: checked })

  return (
    <Box sx={{ border: '1px solid', borderColor: ORANGE.main, borderRadius: '8px', mb: 3, px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
      <FormControlLabel
        control={
          <Switch
            checked={Boolean(course.saveDiscussions)}
            disabled={mutation.isPending}
            onChange={(_, checked) => handleChange(checked)}
            data-testid="research-course-switch"
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': { color: ORANGE.main, '&:hover': { backgroundColor: `${ORANGE.main}14` } },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: ORANGE.main },
              ...switchFocusIndicatorStyle,
            }}
          />
        }
        label={<Typography variant="body2">{t('course:isReseachCourse')}</Typography>}
      />
      <Chip label={t('common:admin')} size="small" sx={{ ml: 'auto', fontWeight: 600, bgcolor: ORANGE.main, color: 'common.black' }} />
    </Box>
  )
}
