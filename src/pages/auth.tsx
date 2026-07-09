import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { signIn, signUp, useAuth } from "@/stores/auth"
import { motion } from "framer-motion"
import { LogIn, UserPlus, Mail, Lock, Eye, EyeOff } from "lucide-react"

export default function AuthPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (!authLoading && user) navigate("/")
  }, [user, authLoading, navigate])

  if (authLoading || user) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: authError } =
        mode === "signin"
          ? await signIn(email, password)
          : await signUp(email, password)

      if (authError) {
        setError(authError.message)
      } else if (mode === "signin") {
        navigate("/")
      } else {
        setMode("signin")
        setError("Account created! Check your email to confirm.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] as const }}
      className="flex items-center justify-center min-h-[80vh] px-4"
    >
      <div className="w-full max-w-sm space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="text-center space-y-2"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-red/10 mb-3">
            {mode === "signin" ? (
              <LogIn className="w-8 h-8 text-accent-red" />
            ) : (
              <UserPlus className="w-8 h-8 text-accent-red" />
            )}
          </div>
          <h1 className="text-2xl font-bold font-heading uppercase tracking-wide text-text-primary">
            {mode === "signin" ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-sm text-text-secondary">
            {mode === "signin"
              ? "Sign in to access your account"
              : "Create an account to get started"}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2, ease: [0, 0, 0.2, 1] as const }}
        >
          <Card>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium flex items-center gap-2 text-text-primary">
                    <Mail className="w-4 h-4 text-text-secondary" />
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-default bg-secondary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary transition-all"
                    placeholder="you@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium flex items-center gap-2 text-text-primary">
                    <Lock className="w-4 h-4 text-text-secondary" />
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full rounded-xl border border-default bg-secondary px-3 py-2.5 pr-10 text-sm text-text-primary placeholder:text-text-tertiary transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-sm p-3 rounded-xl ${
                      error.includes("check your email")
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-red-900/30 text-red-400 border border-red-500/20"
                    }`}
                  >
                    {error}
                  </motion.p>
                )}

                <Button type="submit" className="w-full h-11 rounded-xl" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                      Loading...
                    </span>
                  ) : mode === "signin" ? (
                    <span className="flex items-center gap-2">
                      <LogIn className="w-4 h-4" />
                      Sign In
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      Create Account
                    </span>
                  )}
                </Button>

                <p className="text-center text-sm text-text-secondary">
                  {mode === "signin" ? (
                    <>
                      Don't have an account?{" "}
                      <button
                        type="button"
                        onClick={() => setMode("signup")}
                        className="text-accent-red hover:underline font-medium"
                      >
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => setMode("signin")}
                        className="text-accent-red hover:underline font-medium"
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </p>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
