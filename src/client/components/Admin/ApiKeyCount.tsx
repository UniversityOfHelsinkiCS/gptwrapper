import { Box, Tooltip } from '@mui/material'

const ApiKeyCount = ({ names }: { names: string[] }) => {
  if (names.length === 0) return <>0</>

  return (
    <Tooltip title={names.join(', ')} describeChild arrow>
      <Box component="span" tabIndex={0} sx={{ cursor: 'help', textDecoration: 'underline dotted' }}>
        {names.length}
      </Box>
    </Tooltip>
  )
}

export default ApiKeyCount
