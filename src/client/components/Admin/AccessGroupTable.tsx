import React from 'react'
import { Table, TableContainer, TableBody, TableCell, TableHead, TableRow, Paper, Typography, Box } from '@mui/material'

import useAccessGroups from '../../hooks/useAccessGroups'


const AccessGroupTable = () => {
  const { accessGroups, isLoading } = useAccessGroups()

  if (isLoading) return null

  return (
    <Box mb={2}>
      <Typography mb={2} variant="h4">Access groups:</Typography>
 
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <Typography variant="h5"><b>IAM group</b></Typography>
              </TableCell>
                <TableCell align="right">
                  <Typography variant="h5"><b>Model</b></Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="h5"><b>Usage limit</b></Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="h5"><b>Reset Schedule</b></Typography>
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {accessGroups.map(({ iamGroup, model, usageLimit, resetCron }) => (
              <TableRow key={iamGroup}>
                <TableCell component="th" scope="row">
                  <Typography variant="h6">{iamGroup}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="h6">{model}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="h6">{usageLimit}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="h6">{resetCron}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export default AccessGroupTable
