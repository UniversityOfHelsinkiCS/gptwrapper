import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import {
  AppBar,
  Toolbar,
  MenuItem,
  Box,
  Container,
  MenuList,
  Button,
  Paper,
  ClickAwayListener,
  Grow,
  Popper,
  Typography,
} from '@mui/material'
import {
  Language,
  AdminPanelSettingsOutlined,
  BookmarksOutlined,
} from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

import { User } from '../../types'
import useCurrentUser from '../../hooks/useCurrentUser'
import hyLogo from '../../assets/hy_logo.svg'
import styles from './styles'

const hasAccess = (user: User | null | undefined, courseId?: string) => {
  if (!user) return false
  if (user.isAdmin) return true
  if (courseId && !user.activeCourseIds.includes(courseId)) return false
  if (!courseId && !user.hasIamAccess) return false

  return true
}

const getRedirect = (user: User | null | undefined) => {
  if (!user) return '/noaccess'
  if (user.hasIamAccess) return '/'
  return `${user.activeCourseIds[0] || '/noaccess'}`
}

const NavBar = () => {
  const { t, i18n } = useTranslation()
  const { courseId } = useParams()
  const location = useLocation()
  const [openLanguageSelect, setOpenLanguageSelect] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)

  const { language } = i18n
  const languages = ['fi', 'en'] // Possibly Swedish as well

  const { user, isLoading } = useCurrentUser()

  useEffect(() => {
    if (user && user.language && languages.includes(user.language))
      i18n.changeLanguage(user.language)
  }, [user, i18n])

  const handleLanguageChange = (newLanguage: string) => {
    i18n.changeLanguage(newLanguage)
    setOpenLanguageSelect(false)
  }

  if (isLoading) return null

  if (location.pathname !== '/noaccess' && !hasAccess(user, courseId)) {
    window.location.href = getRedirect(user)
    return null
  }

  if (!user) return null

  return (
    <AppBar elevation={0} position="relative" sx={styles.appbar}>
      <Container maxWidth={false}>
        <Toolbar sx={styles.toolbar} disableGutters>
          <Box sx={styles.navBox}>
            <img src={hyLogo} alt="University of Helsinki" width="40" />
            <Box ml="2rem">
              <Typography sx={styles.appName}>{t('appName')}</Typography>
            </Box>
          </Box>
          <Box>
            {user.ownCourses.length > 0 && (
              <Link to="/courses" style={{ textDecoration: 'none' }}>
                <Button>
                  <BookmarksOutlined sx={styles.icon} /> {t('courses')}
                </Button>
              </Link>
            )}
            {user.isAdmin && (
              <Link to="/admin" style={{ textDecoration: 'none' }}>
                <Button>
                  <AdminPanelSettingsOutlined sx={styles.icon} /> {t('admin')}
                </Button>
              </Link>
            )}
            <Button
              ref={anchorRef}
              id="composition-button"
              data-cy="language-select"
              aria-controls={
                openLanguageSelect ? 'composition-menu' : undefined
              }
              aria-expanded={openLanguageSelect ? 'true' : undefined}
              aria-haspopup="true"
              onClick={() => setOpenLanguageSelect(!openLanguageSelect)}
            >
              <Language sx={styles.language} /> {language}
            </Button>
            <Popper
              open={openLanguageSelect}
              anchorEl={anchorRef.current}
              role={undefined}
              placement="bottom-start"
              transition
              disablePortal
            >
              {({ TransitionProps, placement }) => (
                <Grow
                  // eslint-disable-next-line react/jsx-props-no-spreading
                  {...TransitionProps}
                  style={{
                    transformOrigin:
                      placement === 'bottom-start' ? 'left top' : 'left bottom',
                  }}
                >
                  <Paper>
                    <ClickAwayListener
                      onClickAway={() =>
                        setOpenLanguageSelect(!openLanguageSelect)
                      }
                    >
                      <MenuList
                        autoFocusItem={openLanguageSelect}
                        id="composition-menu"
                        aria-labelledby="composition-button"
                      >
                        {languages.map((l) => (
                          <MenuItem
                            key={l}
                            sx={[
                              styles.item,
                              language === l && styles.activeItem,
                            ]}
                            onClick={() => {
                              handleLanguageChange(l)
                            }}
                          >
                            {l.toUpperCase()}
                          </MenuItem>
                        ))}
                      </MenuList>
                    </ClickAwayListener>
                  </Paper>
                </Grow>
              )}
            </Popper>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  )
}

export default NavBar
