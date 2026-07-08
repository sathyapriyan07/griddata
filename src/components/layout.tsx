import { Link, Outlet, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { SearchCommand } from "@/components/search-command"
import { ThemeToggle } from "@/components/theme-toggle"
import { RaceWeekendBar } from "@/components/race-weekend-bar"
import { useAuth, signOut } from "@/stores/auth"
import {
  Home,
  Flag,
  Users,
  Building2,
  MapPin,
  Trophy,
  Swords,
  Menu,
  X,
  ChevronRight,
} from "lucide-react"
import { useState } from "react"

const navLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/races", label: "Races", icon: Flag },
  { href: "/drivers", label: "Drivers", icon: Users },
  { href: "/constructors", label: "Teams", icon: Building2 },
  { href: "/circuits", label: "Circuits", icon: MapPin },
  { href: "/standings", label: "Standings", icon: Trophy },
  { href: "/rivalry", label: "Rivalry", icon: Swords },
]

const bottomNavLinks = navLinks.slice(0, 5)

export function Layout() {
  const location = useLocation()
  const { user, loading } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 items-center justify-between px-4 max-w-7xl">
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="flex items-center gap-2 font-heading text-xl tracking-wider uppercase"
            >
              <span className="text-foreground">FOne</span>
              <span className="text-red-600">Grid</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon
                const isActive = location.pathname === link.href
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <SearchCommand />
            <ThemeToggle />
            {loading ? null : user ? (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  to="/admin"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary"
                >
                  Admin
                </Link>
                <button
                  onClick={() => signOut()}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="hidden sm:inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary"
              >
                Sign In
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden inline-flex items-center justify-center rounded-md h-9 w-9 hover:bg-secondary transition-colors"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl">
            <nav className="flex flex-col py-2 px-2 max-h-[70vh] overflow-y-auto">
              {navLinks.map((link) => {
                const Icon = link.icon
                const isActive = location.pathname === link.href
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="flex-1">{link.label}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                  </Link>
                )
              })}
              <div className="border-t border-border/50 mt-2 pt-2">
                {user ? (
                  <>
                    <div className="px-3 py-2 text-xs text-muted-foreground truncate">
                      {user.email}
                    </div>
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    >
                      Admin Panel
                    </Link>
                    <button
                      onClick={() => { signOut(); setMobileMenuOpen(false) }}
                      className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <Link
                    to="/auth"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      <RaceWeekendBar />

      <main className="mx-auto px-4 py-6 max-w-7xl">
        <Outlet />
      </main>

      <footer className="hidden md:block border-t border-border/50 py-8 text-center">
        <div className="mx-auto px-4 max-w-7xl">
          <p className="text-sm text-muted-foreground">
            FOneGrid — Formula 1 Database & Statistics
          </p>
        </div>
      </footer>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/90 backdrop-blur-xl safe-area-bottom">
        <div className="flex items-center justify-around h-14 px-2">
          {bottomNavLinks.map((link) => {
            const Icon = link.icon
            const isActive = location.pathname === link.href
            return (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all duration-200 min-w-0",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5 transition-all", isActive && "scale-110")} />
                <span className={cn(
                  "text-[10px] font-medium leading-tight truncate max-w-full",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}>
                  {link.label}
                </span>
                {isActive && <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-foreground" />}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
