import { createContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)

const getInitialTheme = () => {
  const savedTheme = window.localStorage.getItem('ui-theme')

  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('ui-theme', theme)
  }, [theme])

  const value = useMemo(() => ({
    theme,
    isDarkMode: theme === 'dark',
    toggleTheme: () => {
      setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
    },
  }), [theme])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export default ThemeContext
