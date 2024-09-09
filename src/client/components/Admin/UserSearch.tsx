import React, { useState, useEffect } from 'react'
import { Box, Input, Button } from '@mui/material'
import { useTranslation } from 'react-i18next'
import useUserSearch from '../../hooks/useUserSearch'

import { User } from '../../types'

const handleLoginAs = (user: User) => () => {
  localStorage.setItem('adminLoggedInAs', user.id)
  window.location.reload()
}

const UserSearch = () => {
  const [search, setSearch] = useState('')
  const { users, isLoading, refetch } = useUserSearch(search)
  const { t } = useTranslation()

  useEffect(() => {
    if (search.length > 3) {
      refetch()
    }
  }, [search])

  return (
    <Box>
      <Input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {isLoading && <div>Loading...</div>}
      {!isLoading &&
        users.map((user) => (
          <div key={user.id} style={{ marginTop: 10 }}>
            <span style={{ marginRight: 20 }}>{user.username}</span>
            <Button
              onClick={handleLoginAs(user)}
              variant="outlined"
              color="primary"
            >
              {t('admin:loginAsButton')}
            </Button>
          </div>
        ))}
    </Box>
  )
}

export default UserSearch
