import { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Tab = 'signin' | 'signup'

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState<Tab>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signupSuccess, setSignupSuccess] = useState(false)

  // Parse Supabase error params from URL hash (e.g. expired confirmation links)
  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('error=')) {
      const params = new URLSearchParams(hash.replace('#', ''))
      const desc = params.get('error_description')
      if (desc) setError(decodeURIComponent(desc.replace(/\+/g, ' ')))
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  // Already logged in — send to the app
  if (!loading && user) {
    return <Navigate to="/form" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    if (tab === 'signin') {
      const { error } = await signIn(email, password)
      if (error) {
        setError(error.message)
        setSubmitting(false)
      } else {
        navigate('/form', { replace: true })
      }
    } else {
      const { error } = await signUp(email, password, name.trim() || undefined)
      if (error) {
        setError(error.message)
        setSubmitting(false)
      } else {
        // If email confirmation is disabled, user is logged in immediately
        if (user) {
          navigate('/form', { replace: true })
        } else {
          // Email confirmation is enabled — show success message
          setSignupSuccess(true)
          setSubmitting(false)
        }
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      {/* Background decoration */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-coral/10 to-transparent blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-primary/8 to-transparent blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo / brand mark */}
        <div className="mb-8 flex flex-col items-center text-center">
          <h1 className="font-serif text-4xl text-primary tracking-tight">Tello</h1>
          <p className="mt-2 text-sm text-muted-foreground font-sans">
            Your AI interview practice partner
          </p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-medium border border-border/50 overflow-hidden">
          {/* Tab switcher */}
          <div className="flex border-b border-border/50">
            {(['signin', 'signup'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null); setSignupSuccess(false) }}
                className={[
                  'flex-1 py-4 text-sm font-sans font-medium transition-colors duration-200',
                  tab === t
                    ? 'text-primary border-b-2 border-primary bg-secondary/40'
                    : 'text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                {t === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <div className="p-8">
            {signupSuccess ? (
              <div className="text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                  <svg className="w-7 h-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="font-serif text-xl text-primary">Check your email</h2>
                <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                  We sent a confirmation link to <strong className="text-foreground">{email}</strong>.
                  Click it to activate your account, then come back to sign in.
                </p>
                <button
                  onClick={() => { setTab('signin'); setSignupSuccess(false) }}
                  className="text-sm text-coral hover:underline font-sans"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {tab === 'signup' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-sm font-sans text-foreground/80">
                      Full name
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      autoComplete="name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="font-sans"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-sans text-foreground/80">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="font-sans"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-sans text-foreground/80">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={tab === 'signup' ? 'At least 6 characters' : '••••••••'}
                    className="font-sans"
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
                    <p className="text-sm text-destructive font-sans">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-coral hover:bg-coral/90 text-white font-sans font-medium shadow-coral transition-all duration-200 active:scale-[0.98]"
                >
                  {submitting
                    ? 'Please wait…'
                    : tab === 'signin'
                    ? 'Sign in'
                    : 'Create account'}
                </Button>

                {tab === 'signin' && (
                  <p className="text-center text-sm text-muted-foreground font-sans">
                    No account?{' '}
                    <button
                      type="button"
                      onClick={() => { setTab('signup'); setError(null) }}
                      className="text-coral hover:underline"
                    >
                      Create one
                    </button>
                  </p>
                )}
              </form>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground/60 font-sans">
          By continuing you agree to our terms of service.
        </p>
      </div>
    </div>
  )
}
