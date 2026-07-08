import { useEffect, useState } from "react"

let globalDark = true
const listeners = new Set<(d: boolean) => void>()

function notify() {
  listeners.forEach((l) => l(globalDark))
}

export function useTheme() {
  const [dark, setDark] = useState(globalDark)

  useEffect(() => {
    listeners.add(setDark)
    return () => { listeners.delete(setDark) }
  }, [])

  const toggle = () => {
    globalDark = !globalDark
    const root = document.documentElement
    if (globalDark) {
      root.classList.remove("light")
      localStorage.setItem("theme", "dark")
    } else {
      root.classList.add("light")
      localStorage.setItem("theme", "light")
    }
    notify()
  }

  return { dark, toggle }
}
