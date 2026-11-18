import { FormControlLabel, Switch, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { getLanguageValue } from '@shared/utils'
import type { Course } from '../../../types'
import { useSaveDiscussionsMutation } from '../../../hooks/useCourseMutation'
import { ORANGE } from '../../ChatV2/general/Buttons'
import { switchFocusIndicatorStyle } from 'src/client/util/accessibility'
import { AdminBox } from './AdminBox'

export const ResearchCourseToggle = ({ course }: { course: Course }) => {
  const { t, i18n } = useTranslation()
  const mutation = useSaveDiscussionsMutation()

  const handleChange = (checked: boolean) =>
    window.confirm(t(checked ? 'course:saveDiscussions' : 'course:unsaveDiscussions', { course: getLanguageValue(course.name, i18n.language) })) &&
    mutation.mutate({ chatId: course.courseId as string, saveDiscussions: checked })

  return (
    <AdminBox
      header={
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
      }
    />
  )
}
