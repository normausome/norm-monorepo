import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

const STORAGE_KEY = "theme"
const mq = () => window.matchMedia("(prefers-color-scheme: dark)")

type Theme = "light" | "dark"

function storedTheme(): Theme | null {
  try {
    const t = localStorage.getItem(STORAGE_KEY)
    return t === "light" || t === "dark" ? t : null
  } catch {
    return null
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark")
}

/**
 * Light/dark switch. With no stored choice the page follows the OS setting
 * (and keeps following it live); a click pins an explicit theme in localStorage.
 * index.html applies the same rule before first paint, so this only keeps
 * React state and the <html> class in sync afterwards.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() =>
    storedTheme() ?? (mq().matches ? "dark" : "light"),
  )

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    const m = mq()
    const onChange = () => {
      if (!storedTheme()) setTheme(m.matches ? "dark" : "light")
    }
    m.addEventListener("change", onChange)
    return () => m.removeEventListener("change", onChange)
  }, [])

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark"
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Private mode / blocked storage: still switch for this session.
    }
    setTheme(next)
  }

  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
  return (
    <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label={label} title={label}>
      {theme === "dark" ? <Sun /> : <Moon />}
    </Button>
  )
}
