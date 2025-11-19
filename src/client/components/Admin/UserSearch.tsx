import { Box, Button, Container, Input, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { enqueueSnackbar } from 'notistack'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import useResetUsageMutation from '../../hooks/useResetUsageMutation'
import useUserSearch from '../../hooks/useUserSearch'

import type { User } from '../../types'
import useResponsibilityUserSearch from '../../hooks/useResponsibilityUserSearch'

const handleLoginAs = (user: User) => () => {
  localStorage.setItem('adminLoggedInAs', user.id)
  localStorage.setItem('adminLoggedInAsUser', JSON.stringify(user))
  window.location.reload()
}

const UserTable = ({ users }: { users: User[] }) => {
  const resetUsage = useResetUsageMutation()

  const onResetUsage = (userId: string) => {
    try {
      resetUsage.mutate(userId)
      enqueueSnackbar('User usage reset, please refresh the browser to see the change!', { variant: 'success' })
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' })
    }
  }

  const { t } = useTranslation()

  if (!users || users.length === 0) return null

  return (
    <Box my={2}>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <Typography variant="h6">
                  <b>{t('admin:username')}</b>
                </Typography>
              </TableCell>
              <TableCell align="left">
                <Typography variant="h6">
                  <b>{t('admin:lastName')}</b>
                </Typography>
              </TableCell>
              <TableCell align="left">
                <Typography variant="h6">
                  <b>{t('admin:firstNames')}</b>
                </Typography>
              </TableCell>
              <TableCell align="left">
                <Typography variant="h6">
                  <b>{t('admin:studentNumber')}</b>
                </Typography>
              </TableCell>
              <TableCell align="left">
                <Typography variant="h6">
                  <b>{t('admin:email')}</b>
                </Typography>
              </TableCell>
              <TableCell align="left">
                <Typography variant="h6">
                  <b>{t('admin:usage')}</b>
                </Typography>
              </TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell component="th" scope="row">
                  <Typography variant="h6">{user.username}</Typography>
                </TableCell>
                <TableCell align="left">
                  <Typography variant="h6">{user.lastName}</Typography>
                </TableCell>
                <TableCell align="left">
                  <Typography variant="h6">{user.firstNames}</Typography>
                </TableCell>
                <TableCell align="left">
                  <Typography variant="h6">{user.studentNumber}</Typography>
                </TableCell>
                <TableCell align="left">
                  <Typography variant="h6">{user.primaryEmail}</Typography>
                </TableCell>
                <TableCell align="left">
                  <Typography variant="h6">{user.usage}</Typography>
                </TableCell>
                <TableCell>
                  <Button variant="outlined" onClick={handleLoginAs(user)}>
                    {t('admin:loginAsButton')}
                  </Button>
                  {user.usage > 0 && (
                    <Button variant="outlined" onClick={() => onResetUsage(user.id)}>
                      {t('admin:resetTokens')}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

const ActionUserTable = ({
  users,
  actionText,
  drawActionComponent,
}: {
  users: User[] | any
  actionText: string
  drawActionComponent: (user: User | any) => any
}) => {
  const { t } = useTranslation()
  if (!users || users.length === 0) return null

  return (
    <Box my={2}>
      <TableContainer component={Container}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <Typography variant="h6">
                  <b>{t('admin:username')}</b>
                </Typography>
              </TableCell>
              <TableCell align="left">
                <Typography variant="h6">
                  <b>{t('admin:lastName')}</b>
                </Typography>
              </TableCell>
              <TableCell align="left">
                <Typography variant="h6">
                  <b>{t('admin:firstNames')}</b>
                </Typography>
              </TableCell>
              <TableCell align="left">
                <Typography variant="h6">
                  <b>{t('admin:studentNumber')}</b>
                </Typography>
              </TableCell>
              <TableCell align="left">
                <Typography variant="h6">
                  <b>{t('admin:email')}</b>
                </Typography>
              </TableCell>
              <TableCell align="left">
                <Typography variant="h6">
                  <b>{actionText}</b>
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell component="th" scope="row">
                  <Typography variant="h6">{user.username}</Typography>
                </TableCell>
                <TableCell align="left">
                  <Typography variant="h6">{user.lastName}</Typography>
                </TableCell>
                <TableCell align="left">
                  <Typography variant="h6">{user.firstNames}</Typography>
                </TableCell>
                <TableCell align="left">
                  <Typography variant="h6">{user.studentNumber}</Typography>
                </TableCell>
                <TableCell align="left">
                  <Typography variant="h6">{user.primaryEmail}</Typography>
                </TableCell>
                <TableCell>{drawActionComponent(user)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
const UserSearch = () => {
  const [search, setSearch] = useState('')
  const { users, isLoading, refetch } = useUserSearch(search)
  const inputRef = useRef<HTMLInputElement>(null)
  const { t } = useTranslation()

  useEffect(() => {
    if (search && search.length > 4) {
      refetch()
    }
  }, [search])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  return (
    <Box>
      <TextField value={search} onChange={(v) => setSearch(v.currentTarget.value)} inputRef={inputRef} />

      {search.length > 2 && search.length < 5 && <div>{t('admin:typeMore')}</div>}

      {isLoading && <div>Loading...</div>}
      {users && <UserTable users={users} />}
    </Box>
  )
}
//a component which allows users to be searched in order to perform some kind of action with the user
export const ActionUserSearch = ({ actionText, drawActionComponent }: { actionText: string; drawActionComponent: (user: any) => any }) => {
  const [search, setSearch] = useState('')
  const { users, isLoading, refetch } = useUserSearch(search)
  const { t } = useTranslation()

  useEffect(() => {
    if (search && search.length > 4) {
      refetch()
    }
  }, [search])

  return (
    <Box>
      <Input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('admin:searchUsers')} />

      {search.length > 2 && search.length < 5 && <div>{t('admin:typeMore')}</div>}

      {isLoading && <div>Loading...</div>}
      {users && <ActionUserTable users={users} actionText={actionText} drawActionComponent={drawActionComponent} />}
    </Box>
  )
}

//component that also allows an action to be done on a user, by an admin or by an user that is responsible for a course
export const ResponsibilityActionUserSearch = ({
  actionText,
  drawActionComponent,
  courseId,
}: {
  actionText: string
  drawActionComponent: (user: any) => any
  courseId: string
}) => {
  const [search, setSearch] = useState('')
  const { users, isLoading, refetch } = useResponsibilityUserSearch(search, courseId)
  const { t } = useTranslation()

  useEffect(() => {
    if (search && search.length > 4) {
      refetch()
    }
  }, [search])

  return (
    <Box>
      <Input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('admin:searchUsers')} />

      {search.length > 2 && search.length < 5 && <div>{t('admin:typeMore')}</div>}

      {isLoading && <div>Loading...</div>}
      {users && <ActionUserTable users={users} actionText={actionText} drawActionComponent={drawActionComponent} />}
    </Box>
  )
}
export default UserSearch
