import React, { useState, forwardRef } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  Paper,
} from '@mui/material'
import { enqueueSnackbar } from 'notistack'
import { useTranslation } from 'react-i18next'

import { validModels } from '../../../../config'
import { ChatInstance } from '../../../types'
import { useEditServiceMutation } from '../../../hooks/useServiceMutation'

type Props = {
  service: ChatInstance | undefined
  setFormOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const EditService = forwardRef(({ service, setFormOpen }: Props, ref) => {
  if (!service) return null

  const {
    id,
    name: currentName,
    description: currentDescription,
    model: currentModel,
    usageLimit: currentUsageLimit,
    courseId: currentCourseId,
  } = service

  const [name, setName] = useState(currentName)
  const [description, setDescription] = useState(currentDescription)
  const [model, setModel] = useState(currentModel)
  const [usageLimit, setUsageLimit] = useState(currentUsageLimit)
  const [courseId, setCourseId] = useState(currentCourseId)

  const mutation = useEditServiceMutation()

  const { t } = useTranslation()

  const handleCreate = () => {
    try {
      mutation.mutate({
        id,
        name,
        description,
        model,
        usageLimit,
        courseId,
      })

      setFormOpen(false)
      enqueueSnackbar('Course service updated', { variant: 'success' })
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
            {t('admin:editService')}
          </Typography>

          <Box mb={-5} ml="35px">
            <Box>
              <Typography mb={1} variant="h5">
                {t('admin:courseId')}
              </Typography>
              <Typography mb={1}>{t('admin:courseIdInfo')}</Typography>
              <TextField
                sx={{ mb: 2, width: '500px' }}
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                placeholder="hy-opt-cur-2324-3a70433a-d793-46a4-a43e-a42968419133"
              />
            </Box>
          </Box>

          <Box m={5} display="flex" justifyContent="space-between">
            <Box
              height="300px"
              display="flex"
              justifyContent="space-between"
              flexDirection="column"
            >
              <Box>
                <Typography mb={1} variant="h5">
                  {t('admin:name')}
                </Typography>
                <Typography mb={1}>{t('admin:courseNameInfo')}</Typography>
                <TextField
                  sx={{ mb: 2, width: '300px' }}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Introduction to Artificial Intelligence"
                />
              </Box>

              <Box>
                <Typography mb={1} variant="h5">
                  {t('admin:description')}
                </Typography>
                <Typography mb={1}>
                  {t('admin:courseDescriptionInfo')}
                </Typography>
                <TextField
                  sx={{ mb: 2, width: '300px' }}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
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
                  {t('admin:model')}
                </Typography>
                <Typography mb={1}>{t('admin:modelInfo')}</Typography>
                <Select
                  sx={{ mb: 2, width: '300px' }}
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  {validModels.map(({ name: modelName }) => (
                    <MenuItem key={modelName} value={modelName}>
                      {modelName}
                    </MenuItem>
                  ))}
                </Select>
              </Box>

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
            </Box>
          </Box>

          <Box>
            <Button
              sx={{ px: 2, py: 1 }}
              variant="contained"
              onClick={handleCreate}
            >
              {t('common:update')}
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

export default EditService
