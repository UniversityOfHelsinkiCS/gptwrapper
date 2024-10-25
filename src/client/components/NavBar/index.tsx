import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
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
  Link as MuiLink,
} from '@mui/material'
import {
  Language,
  AdminPanelSettingsOutlined,
  BookmarksOutlined,
} from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

import useCurrentUser from '../../hooks/useCurrentUser'
import hyLogo from '../../assets/hy_logo.svg'
import styles from './styles'

const NavBar = () => {
  const { t, i18n } = useTranslation()
  const [openLanguageSelect, setOpenLanguageSelect] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)

  const { language } = i18n
  const languages = ['fi', 'sv', 'en']

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

  if (!user) return null

  return (
    <AppBar
      elevation={0}
      position="relative"
      sx={styles.appbar}
      color="transparent"
    >
      <Container maxWidth={false}>
        <Toolbar sx={styles.toolbar} disableGutters>
          <MuiLink to="/" sx={styles.navBox} component={Link} reloadDocument>
            <img src={hyLogo} alt="University of Helsinki" width="40" />
            <Box ml="2rem">
              <Typography sx={styles.appName}>{t('appName')}</Typography>
            </Box>
          </MuiLink>
          <Box>
            {user.hasIamAccess && (
              <Button href={t('curreUrl')}>{t('curreTitle')}</Button>
            )}
            {user.enrolledCourses.length > 0 && (
              <Link to="/chats" style={{ textDecoration: 'none' }}>
                <Button>
                  <BookmarksOutlined sx={styles.icon} /> {t('chats')}
                </Button>
              </Link>
            )}
            {user.ownCourses.length > 0 && (
              <Link to="/courses" style={{ textDecoration: 'none' }}>
                <Button>
                  <BookmarksOutlined sx={styles.icon} /> {t('courses')}
                </Button>
              </Link>
            )}
            {user.isStatsViewer && (
              <Link to="/statistics" style={{ textDecoration: 'none' }}>
                <Button>
                  <AdminPanelSettingsOutlined sx={styles.icon} />{' '}
                  {t('courseStats')}
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
                              language === l && (styles.activeItem as any),
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
