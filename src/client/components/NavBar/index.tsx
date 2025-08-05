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
  Drawer,
  IconButton,
  Stack,
  Menu,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { Language, AdminPanelSettingsOutlined, BookmarksOutlined, GradeOutlined } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import MenuIcon from '@mui/icons-material/Menu'

import useCurrentUser from '../../hooks/useCurrentUser'
import hyLogo from '../../assets/hy_logo.svg'
import styles from './styles'

const NavBar = () => {
  const { t, i18n } = useTranslation()

  const [navPanelOpen, setNavPanelOpen] = useState(false)
  const theme = useTheme()
  const isDesktopDevice = useMediaQuery(theme.breakpoints.up('lg'))
  const { language } = i18n
  const languages = ['fi', 'sv', 'en']
  const { user, isLoading } = useCurrentUser()
  // will be changed to use url to change language and moved up to app since language is global
  const handleLanguageChange = (newLanguage: string) => {
    i18n.changeLanguage(newLanguage)
  }
  useEffect(() => {
    setNavPanelOpen(false)
  }, [isDesktopDevice])
  if (isLoading) return null

  if (!user) return null

  return (
    <>
      <AppBar elevation={0} position="fixed" sx={styles.appbar} color="transparent">
        <Container maxWidth={false}>
          <Toolbar sx={styles.toolbar} disableGutters>
            <MuiLink to="/" sx={styles.navBox} component={Link} reloadDocument>
              <img src={hyLogo} alt="University of Helsinki" width="24" />
              <Box ml="1rem">
                <Typography sx={styles.appName}>{t('appName')}</Typography>
              </Box>
            </MuiLink>
            <IconButton
              sx={{ display: { sx: 'block', lg: 'none' } }}
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={() => {
                setNavPanelOpen(true)
              }}
            >
              <MenuIcon />
            </IconButton>
            <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
              {isDesktopDevice && <NavItems user={user} t={t} languages={languages} handleLanguageChange={handleLanguageChange} language={language} />}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
      <Drawer
        anchor="right"
        open={navPanelOpen}
        onClose={() => {
          setNavPanelOpen(false)
        }}
      >
        <Stack sx={{ paddingTop: 4, paddingRight: 4 }}>
          {!isDesktopDevice && <NavItems user={user} t={t} languages={languages} handleLanguageChange={handleLanguageChange} language={language} />}
        </Stack>
      </Drawer>
    </>
  )
}

const NavItems = ({ user, t, languages, handleLanguageChange, language }) => {
  const anchorRef = useRef<HTMLButtonElement>(null)
  const [openLanguageSelect, setOpenLanguageSelect] = useState(false)
  return (
    <>
      {user?.preferences?.chatVersion !== 2 && (
        <Link to="/v2" style={{ textDecoration: 'none' }}>
          <Button>
            <GradeOutlined sx={styles.icon} /> {t('tryNew')}
          </Button>
        </Link>
      )}
      {user?.preferences?.chatVersion !== 1 && (
        <Link to="/v1" style={{ textDecoration: 'none' }}>
          <Button>
            <GradeOutlined sx={styles.icon} /> {t('useOld')}
          </Button>
        </Link>
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
            <AdminPanelSettingsOutlined sx={styles.icon} /> {t('courseStats')}
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
        aria-controls={openLanguageSelect ? 'composition-menu' : undefined}
        aria-expanded={openLanguageSelect ? 'true' : undefined}
        aria-haspopup="true"
        onClick={() => setOpenLanguageSelect(!openLanguageSelect)}
      >
        <Language sx={styles.language} /> {language}
      </Button>
      <Popper open={openLanguageSelect} anchorEl={anchorRef.current} role={undefined} placement="bottom-start" transition disablePortal>
        {({ TransitionProps, placement }) => (
          <Grow
            {...TransitionProps}
            style={{
              transformOrigin: placement === 'bottom-start' ? 'left top' : 'left bottom',
            }}
          >
            <Paper>
              <ClickAwayListener onClickAway={() => setOpenLanguageSelect(!openLanguageSelect)}>
                <MenuList autoFocusItem={openLanguageSelect} id="composition-menu" aria-labelledby="composition-button">
                  {languages.map((l) => (
                    <MenuItem
                      key={l}
                      sx={[styles.item, language === l && (styles.activeItem as any)]}
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
      </Popper>{' '}
    </>
  )
}
export default NavBar
