import { useEffect, useRef, useState } from 'react'
import { Link, matchPath, useLocation } from 'react-router-dom'
import {
  AppBar,
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
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import Language from '@mui/icons-material/Language'
import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined'
import BookmarksOutlined from '@mui/icons-material/BookmarksOutlined'
import OpenInNew from '@mui/icons-material/OpenInNew'
import { useTranslation } from 'react-i18next'
import MenuIcon from '@mui/icons-material/Menu'

import useCurrentUser from '../../hooks/useCurrentUser'
import hyLogo from '../../assets/hy_logo.svg'
import styles from './styles'
import { LANGUAGES, Locale } from '@shared/lang'

export const EmbeddedNavBar = () => {
  const { t } = useTranslation()

  return (
    <MuiLink
      to="/"
      sx={{ display: 'flex', alignItems: 'center', color: 'inherit', textDecoration: 'none', position: 'fixed', top: 0, left: 0, p: 1, zIndex: 1000 }}
      component={Link}
      target="_blank"
    >
      <img src={hyLogo} alt="University of Helsinki" width="18" />
      <Box mx="1rem">
        <Typography sx={{ ...styles.appName, fontSize: '1.1rem' }}>{t('appName')}</Typography>
      </Box>
      <OpenInNew sx={{ fontSize: '1.1rem' }} />
    </MuiLink>
  )
}

const NavBar = () => {
  const { t, i18n } = useTranslation()

  const [navPanelOpen, setNavPanelOpen] = useState(false)
  const theme = useTheme()
  const isDesktopDevice = useMediaQuery(theme.breakpoints.up('lg'))
  const { language } = i18n
  const { user } = useCurrentUser()

  const handleLanguageChange = (newLanguage: keyof Locale) => {
    i18n.changeLanguage(newLanguage)
    localStorage.setItem('lang', newLanguage)
  }

  useEffect(() => {
    setNavPanelOpen(false)
  }, [isDesktopDevice])

  return (
    <>
      <AppBar elevation={0} position="fixed" sx={{
        height: 0, // Seems hacky, but this way the AppBar surface, which is transparent, does not block interaction of the elements "under" it. (Well nothing is actually under it because its height is 0)
        mt: '2rem', // This is then required so the appbar is correctly positioned
      }} color="transparent">
        <Container maxWidth={false} sx={{ display: 'flex', alignItems: 'center', height: '100%', justifyContent: 'space-between' }}>
          <MuiLink to="/" 
            sx={{...styles.navBox, 
              backgroundColor: 'white',
              borderRadius: 1,
              boxShadow: '0 0 15px 15px white',
              zIndex: 2,
            }} 
            component={Link}
          >
            <img src={hyLogo} alt="University of Helsinki" width="24" />
            <Box ml="1rem" >
              <Typography sx={styles.appName}>{t('appName')}</Typography>
            </Box>
          </MuiLink>
          <IconButton
            sx={{ display: { sx: 'block', lg: 'none' },
              backgroundColor: 'white',
              borderRadius: 1,
              boxShadow: '0 0 15px 15px white',
            }}
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
            {isDesktopDevice && <NavItems user={user} handleLanguageChange={handleLanguageChange} language={language} />}
          </Box>
        </Container>
      </AppBar>
      <Drawer
        anchor="right"
        open={navPanelOpen}
        onClose={() => {
          setNavPanelOpen(false)
        }}
      >
        <Stack sx={{ py: 4, px: 4 }}>
          {!isDesktopDevice && <NavItems user={user} handleLanguageChange={handleLanguageChange} language={language} vertical />}
        </Stack>
      </Drawer>
    </>
  )
}
const NavItemButton = ({ children, to, path, current, icon, vertical }) => {
  const borderSide = vertical ? 'Left' : 'Bottom'
  return (
    <Button
      component={Link}
      to={to}
      size="small"
      variant="text"
      startIcon={icon}
      sx={{
        [`border${borderSide}`]: '2px solid',
        borderRadius: 0,
        [`border${borderSide}Color`]: matchPath({ path: path }, current) ? 'primary.main' : 'transparent',
      }}
    >
      {children}
    </Button>
  )
}

const NavItems = ({ user, handleLanguageChange, language, vertical = false }) => {
  const { t } = useTranslation()
  const anchorRef = useRef<HTMLButtonElement>(null)
  const { pathname } = useLocation()
  const [openLanguageSelect, setOpenLanguageSelect] = useState(false)

  if (!user) return null

  return (
    <Box sx={{
      backgroundColor: 'white',
      borderRadius: 1,
      boxShadow: '0 0 15px 15px white',
      display: 'flex',
      flexDirection: vertical ? 'column' : 'row',
      alignItems: 'start',
      gap: 1,
    }}>
      {user.enrolledCourses.length > 0 && (
        <NavItemButton to="/chats" path="chats/*" current={pathname} icon={<BookmarksOutlined sx={styles.icon} />} vertical={vertical}>
          {t('chats')}
        </NavItemButton>
      )}
      {user.ownCourses.length > 0 && (
        <NavItemButton to="/courses" path="courses/*" current={pathname} icon={<BookmarksOutlined sx={styles.icon} />} vertical={vertical}>
          {t('courses')}
        </NavItemButton>
      )}
      {user.isStatsViewer && (
        <NavItemButton to="/statistics" path="statistics/*" current={pathname} icon={<AdminPanelSettingsOutlined sx={styles.icon} />} vertical={vertical}>
          {t('courseStats')}
        </NavItemButton>
      )}
      {user.isAdmin && (
        <NavItemButton to="/admin" path="admin/*" current={pathname} icon={<AdminPanelSettingsOutlined sx={styles.icon} />} vertical={vertical}>
          {t('admin')}
        </NavItemButton>
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
                  {LANGUAGES.map((l) => (
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
    </Box>
  )
}
export default NavBar
