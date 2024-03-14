import React from 'react'
import {
  Table,
  TableContainer,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import { Faculty, Locales, User } from '../../../types'
import useUsers from '../../../hooks/useUsers'
import useFaculties from '../../../hooks/useFaculties'

const calculateFacultyUsage = (users: User[], faculties: Faculty[]) => {
  const facultyUsage = faculties.map((faculty) => ({
    faculty,
    usageCount: 0,
  }))

  users.forEach(({ usage, iamGroups }) => {
    faculties.forEach(({ code, iams }) => {
      if (iams.some((iam) => iamGroups.includes(iam))) {
        facultyUsage.find(({ faculty }) => faculty.code === code).usageCount +=
          usage
      }
    })
  })

  return facultyUsage
}

const sortUsage = (a: { faculty: Faculty }, b: { faculty: Faculty }) =>
  a.faculty.code.localeCompare(b.faculty.code)

const FacultyTable = () => {
  const { users, isLoading } = useUsers()
  const { faculties, isLoading: facultiesLoading } = useFaculties()

  const { t, i18n } = useTranslation()

  if (isLoading || facultiesLoading) return null

  const facultyUsage = calculateFacultyUsage(users, faculties)
  const sortedUsage = facultyUsage.sort(sortUsage)

  return (
    <Box my={2}>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <Typography variant="h5">
                  <b>{t('admin:name')}</b>
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="h5" align="right">
                  <b>{t('admin:usageCount')}</b>
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {sortedUsage.map(({ faculty, usageCount }) => (
              <TableRow key={faculty.code}>
                <TableCell component="th" scope="row">
                  <Typography variant="h6">
                    {faculty.name[i18n.language as keyof Locales] ??
                      faculty.name.fi}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="h6">{usageCount}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export default FacultyTable
