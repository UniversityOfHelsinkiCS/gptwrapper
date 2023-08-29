import React, { useState, forwardRef } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  Link,
  Select,
  MenuItem,
  Paper,
} from '@mui/material'
import { enqueueSnackbar } from 'notistack'
import { useTranslation } from 'react-i18next'

import {
  validModels,
  DEFAULT_MODEL,
  DEFAULT_TOKEN_LIMIT,
  DEFAULT_RESET_CRON,
} from '../../../../config'
import { useCreateAccessGroupMutation } from '../../../hooks/useAccessGroupMutation'

type Props = {
  setFormOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const CreateAccessGroup = forwardRef(({ setFormOpen }: Props, ref) => {
  const [iamGroup, setIamGroup] = useState('')
  const [model, setModel] = useState(DEFAULT_MODEL)
  const [usageLimit, setUsageLimit] = useState(DEFAULT_TOKEN_LIMIT)
  const [resetCron, setResetCron] = useState(DEFAULT_RESET_CRON)

  const { t } = useTranslation()

  const mutation = useCreateAccessGroupMutation()

  const handleCreate = () => {
    try {
      mutation.mutate({
        iamGroup,
        model,
        usageLimit,
        resetCron,
      })

      setFormOpen(false)
      enqueueSnackbar('Access group created', { variant: 'success' })
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' })
    }
  }

  return (
    <Box ref={ref} tabIndex={-1}>
      <Paper
        variant="outlined"
        sx={{ margin: 'auto', width: '900px', mt: '20vh' }}
      >
        <Box sx={{ mx: 3, my: 4 }}>
          <Typography mb={2} variant="h4">
            {t('admin:newAccessGroup')}
          </Typography>

          <Box m={5} display="flex" justifyContent="space-between">
            <Box
              height="300px"
              display="flex"
              justifyContent="space-between"
              flexDirection="column"
            >
              <Box>
                <Typography mb={1} variant="h5">
                  {t('admin:iamGroup')}
                </Typography>
                <Typography mb={1}>{t('admin:iamGroupInfo')}</Typography>
                <TextField
                  sx={{ mb: 2, width: '300px' }}
                  value={iamGroup}
                  onChange={(e) => setIamGroup(e.target.value)}
                  placeholder="grp-curregpt"
                />
              </Box>

              <Box>
                <Typography mb={1} variant="h5">
                  {t('admin:model')}
                </Typography>
                <Typography mb={1}>{t('admin:modelInfo')}</Typography>
                <Select
                  sx={{ mb: 2, width: '300px' }}
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  {validModels.map(({ name }) => (
                    <MenuItem key={name} value={name}>
                      {name}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
            </Box>

            <Box
              height="300px"
              display="flex"
              justifyContent="space-between"
              flexDirection="column"
            >
              <Box>
                <Typography mb={1} variant="h5">
                  {t('admin:usageLimit')}
                </Typography>
                <Typography mb={1}>{t('admin:usageLimitInfo')}</Typography>
                <TextField
                  sx={{ mb: 2, width: '300px' }}
                  value={usageLimit}
                  type="number"
                  onChange={(e) => setUsageLimit(Number(e.target.value))}
                />
              </Box>

              <Box>
                <Typography mb={1} variant="h5">
                  {t('admin:resetCron')}
                </Typography>
                <Typography mb={1}>
                  Use Cron notation, see{' '}
                  <Link
                    target="_blank"
                    rel="noopener"
                    href="https://crontab.guru"
                  >
                    https://crontab.guru
                  </Link>
                </Typography>
                <TextField
                  sx={{ mb: 2, width: '300px' }}
                  value={resetCron}
                  onChange={(e) => setResetCron(e.target.value)}
                />
              </Box>
            </Box>
          </Box>

          <Box>
            <Button
              sx={{ px: 2, py: 1 }}
              variant="contained"
              onClick={handleCreate}
            >
              {t('common:create')}
            </Button>
            <Button sx={{ px: 2, py: 1 }} onClick={() => setFormOpen(false)}>
              {t('common:cancel')}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  )
})

export default CreateAccessGroup
