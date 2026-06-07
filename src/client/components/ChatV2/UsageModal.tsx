import { Box, Typography } from '@mui/material'
import useUserUsages from '../../hooks/useUserUsage'
import { CourseUsage } from '@shared/types'

const UsageModal = () => {
  const { usageInfo, isLoading } = useUserUsages()

  if (isLoading) {
    return '...Loading'
  }

  console.log(usageInfo)
  return (
    <>
      <Box>
        {usageInfo.courses.map((course: CourseUsage) => (
          <Typography>
            {course.name.fi} : {course.usage} / {usageInfo.limit}
          </Typography>
        ))}
      </Box>
    </>
  )
}

export default UsageModal
