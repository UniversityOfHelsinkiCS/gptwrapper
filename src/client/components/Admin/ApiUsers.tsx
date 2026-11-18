import { Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import useApiUsers from '../../hooks/useApiUsers'
import useResetUsageMutation from '../../hooks/useResetUsageMutation'
import { enqueueSnackbar } from '../common/Snackbar'
import ApiKeyCount from './ApiKeyCount'

const ApiUsers = () => {
  const { t } = useTranslation()

  const { data: apiUsers, isLoading, error, refetch } = useApiUsers()
  const resetUsage = useResetUsageMutation()

  const onResetUsage = (userId: string) =>
    resetUsage.mutate(userId, {
      onSuccess: () => {
        enqueueSnackbar(t('admin:generalUsageResetDone'), { variant: 'success' })
        refetch()
      },
      onError: (err: Error) => enqueueSnackbar(err.message, { variant: 'error' }),
    })

  if (isLoading) return null

  if (error || !apiUsers) {
    return (
      <Box my={2}>
        <Typography>{t('error:unexpected')}</Typography>
      </Box>
    )
  }

  const sortedApiUsers = [...apiUsers].sort((a, b) => b.usage - a.usage || b.apiKeyNames.length - a.apiKeyNames.length)

  return (
    <Box my={2}>
      <Typography variant="h4" component="h3" sx={{ mb: 2 }}>
        {t('admin:apiUsers')}
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('admin:participantName')}</TableCell>
              <TableCell>{t('admin:username')}</TableCell>
              <TableCell>{t('admin:studentNumber')}</TableCell>
              <TableCell align="right">{t('apiKeys:title')}</TableCell>
              <TableCell align="right">{t('admin:generalUsage')}</TableCell>
              <TableCell>{t('admin:actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedApiUsers.map((apiUser) => (
              <TableRow key={apiUser.id}>
                <TableCell component="th" scope="row">
                  {apiUser.lastName} {apiUser.firstNames}
                </TableCell>
                <TableCell>{apiUser.username}</TableCell>
                <TableCell>{apiUser.studentNumber}</TableCell>
                <TableCell align="right">
                  <ApiKeyCount names={apiUser.apiKeyNames} />
                </TableCell>
                <TableCell align="right">{apiUser.usage}</TableCell>
                <TableCell>
                  <Button size="small" variant="outlined" disabled={apiUser.usage === 0} onClick={() => onResetUsage(apiUser.id)}>
                    {t('admin:resetTokens')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export default ApiUsers
