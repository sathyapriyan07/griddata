import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

export function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return true
    const stored = localStorage.getItem("theme")
    if (stored === "light") return false
    if (stored === "dark") return true
    return true
  })

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.remove("light")
      localStorage.setItem("theme", "dark")
    } else {
      root.classList.add("light")
      localStorage.setItem("theme", "light")
    }
  }, [dark])

  return (
    <button
      onClick={() => setDark(!dark)}
      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 w-9 min-w-[44px] min-h-[44px]"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
