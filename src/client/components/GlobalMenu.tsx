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
import { OutlineButtonBlack, TextButton } from './ChatV2/general/Buttons'
import { Box, ListItem } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Locale } from '@shared/lang'
import { Link as RouterLink } from 'react-router-dom'
import useCurrentUser from '../hooks/useCurrentUser'
import { AdminPanelSettings, BarChart, Logout } from '@mui/icons-material'
import apiClient from '../util/apiClient'

export default function GlobalMenu({
  openDisclaimer,
  openSettings,
  openFeedback,
}: {
  openDisclaimer: () => void
  openSettings: () => void,
  openFeedback: () => void
}) {
  const { t, i18n } = useTranslation()
  const { user } = useCurrentUser()
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
    <div style={{ position: 'fixed', top: 30, right: 30 }}>
      <OutlineButtonBlack
        id="basic-button"
        data-testid="global-menu-button"
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
          <MenuItem
            data-testid="open-global-settings-button"
            onClick={() => {
              openSettings()
              handleClose()
            }}
          >
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('settings')}</ListItemText>

          </MenuItem>
          <MenuItem 
            data-testid="open-disclaimer-button"
            onClick={() => {
              openDisclaimer()
              handleClose()
            }}
          >
            <ListItemIcon>
              <InfoIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('about_service')}</ListItemText>

          </MenuItem>
          <MenuItem onClick={() => {
            openFeedback()
            handleClose()
          }}>
            <ListItemIcon>
              <ReviewsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('feedback:giveFeedback')}</ListItemText>

          </MenuItem>
          {user?.isStatsViewer && <MenuItem component={RouterLink} to="/statistics">
            <ListItemIcon>
              <BarChart fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('courseStats')}</ListItemText>

          </MenuItem>}

          {user?.isAdmin && <MenuItem component={RouterLink} to="/admin">
            <ListItemIcon>
              <AdminPanelSettings fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('admin')}</ListItemText>

          </MenuItem>}

          <MenuItem onClick={() => {
            handleLogout()
          }}>
            <ListItemIcon>
              <Logout fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('logout')}</ListItemText>

          </MenuItem>

          <Divider />
          <ListItem>
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
          </ListItem>
        </MenuList>
      </Menu>
    </div>
  )
}

const handleLogout = async () => {
  try {
    const res = await apiClient.get('/user/logout')
    window.location.href = res.data.url
  } catch (error) {
    console.error('Error logging out:', error)
  }
}
