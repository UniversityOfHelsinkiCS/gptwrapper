import React from 'react'
import { KeyboardReturn } from '@mui/icons-material'
import {
  Accordion,
  AccordionActions,
  AccordionSummary,
  Box,
  Button,
  Typography,
} from '@mui/material'
import { grey } from '@mui/material/colors'
import { useTranslation } from 'react-i18next'
import { User } from '../../../types'

const UserAccordion = ({
  user,
  isFocused,
  handleLoginAs,
  decoration,
}: {
  user: User
  isFocused: boolean
  handleLoginAs: (user: User) => () => void
  decoration?: JSX.Element
}) => {
  const { t } = useTranslation()

  return (
    <Accordion
      key={user.id}
      TransitionProps={{ mountOnEnter: true, unmountOnExit: true }}
    >
      <AccordionSummary
        sx={{ cursor: 'pointer', '&:hover': { background: grey['50'] } }}
      >
        <Box display="flex" alignItems="center" width="100%">
          <Typography>{user.username}</Typography>
          <Box mr={2} />
          <Typography>{user.email}</Typography>
          <Box mr={4} />
          <Box mr={4} />
          {decoration}
          <Box mr="auto" />
          {isFocused && (
            <Box display="flex" alignItems="center" justifySelf="end">
              <Typography variant="body2" color="textSecondary">
                {t('admin:press')}
              </Typography>
              <Box mr="0.3rem" />
              <KeyboardReturn fontSize="small" />
              <Box mr="0.3rem" />
              <Typography variant="body2" color="textSecondary">
                {t('admin:enter')}
              </Typography>
            </Box>
          )}
        </Box>
      </AccordionSummary>
      <AccordionActions>
        {typeof handleLoginAs === 'function' && (
          <Button
            onClick={handleLoginAs(user)}
            variant="outlined"
            color="primary"
          >
            {t('admin:loginAsButton')}
          </Button>
        )}
      </AccordionActions>
    </Accordion>
  )
}

export default UserAccordion
