import { Link, useLocation } from "react-router-dom"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Home, Flag, Trophy, Users, MoreHorizontal, Settings, Map, Swords, Sun, Moon } from "lucide-react"
import { useTheme } from "@/stores/theme"

const mainTabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/races", label: "Races", icon: Flag },
  { href: "/standings", label: "Standings", icon: Trophy },
  { href: "/drivers", label: "Drivers", icon: Users },
  { href: "/more", label: "More", icon: MoreHorizontal },
]

const moreItems = [
  { href: "/constructors", label: "Teams", icon: Settings },
  { href: "/circuits", label: "Circuits", icon: Map },
  { href: "/rivalry", label: "Rivalry", icon: Swords },
]

export function BottomTabBar() {
  const location = useLocation()
  const [showMore, setShowMore] = useState(false)
  const { dark, toggle } = useTheme()

  const isActive = (href: string) => {
    if (href === "/more") return false
    if (href === "/") return location.pathname === "/"
    return location.pathname.startsWith(href)
  }

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-lg border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {mainTabs.map((tab) => (
            <button
              key={tab.href}
              onClick={() => {
                if (tab.href === "/more") {
                  setShowMore(!showMore)
                }
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-h-[44px] relative",
                "transition-colors",
                isActive(tab.href)
                  ? "text-f1-red"
                  : "text-muted-foreground hover:text-foreground"
              )}
              as-child={tab.href !== "/more" ? "true" : undefined}
            >
              {tab.href !== "/more" ? (
                <Link to={tab.href} className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full">
                  <tab.icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{tab.label}</span>
                  {isActive(tab.href) && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-f1-red rounded-full" />
                  )}
                </Link>
              ) : (
                <>
                  <tab.icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{tab.label}</span>
                </>
              )}
            </button>
          ))}
        </div>
      </nav>

      {showMore && (
        <>
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setShowMore(false)} />
          <div className="fixed bottom-16 left-4 right-4 z-50 md:hidden rounded-xl border bg-card shadow-xl p-2 animate-in slide-in-from-bottom-4">
            {moreItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setShowMore(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px]",
                  location.pathname.startsWith(item.href)
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
            <div className="border-t border-border my-1" />
            <button
              onClick={() => { toggle(); setShowMore(false) }}
              className="flex w-full items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium min-h-[44px] text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
            >
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              {dark ? "Light Mode" : "Dark Mode"}
            </button>
          </div>
        </>
      )}
    </>
  )
}
