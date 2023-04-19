import React, { useRef, useState } from 'react'
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
  Link,
} from '@mui/material'
import { Language, AdminPanelSettingsOutlined } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

import { PUBLIC_URL } from '../../../config'
import hyLogo from '../../assets/hy_logo.svg'
import styles from './styles'

const NavBar = () => {
  const { t, i18n } = useTranslation()
  const [openLanguageSelect, setOpenLanguageSelect] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)

  // const { user, isLoading } = useLoggedInUser()

  /* useEffect(() => {
    if (user?.language) {
      i18n.changeLanguage(user.language)
    }
  }, [user, i18n]) */

  const { language } = i18n
  const languages = ['fi', 'en'] // Possibly Swedish as well

  const handleLanguageChange = (newLanguage: string) => {
    i18n.changeLanguage(newLanguage)
    setOpenLanguageSelect(false)
  }

  // if (isLoading) return null

  return (
    <AppBar elevation={0} position="relative" sx={styles.appbar}>
      <Container maxWidth={false}>
        <Toolbar sx={styles.toolbar} disableGutters>
          <Box sx={styles.navBox}>
            <Link href={`${PUBLIC_URL}/`} style={{ marginBottom: -5 }}>
              <img src={hyLogo} alt="University of Helsinki" width="40" />
            </Link>
            <Box ml="2rem">
              <Typography sx={styles.appName}>{t('appName')}</Typography>
            </Box>
          </Box>
          <Box>
            <Link href={`${PUBLIC_URL}/admin`} style={{ textDecoration: 'none' }}>
              <Button>
                <AdminPanelSettingsOutlined sx={styles.icon} />{' '}
                {t('admin')}
              </Button>
            </Link>
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
