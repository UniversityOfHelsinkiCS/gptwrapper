import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import useCurrentUser from '../hooks/useCurrentUser'
import { useCallback, useEffect } from 'react'
import { LANGUAGES, LanguageSchema, type Locale } from '@shared/lang'

export const useUpdateUrlLang = () => {
  const { i18n } = useTranslation()
  const { user } = useCurrentUser()
  const [params, setParams] = useSearchParams()

  // sets the local lang state to match the newlang if the newLang is supported
  const setLang = useCallback(
    (newLang: keyof Locale) => {
      console.log('SET LANG', newLang)
      if (!LANGUAGES.includes(newLang)) {
        console.error('Invalid language', newLang)
        return
      }
      localStorage.setItem('lang', newLang)
      i18n.changeLanguage(newLang)

      //we dont want ?lang=?? to stick around since it makes it annoying to navigate so clear the param

      params.delete('lang')
      setParams(params)
    },
    [i18n, params, setParams],
  )

  useEffect(() => {
    const updatedLangFromLocal = LanguageSchema.safeParse(localStorage.getItem('lang'))
    const langParam = LanguageSchema.safeParse(params.get('lang'))

    console.log(updatedLangFromLocal, langParam)

    if (langParam.success) {
      setLang(langParam.data)
      return
    }

    if (updatedLangFromLocal.success) {
      setLang(updatedLangFromLocal.data)
      return
    }

    if (user?.language) {
      setLang(user.language)
    }
  }, [user])

  // useEffect(() => {
  //   if (i18n.language !== localStorage.getItem('lang')) {
  //     setLang(i18n.language)
  //   }
  // }, [i18n.language])

  return {}
}
