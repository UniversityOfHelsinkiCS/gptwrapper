import { KeyboardEvent, useState } from 'react'

import { TextField, Box } from '@mui/material'

import { debounce } from 'lodash'
import { useTranslation } from 'react-i18next'
import UserAccordion from './UserAccordion'
import apiClient from '../../../util/apiClient'
import { User } from '../../../types'

const handleLoginAs = (user: User) => () => {
  localStorage.setItem('adminLoggedInAs', user.id)
  window.location.reload()
}

const LoginAsSelector = () => {
  const { t } = useTranslation()
  const [potentialUsers, setPotentialUsers] = useState([])
  const [focusIndex, setFocusIndex] = useState(0)
  const [lastQuery, setLastQuery] = useState({})

  const handleChange = debounce(async ({ target }) => {
    const query = target.value
    if (query.length < 5) return

    const params = {
      user: query,
    }

    const res = await apiClient.get(`/admin/user-search`, { params })
    const { params: queried, persons } = res.data

    setLastQuery(queried)
    setPotentialUsers(persons)
    setFocusIndex(
      Math.min(focusIndex, persons.length > 0 ? persons.length - 1 : 0)
    )
  }, 400)

  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && potentialUsers.length > 0)
      handleLoginAs(potentialUsers[focusIndex])()
    if (event.key === 'ArrowDown') {
      setFocusIndex(Math.min(focusIndex + 1, potentialUsers.length - 1))
      event.preventDefault()
    }
    if (event.key === 'ArrowUp') {
      setFocusIndex(Math.max(focusIndex - 1, 0))
      event.preventDefault()
    }
  }

  return (
    <Box my={4} onKeyDown={handleKeyPress}>
      <TextField
        style={{ width: '30em' }}
        label={t('admin:userSearchFieldLabel')}
        variant="outlined"
        onChange={handleChange}
      />

      <div style={{ paddingTop: 10 }}>
        {t('admin:searchedFor')}
        {Object.entries(lastQuery).map(([key, value]) => (
          <p key={key}>
            {key}: {value as string}
          </p>
        ))}
      </div>

      {potentialUsers.map((user, index) => (
        <UserAccordion
          key={user.id}
          user={user}
          handleLoginAs={handleLoginAs}
          isFocused={index === focusIndex}
        />
      ))}
    </Box>
  )
}

export default LoginAsSelector
