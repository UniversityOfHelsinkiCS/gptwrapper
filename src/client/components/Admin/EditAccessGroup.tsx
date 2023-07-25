import React, { useState, forwardRef } from 'react'
import { Box, Typography, TextField, Button, Link, Select, MenuItem, Paper } from '@mui/material'
import { enqueueSnackbar } from 'notistack'

import { validModels } from '../../../config'
import { AccessGroup } from '../../types'
import useServices from '../../hooks/useServices'
import { useEditAccessGroupMutation } from '../../hooks/useAccessGroupMutation'

type Props = {
  accessGroup: AccessGroup | undefined,
  setFormOpen: React.Dispatch<React.SetStateAction<boolean>>,
}

const EditAccessGroup = forwardRef(({ accessGroup, setFormOpen }: Props, ref) => {
  if (!accessGroup) return null

  const { id, iamGroup: currentIamGroup, model: currentModel, usageLimit: currentUsageLimit, resetCron: currentResetCron } = accessGroup

  const [iamGroup, setIamGroup] = useState(currentIamGroup)
  const [model, setModel] = useState(currentModel)
  const [usageLimit, setUsageLimit] = useState(currentUsageLimit)
  const [resetCron, setResetCron] = useState(currentResetCron)

  const mutation = useEditAccessGroupMutation()

  const { services, isLoading } = useServices()

  if (isLoading) return null

  const { resetCron: defaultResetCron } = services[0]

  const handleCreate = () => {
    try {
      mutation.mutate({
        id,
        iamGroup,
        model,
        usageLimit,
        resetCron,
      })

      setFormOpen(false)
      enqueueSnackbar('Access group updated', { variant: 'success' })
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' })
    }
  }

  return (
    <Box ref={ref} tabIndex={-1}>
      <Paper variant="outlined" sx={{ margin: 'auto', width: '900px', mt: '20vh' }}>
        <Box sx={{ mx: 3, my: 4 }}>
          <Typography mb={2} variant="h4">Edit Access Group</Typography>

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
                <TextField sx={{ mb: 2, width: '300px' }} value={usageLimit} type="number" onChange={(e) => setUsageLimit(Number(e.target.value))} />
              </Box>

              <Box>
                <Typography mb={1} variant="h5">Reset schedule</Typography>
                <Typography mb={1}>Use Cron notation, see <Link target="_blank" rel="noopener" href="https://crontab.guru">https://crontab.guru</Link></Typography>
                <TextField sx={{ mb: 2, width: '300px' }} value={resetCron} onChange={(e) => setResetCron(e.target.value)} placeholder={defaultResetCron || ''} />
              </Box>
            </Box>
          </Box>

          <Box>
            <Button sx={{ px: 2, py: 1 }} variant="contained" onClick={handleCreate}>Update</Button>
            <Button sx={{ px: 2, py: 1 }} onClick={() => setFormOpen(false)}>Cancel</Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  )
})

export default EditAccessGroup
