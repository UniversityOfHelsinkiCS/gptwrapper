import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { SnackbarProvider } from 'notistack'
import { initShibbolethPinger } from 'unfuck-spa-shibboleth-session'
import { ThemeProvider } from '@mui/material/styles'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { fi } from 'date-fns/locale'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3'
import { Box, Button, CssBaseline, Snackbar } from '@mui/material'
import { AppContext } from './contexts/AppContext'

import { PUBLIC_URL } from '../config'
import type { User } from './types'
import useTheme from './theme'
import NavBar from './components/NavBar'
import Footer from './components/Footer'
import useCurrentUser from './hooks/useCurrentUser'
import { EmbeddedProvider, useIsEmbedded } from './contexts/EmbeddedContext'
import { Feedback } from './components/Feedback'
import { AnalyticsProvider } from './stores/analytics'
import { useTranslation } from 'react-i18next'

function useQuery() {
  return new URLSearchParams(useLocation().search);
}
const hasAccess = (user: User | null | undefined, courseId?: string) => {
  if (!user) return false
  if (user.isAdmin) return true
  if (courseId && !user.activeCourseIds.includes(courseId)) return false

  if (!courseId && window.location.pathname.endsWith('/chats')) return true
  if (!courseId && !user.hasIamAccess) return false

  return true
}

const getRedirect = (user: User | null | undefined) => {
  if (!user) return '/noaccess'
  if (user.hasIamAccess) return '/'
  if (user.activeCourseIds.length > 0) return '/chats'

  return '/noaccess'
}

const AdminLoggedInAsBanner = () => {
  const [open, setOpen] = React.useState(false)
  const [user, setUser] = React.useState<User | null>(null)

  useEffect(() => {
    const adminLoggedInAs = localStorage.getItem('adminLoggedInAs')
    if (adminLoggedInAs) {
      setOpen(true)
      setUser(JSON.parse(localStorage.getItem('adminLoggedInAsUser') || 'null'))
    }
  }, [])

  const handleClick = () => {
    setOpen(false)
    localStorage.removeItem('adminLoggedInAs')
    localStorage.removeItem('adminLoggedInAsUser')
    window.location.reload()
  }

  return (
    <Snackbar
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      open={open}
      message={`You are currently logged in as ${user?.studentNumber} ${user?.lastName} ${user?.firstNames}`}
      action={
        <Button color="secondary" onClick={handleClick}>
          Return to yourself
        </Button>
      }
    />
  )
}
const LanguageContext = createContext({});

export function LanguageProvider({ children }) {
  const location = useLocation();
  const query = useQuery()
  const navigate = useNavigate();
  const languages = ['fi', 'sv', 'en']
  const { t, i18n } = useTranslation()
  const { user, isLoading } = useCurrentUser()

  const [lang, setLanguageState] = useState(localStorage.getItem('lang'))
  const langParam = query.get('lang')
  console.log('language is: ' + lang)
 useEffect(() => {
    const updatedLangFromLocal = localStorage.getItem('lang')

    //use users language as a default if there is no lang url
    if (!langParam && !updatedLangFromLocal && user && user.language && languages.includes(user.language)) {
      console.log("using default users language")
      setLang(user.language)
    }
    // If there is a lang url, then update the lang state to match it
    else if (langParam) {
      console.log("lang parameter based update")
      setLang(langParam)
    }
    else if(!langParam && updatedLangFromLocal )
    {
      console.log("using local storage language")
    //there is a case where if there are two redirects after another even the useState gets wiped
    // so lets use the local storage (example: see how admin page)
      setLang(updatedLangFromLocal)
    }
  }, [location.pathname])
   

  // sets both the url and the local lang state to match the newlang if the newLang is supported
  const setLang= (newLang) => {
    if(!languages.includes(newLang)){
      console.log("aborted lang update")
     return
    }
    localStorage.setItem('lang', newLang)
    setLanguageState(newLang)
    i18n.changeLanguage(newLang)
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('lang', newLang);
    navigate(`${location.pathname}?${searchParams.toString()}`, { replace: true });
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
const App = () => {
  const theme = useTheme()
  const { courseId } = useParams()
  const location = useLocation()
  const query = useQuery()
  const langParam = query.get('lang')
  const { user, isLoading } = useCurrentUser()
  
  useEffect(() => {
    initShibbolethPinger()
  }, [])
   const onNoAccessPage = location.pathname.includes('/noaccess')

  if (isLoading && !onNoAccessPage) return null

  if (!onNoAccessPage && !hasAccess(user, courseId)) {
    window.location.href = PUBLIC_URL + getRedirect(user)
    return null
  }

  if (!user && !onNoAccessPage) return null

  return (
    <LanguageProvider>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fi}>
        <SnackbarProvider preventDuplicate autoHideDuration={15_000}>
          <EmbeddedProvider>
            <AnalyticsProvider>
              <Layout />
            </AnalyticsProvider>
          </EmbeddedProvider>
        </SnackbarProvider>
      </LocalizationProvider>
    </ThemeProvider>
  </LanguageProvider>
  )
}

const Layout = () => {
  const appRef = useRef<HTMLDivElement>(null)
  const isEmbedded = useIsEmbedded()

  return (
    <AppContext.Provider value={appRef}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          height: '100vh',
          overflowY: 'auto', // deleting this will break the auto scroll on chats
        }}
        ref={appRef}
      >
        {!isEmbedded && <NavBar />}
        <Box sx={{ flex: 1 }}>
          <Outlet />
        </Box>
        {!isEmbedded && <Footer />}
        <Feedback />
      </Box>
      <AdminLoggedInAsBanner />
    </AppContext.Provider>
  )
}

export default App
