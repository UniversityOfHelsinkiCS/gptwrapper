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
} from '@mui/material'
import { Language, AdminPanelSettingsOutlined, BookmarksOutlined, GradeOutlined } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import MenuIcon from '@mui/icons-material/Menu'

import useCurrentUser from '../../hooks/useCurrentUser'
import hyLogo from '../../assets/hy_logo.svg'
import styles from './styles'

const NavBar = () => {
  const { t, i18n } = useTranslation()
  const [openLanguageSelect, setOpenLanguageSelect] = useState(false)

  const [navPanelOpen, setNavPanelOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)

  const { language } = i18n
  const languages = ['fi', 'sv', 'en']

  const { user, isLoading } = useCurrentUser()
  // will be changed to use url to change language and moved up to app since language is global
   const handleLanguageChange = (newLanguage: string) => {
    i18n.changeLanguage(newLanguage)
    setOpenLanguageSelect(false)
  }

  if (isLoading) return null

  if (!user) return null

  const isV2 = window.location.pathname.startsWith('/v2') || window.location.pathname.startsWith('/chat/v2')

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
              <NavItems
                isV2={isV2}
                user={user}
                t={t}
                anchorRef={anchorRef}
                openLanguageSelect={openLanguageSelect}
                setOpenLanguageSelect={setOpenLanguageSelect}
                languages={languages}
                handleLanguageChange={handleLanguageChange}
                language={language}
              />
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
          <NavItems
            isV2={isV2}
            user={user}
            t={t}
            anchorRef={anchorRef}
            openLanguageSelect={openLanguageSelect}
            setOpenLanguageSelect={setOpenLanguageSelect}
            languages={languages}
            handleLanguageChange={handleLanguageChange}
            language={language}
          />
        </Stack>
      </Drawer>
    </>
  )
}

const NavItems = ({ isV2, user, t, anchorRef, openLanguageSelect, setOpenLanguageSelect, languages, handleLanguageChange, language }) => {
  return (
    <>
      {!isV2 && (
        <Link to="/v2" style={{ textDecoration: 'none' }}>
          <Button>
            <GradeOutlined sx={styles.icon} /> {t('tryNew')}
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
        id="basic-button"
        aria-controls={openLanguageSelect ? 'basic-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={openLanguageSelect ? 'true' : undefined}
        onClick={() => {setOpenLanguageSelect(true)}}
      >
        
      valitse kieli
      </Button>
      <Menu
        id="basic-menu"
        anchorEl={anchorRef.current}
        open={openLanguageSelect}
        onClose={() => {setOpenLanguageSelect(false)}}
        
        slotProps={{
          list: {
            'aria-labelledby': 'basic-button',
          },
        }}
      >

      {languages.map((l) => <MenuItem
         // sx={[styles.item, language === 1 && (styles.activeItem as any)]}
         onClick={() => {
           handleLanguageChange(l)
         }}
         key={l}>{l.toUpperCase()}</MenuItem>)}
     </Menu>
    
    </>
  )
}
export default NavBar
