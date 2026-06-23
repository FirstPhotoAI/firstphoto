import { createContext, useContext, useState } from 'react'

const LangContext = createContext({ lang: 'es', setLang: () => {} })

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem('fp_lang') ?? 'es' } catch { return 'es' }
  })

  function setLang(code) {
    try { localStorage.setItem('fp_lang', code) } catch {}
    setLangState(code)
  }

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
