import { Box } from '@mui/material'
import { Navigate } from 'react-router-dom'

import useCurrentUser from '../../../hooks/useCurrentUser'
import ChatInstanceTable from './ChatInstanceTable'

const ChatInstances = () => {
  const { user, isLoading } = useCurrentUser()

  if (isLoading) return null
  if (!user?.isAdmin) return <Navigate to="/" />

  return (
    <Box>
      <ChatInstanceTable />
    </Box>
  )
}

export default ChatInstances
