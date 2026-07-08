import { Link, Outlet, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { SearchCommand } from "@/components/search-command"
import { ThemeToggle } from "@/components/theme-toggle"
import { RaceWeekendBar } from "@/components/race-weekend-bar"
import { BottomTabBar } from "@/components/bottom-tab-bar"
import { useAuth, signOut } from "@/stores/auth"

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/races", label: "Races" },
  { href: "/drivers", label: "Drivers" },
  { href: "/constructors", label: "Teams" },
  { href: "/circuits", label: "Circuits" },
  { href: "/standings", label: "Standings" },
  { href: "/rivalry", label: "Rivalry" },
]

export function Layout() {
  const location = useLocation()
  const { user, loading } = useAuth()

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 sm:h-14 items-center justify-between px-3 sm:px-4 lg:px-6 max-w-7xl">
          <div className="flex items-center gap-4 sm:gap-6">
            <Link to="/" className="flex items-center gap-2 font-heading text-lg sm:text-xl uppercase tracking-wider text-foreground">
              <span className="text-f1-red font-bold">F1</span>
              <span className="hidden sm:inline">OneGrid</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    "px-3 py-2 rounded-md transition-colors text-[13px] uppercase tracking-wider font-semibold",
                    location.pathname === link.href
                      ? "text-f1-red bg-f1-red/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <SearchCommand />
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            {loading ? null : user ? (
              <div className="hidden sm:flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {user.email}
                </span>
                <Link
                  to="/admin"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Admin
                </Link>
                <button
                  onClick={() => signOut()}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="hidden sm:inline text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>
      <RaceWeekendBar />
      <main className="mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-7xl">
        <Outlet />
      </main>
      <footer className="hidden md:block border-t py-4 text-center text-xs text-muted-foreground">
        <div className="mx-auto px-4 max-w-7xl">
          FOneGrid — Formula 1 Database & Statistics
        </div>
      </footer>
      <BottomTabBar />
    </div>
  )
}
