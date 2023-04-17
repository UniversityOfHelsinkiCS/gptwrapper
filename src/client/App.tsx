import React, { useState, useEffect } from 'react'
import { Box, Typography, Button } from '@mui/material'

import apiClient from './util/apiClient'

const testApi = async () => {
  const { data } = await apiClient.get('/ping')
  console.log(data)
}

const App = () => {
  const [count, setCount] = useState(0)

  useEffect(() => {
    testApi()
  }, [count])

  return (
    <Box>
      <Typography variant="h1">Vite + React</Typography>
      <Box>
        <Button onClick={() => setCount(count + 1)}>
          count is {count}
        </Button>
        <Typography>
          Edit <code>src/App.tsx</code> and save to test HMR
        </Typography>
      </Box>
      <Typography>
        Click on the Vite and React logos to learn more
      </Typography>
    </Box>
  )
}

export default App
