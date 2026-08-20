import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { HeartPulse, KeyRound, Loader2, LockKeyhole, Mail, ShieldCheck, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { DEMO_CREDENTIALS } from '@/data/mock'
import { useAuthStore } from '@/store/authStore'

interface LocationState {
  from?: string
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAuthStore((s) => s.login)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as LocationState | null)?.from ?? '/dashboard'

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast.error('Please enter both email and password.')
      return
    }
    setSubmitting(true)
    // Simulate a short network round-trip.
    setTimeout(() => {
      const result = login(email, password)
      setSubmitting(false)
      if (!result.ok) {
        toast.error(result.error ?? 'Sign-in failed.')
        return
      }
      toast.success('Welcome back! Signed in successfully.')
      navigate(from, { replace: true })
    }, 350)
  }

  const fillDemo = (demo: (typeof DEMO_CREDENTIALS)[number]) => {
    setEmail(demo.email)
    setPassword(demo.password)
  }

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="bg-primary relative hidden w-1/2 flex-col justify-between overflow-hidden p-10 text-white lg:flex">
        <div className="absolute -top-24 -right-24 size-80 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
            <HeartPulse className="size-6" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight">HRMS</p>
            <p className="text-white/60 text-xs">St. Francis Health Services · Health Records Management System</p>
          </div>
        </div>

        <div className="relative space-y-4">
          <h1 className="max-w-md text-3xl leading-tight font-bold">
            One secure console for every hospital role.
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-white/70">
            Role-based access for administrators, doctors, pharmacists, receptionists and nurses —
            each sees exactly what their job needs.
          </p>
          <div className="flex flex-wrap gap-2">
            {['Admin', 'Doctor', 'Pharmacist', 'Receptionist', 'Nurse'].map((role) => (
              <span
                key={role}
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur"
              >
                {role}
              </span>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/50">
          Demo build · Booking → Consultation → Pharmacy → Billing
        </p>
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center bg-background px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="bg-primary flex size-10 items-center justify-center rounded-lg">
              <HeartPulse className="size-6 text-white" />
            </div>
            <div>
              <p className="font-bold tracking-tight">HRMS</p>
              <p className="text-muted-foreground text-xs">St. Francis Health Services · Health Records Management System</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <LockKeyhole className="text-primary size-5" />
                Sign in to your account
              </CardTitle>
              <CardDescription>
                Enter your staff credentials to access the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Work email</Label>
                  <div className="relative">
                    <Mail className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@medicore.health"
                      autoComplete="email"
                      className="pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <KeyRound className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="pl-9"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    'Sign in'
                  )}
                </Button>
              </form>

              <div className="mt-4 flex items-center justify-center gap-1 text-sm">
                <span className="text-muted-foreground">New staff member?</span>
                <Button asChild variant="link" className="h-auto p-0">
                  <Link to="/register">Create an account</Link>
                </Button>
              </div>

              <Separator className="my-5" />

              <div>
                <p className="text-muted-foreground mb-3 flex items-center gap-1.5 text-xs font-medium">
                  <ShieldCheck className="size-3.5" />
                  Demo accounts — tap to autofill
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {DEMO_CREDENTIALS.map((demo) => (
                    <Button
                      key={demo.email}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="justify-start text-left"
                      onClick={() => fillDemo(demo)}
                    >
                      <span className="truncate">
                        <span className="font-semibold">{demo.label}</span>
                        <span className="text-muted-foreground block truncate text-[11px]">
                          {demo.email}
                        </span>
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="text-muted-foreground mt-6 flex items-center justify-center gap-1.5 text-center text-xs">
            <UserPlus className="size-3.5" />
            Mock authentication only — no real credentials are stored.
          </p>
        </div>
      </div>
    </div>
  )
}
