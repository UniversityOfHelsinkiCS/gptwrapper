import { useTranslation } from 'react-i18next'
import { useLocation, useSearchParams } from 'react-router-dom'
import useCurrentUser from '../hooks/useCurrentUser'
import { useState, useEffect } from 'react'

export const useUpdateUrlLang = () => {
  const languages = ['fi', 'sv', 'en']
  const { i18n } = useTranslation()
  const { user } = useCurrentUser()
  const [lang, setLanguageState] = useState(localStorage.getItem('lang'))
  const [params, setParams] = useSearchParams()
  const langParam = params.get('lang')

  useEffect(() => {
    const updatedLangFromLocal = localStorage.getItem('lang')

    //use users language as a default if there is no lang url
    if (!langParam && !updatedLangFromLocal && user && user.language && languages.includes(user.language)) {
      setLang(user.language)
    }
    // If there is a lang url, then update the lang state to match it
    else if (langParam) {
      setLang(langParam)
    } else if (!langParam && updatedLangFromLocal) {
      //there is a case where if there are two redirects after another even the useState gets wiped
      // so lets use the local storage (example: see how admin page)
      setLang(updatedLangFromLocal)
    }
  }, [])

  useEffect(() => {
    if (i18n.language !== localStorage.getItem('lang')) {
      setLang(i18n.language)
    }
  }, [i18n.language])

  // sets both the url and the local lang state to match the newlang if the newLang is supported
  const setLang = (newLang: string) => {
    if (!languages.includes(newLang)) {
      console.log('aborted lang update')
      return
    }
    localStorage.setItem('lang', newLang)
    setLanguageState(newLang)
    i18n.changeLanguage(newLang)
    setParams({ lang: newLang })
  }
  return {}
}
