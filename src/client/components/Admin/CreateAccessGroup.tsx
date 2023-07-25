import React, { useState, forwardRef } from 'react'
import { Box, Typography, TextField, Button, Link, Select, MenuItem, Paper } from '@mui/material'

import useServices from '../../hooks/useServices'
import { useCreateAccessGroupMutation } from '../../hooks/useAccessGroupMutation'

const CreateAccessGroup = forwardRef(({ validModels }: { validModels: string[] }, ref) => {
  const [iamGroup, setIamGroup] = useState('')
  const [model, setModel] = useState('gpt-3.5-turbo')
  const [usageLimit, setUsageLimit] = useState('')
  const [resetCron, setResetCron] = useState('')

  const mutation = useCreateAccessGroupMutation()

  const { services, isLoading } = useServices()

  if (isLoading) return null

  const { resetCron: defaultResetCron } = services[0]

  const handleCreate = () => {
    mutation.mutate({
      iamGroup,
      model,
      usageLimit,
      resetCron,
    })

    setIamGroup('')
    setModel('gpt-3.5-turbo')
    setUsageLimit('')
    setResetCron('')
  }

  return (
    <Box ref={ref} tabIndex={-1}>
      <Paper variant="outlined" sx={{ margin: 'auto', width: '900px', mt: '20vh' }}>
        <Box sx={{ mx: 3, my: 4 }}>
          <Typography mb={2} variant="h4">New Access Group</Typography>

          <Box m={5} display="flex" justifyContent="space-between">
            <Box height="300px" display="flex" justifyContent="space-between" flexDirection="column">
              <Box>
                <Typography mb={1} variant="h5">Access group:</Typography>
                <Typography mb={1}>IAM group to give access to</Typography>
                <TextField sx={{ mb: 2, width: '300px' }} value={iamGroup} onChange={(e) => setIamGroup(e.target.value)} placeholder="grp-curregpt" />
              </Box>

              <Box>
                <Typography mb={1} variant="h5">Model</Typography>
                <Typography mb={1}>OpenAi language model to use</Typography>
                <Select sx={{ mb: 2, width: '300px' }} value={model} onChange={(e) => setModel(e.target.value)}>
                  {validModels.map((validModel) => (
                    <MenuItem key={validModel} value={validModel}>{validModel}</MenuItem>
                  ))}
                </Select>
              </Box>
            </Box>

            <Box height="300px" display="flex" justifyContent="space-between" flexDirection="column">
              <Box>
                <Typography mb={1} variant="h5">Usage limit</Typography>
                <Typography mb={1}>Usage limit in tokens</Typography>
                <TextField sx={{ mb: 2, width: '300px' }} value={usageLimit} type="number" onChange={(e) => setUsageLimit(e.target.value)} />
              </Box>

              <Box>
                <Typography mb={1} variant="h5">Reset schedule</Typography>
                <Typography mb={1}>Use Cron notation, see <Link target="_blank" rel="noopener" href="https://crontab.guru">https://crontab.guru</Link></Typography>
                <TextField sx={{ mb: 2, width: '300px' }} value={resetCron} onChange={(e) => setResetCron(e.target.value)} placeholder={defaultResetCron || ''} />
              </Box>
            </Box>
          </Box>

          <Box>
            <Button variant="contained" onClick={handleCreate}>Create</Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  )
})

export default CreateAccessGroup
