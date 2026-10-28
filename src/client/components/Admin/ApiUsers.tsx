import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import useApiUsers from '../../hooks/useApiUsers'
import ApiKeyCount from './ApiKeyCount'

const ApiUsers = () => {
  const { t } = useTranslation()

  const { data: apiUsers, isLoading, error } = useApiUsers()

  if (isLoading) return null

  if (error || !apiUsers) {
    return (
      <Box my={2}>
        <Typography>{t('error:unexpected')}</Typography>
      </Box>
    )
  }

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
            </TableRow>
          </TableHead>
          <TableBody>
            {apiUsers.map((apiUser) => (
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export default ApiUsers
