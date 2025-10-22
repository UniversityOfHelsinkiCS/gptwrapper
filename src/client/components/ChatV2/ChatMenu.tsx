import * as React from 'react'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import MenuList from '@mui/material/MenuList'
import ListItemText from '@mui/material/ListItemText'
import ListItemIcon from '@mui/material/ListItemIcon'
import SettingsIcon from '@mui/icons-material/Settings'
import MenuIcon from '@mui/icons-material/Menu'
import InfoIcon from '@mui/icons-material/Info'
import ReviewsIcon from '@mui/icons-material/Reviews'
import LanguageIcon from '@mui/icons-material/Language'
import { OutlineButtonBlack, TextButton } from './general/Buttons'
import { Box } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Locale } from '@shared/lang'

export default function ChatMenu({ newSideBar }: { newSideBar: boolean }) {
  const { t, i18n } = useTranslation()
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }
  const handleClose = () => {
    setAnchorEl(null)
  }
  const handleLanguageChange = (newLanguage: keyof Locale) => {
    i18n.changeLanguage(newLanguage)
    localStorage.setItem('lang', newLanguage)
  }

  return (
    <>
      {newSideBar && (
        <div style={{ position: 'fixed', top: 64, right: 30 }}>
          <OutlineButtonBlack
            id="basic-button"
            aria-controls={open ? 'basic-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}

            onClick={handleClick}
          >
            <MenuIcon sx={{ color: 'text.primary' }} />
          </OutlineButtonBlack>
          <Menu
            id="basic-menu"
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            slotProps={{
              list: {
                'aria-labelledby': 'basic-button',
              },
              paper: {
                sx: {
                  boxShadow: '2px 2px 12px rgba(0,0,0,0.1)',
                  border: '1px solid rgba(0,0,0,0.2)',
                  borderRadius: '1.25rem',
                }, elevation: 1
              },
            }}
          >
            <MenuList>
              <MenuItem>
                <ListItemIcon>
                  <SettingsIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Asetukset</ListItemText>

              </MenuItem>
              <MenuItem>
                <ListItemIcon>
                  <InfoIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Tietoja palvelusta</ListItemText>

              </MenuItem>
              <MenuItem>
                <ListItemIcon>
                  <ReviewsIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Anna palautetta</ListItemText>

              </MenuItem>
              <Divider />
              <MenuItem
                disableRipple
                sx={{
                  '&:hover': {
                    backgroundColor: 'transparent',
                  },
                }}
              >
                <ListItemIcon>
                  <LanguageIcon fontSize="small" />
                </ListItemIcon>
                <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
                  <TextButton onClick={() => handleLanguageChange("fi")}>Fi</TextButton>
                  <Divider orientation="vertical" flexItem />
                  <TextButton onClick={() => handleLanguageChange("en")}>En</TextButton>
                  <Divider orientation="vertical" flexItem />
                  <TextButton onClick={() => handleLanguageChange("sv")}>Sv</TextButton>
                </Box>
              </MenuItem>
            </MenuList>
          </Menu>
        </div>
      )}
    </>
  )
}
