import { Link, Outlet, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { SearchCommand } from "@/components/search-command"
import { ThemeToggle } from "@/components/theme-toggle"
import { RaceWeekendBar } from "@/components/race-weekend-bar"
import { useAuth, signOut } from "@/stores/auth"
import { motion, AnimatePresence } from "framer-motion"
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

const bottomNavLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/races", label: "Races", icon: Flag },
  { href: "/drivers", label: "Drivers", icon: Users },
  { href: "/standings", label: "Standings", icon: Trophy },
  { href: "/rivalry", label: "Rivalry", icon: Swords },
]

export function Layout() {
  const location = useLocation()
  const { user, loading } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-bg-primary pb-16 md:pb-0">
      <header className="sticky top-0 z-50 w-full border-b border-border-subtle bg-bg-primary/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-bg-primary/60">
        <div className="mx-auto flex h-16 items-center justify-between px-6 lg:px-8 max-w-[1200px]">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-1.5">
              <span className="font-heading text-xl font-bold tracking-tight text-text-primary">
                FOne
              </span>
              <span className="w-2 h-2 rounded-full bg-accent-red mt-1" />
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
                      "relative flex items-center gap-1.5 px-3.5 py-2 text-[0.75rem] font-medium uppercase tracking-[0.08em] transition-all duration-200",
                      isActive
                        ? "text-text-primary"
                        : "text-text-tertiary hover:text-text-secondary"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {link.label}
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-accent-red"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
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
                  className="text-[0.7rem] font-medium uppercase tracking-[0.08em] text-text-tertiary hover:text-text-secondary transition-colors px-2.5 py-1.5 rounded-md hover:bg-tertiary"
                >
                  Admin
                </Link>
                <button
                  onClick={() => signOut()}
                  className="text-[0.7rem] font-medium uppercase tracking-[0.08em] text-text-tertiary hover:text-text-secondary transition-colors px-2.5 py-1.5 rounded-md hover:bg-tertiary"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="hidden sm:inline-flex items-center text-[0.7rem] font-medium uppercase tracking-[0.08em] text-text-tertiary hover:text-text-secondary transition-colors px-2.5 py-1.5 rounded-md hover:bg-tertiary"
              >
                Sign In
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden inline-flex items-center justify-center rounded-md h-9 w-9 hover:bg-tertiary transition-colors"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="md:hidden border-t border-border-subtle bg-bg-primary/95 backdrop-blur-2xl"
            >
              <nav className="flex flex-col py-3 px-3 max-h-[70vh] overflow-y-auto">
                {navLinks.map((link) => {
                  const Icon = link.icon
                  const isActive = location.pathname === link.href
                  return (
                    <Link
                      key={link.href}
                      to={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-tertiary text-text-primary"
                          : "text-text-secondary hover:text-text-primary hover:bg-tertiary/50"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", isActive && "text-accent-red")} />
                      <span className="flex-1">{link.label}</span>
                      <ChevronRight className="h-4 w-4 text-text-disabled" />
                    </Link>
                  )
                })}
                <div className="border-t border-border-subtle mt-3 pt-3 space-y-1">
                  {user ? (
                    <>
                      <div className="px-3 py-2 text-xs text-text-tertiary truncate">
                        {user.email}
                      </div>
                      <Link
                        to="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-tertiary/50"
                      >
                        Admin Panel
                      </Link>
                      <button
                        onClick={() => { signOut(); setMobileMenuOpen(false) }}
                        className="w-full text-left flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-tertiary/50"
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/auth"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-tertiary/50"
                    >
                      Sign In
                    </Link>
                  )}
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <RaceWeekendBar />

      <main className="mx-auto px-6 lg:px-8 py-8 max-w-[1200px]">
        <Outlet />
      </main>

      <footer className="hidden md:block border-t border-border-subtle py-10">
        <div className="mx-auto px-6 lg:px-8 max-w-[1200px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-heading text-sm font-bold text-text-primary">FOne</span>
              <span className="w-1.5 h-1.5 rounded-full bg-accent-red" />
            </div>
            <p className="text-xs text-text-tertiary">
              Formula 1 Database & Statistics
            </p>
          </div>
        </div>
      </footer>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border-subtle bg-bg-primary/95 backdrop-blur-2xl safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {bottomNavLinks.map((link) => {
            const Icon = link.icon
            const isActive = location.pathname === link.href
            return (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-0 transition-all duration-200",
                  isActive ? "text-text-primary" : "text-text-tertiary hover:text-text-secondary"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "scale-110")} />
                <span className={cn(
                  "text-[0.5rem] font-semibold uppercase tracking-[0.05em] leading-tight truncate max-w-full",
                  isActive ? "text-text-primary" : "text-text-tertiary"
                )}>
                  {link.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-dot"
                    className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent-red"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
