import React, { useEffect, useRef, useState } from 'react'
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
} from '@mui/material'
import { Language } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

import { PUBLIC_URL } from '../../../config'
import hyLogo from '../../assets/hy_logo.svg'
import styles from './styles'
import { User } from '../../types'

const NavBar = () => {
  const { t, i18n } = useTranslation()
  const [openLanguageSelect, setOpenLanguageSelect] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)

  const { language } = i18n
  const languages = ['fi', 'en'] // Possibly Swedish as well

  useEffect(() => {
    const login = async () => {
      const response = await fetch(`${PUBLIC_URL}/api/login`)
      const user: User = await response.json()
      
      if (user?.language && languages.includes(user.language)) {
        i18n.changeLanguage(user.language)
      }

      // No access, redirect to Curre front page
      if (!user.id) {
        window.location.replace('https://curre.helsinki.fi')
      }
    }

    login()
  }, [])

  const handleLanguageChange = (newLanguage: string) => {
    i18n.changeLanguage(newLanguage)
    setOpenLanguageSelect(false)
  }

  return (
    <AppBar elevation={0} position="relative" sx={styles.appbar}>
      <Container maxWidth={false}>
        <Toolbar sx={styles.toolbar} disableGutters>
          <Box sx={styles.navBox}>
            <Link to="/" style={{ marginBottom: -5 }}>
              <img src={hyLogo} alt="University of Helsinki" width="40" />
            </Link>
            <Box ml="2rem">
              <Typography sx={styles.appName}>{t('appName')}</Typography>
            </Box>
          </Box>
          <Box>
            {/* <Link to="/admin" style={{ textDecoration: 'none' }}>
              <Button>
                <AdminPanelSettingsOutlined sx={styles.icon} />{' '}
                {t('admin')}
              </Button>
            </Link> */}
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
