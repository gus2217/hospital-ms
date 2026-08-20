import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  HeartPulse,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  UserPlus,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserRole } from '@/types'
import { useAuthStore } from '@/store/authStore'

const STAFF_ROLES = [
  { value: UserRole.Receptionist, label: 'Receptionist' },
  { value: UserRole.Nurse, label: 'Nurse' },
  { value: UserRole.Pharmacist, label: 'Pharmacist' },
  { value: UserRole.Doctor, label: 'Doctor' },
  { value: UserRole.LabTechnician, label: 'Lab Technician' },
  { value: UserRole.RecordsOfficer, label: 'Records Officer' },
  { value: UserRole.Cashier, label: 'Cashier' },
  { value: UserRole.StoreKeeper, label: 'Store Keeper' },
  { value: UserRole.Accountant, label: 'Accountant' },
  { value: UserRole.Admin, label: 'Administrator' },
]

export default function Register() {
  const navigate = useNavigate()
  const register = useAuthStore((s) => s.register)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<UserRole>(UserRole.Receptionist)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      toast.error('Please fill in all required fields.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error('Please enter a valid email address.')
      return
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long.')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    setSubmitting(true)
    // Simulate a short network round-trip.
    setTimeout(() => {
      const result = register({
        firstName,
        lastName,
        email,
        phoneNumber: phone,
        role,
        password,
      })
      setSubmitting(false)
      if (!result.ok) {
        toast.error(result.error ?? 'Registration failed.')
        return
      }
      toast.success('Account created — welcome aboard!')
      navigate('/dashboard', { replace: true })
    }, 350)
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
            Join the St. Francis team.
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-white/70">
            Register a staff account and get instant role-based access to the tools you need —
            appointments, patients, records, pharmacy and billing.
          </p>
          <ul className="space-y-2 text-sm text-white/80">
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4" /> Role-scoped navigation and permissions
            </li>
            <li className="flex items-center gap-2">
              <UserRound className="size-4" /> Personalized dashboard per role
            </li>
            <li className="flex items-center gap-2">
              <KeyRound className="size-4" /> Instant mock sign-in after registration
            </li>
          </ul>
        </div>

        <p className="relative text-xs text-white/50">
          Demo build · Accounts are stored locally in your browser only.
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
                <UserPlus className="text-primary size-5" />
                Create staff account
              </CardTitle>
              <CardDescription>
                Pick your role — the dashboard and menus adapt to it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      placeholder="Jane"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>

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
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <div className="relative">
                    <Phone className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+2547…"
                      className="pl-9"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Staff role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                    <SelectTrigger id="role" className="w-full">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {STAFF_ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <KeyRound className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Min. 6 characters"
                        autoComplete="new-password"
                        className="pl-9"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <div className="relative">
                      <KeyRound className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Repeat password"
                        autoComplete="new-password"
                        className="pl-9"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Creating account…
                    </>
                  ) : (
                    'Create account'
                  )}
                </Button>
              </form>

              <div className="mt-4 flex items-center justify-center gap-1 text-sm">
                <span className="text-muted-foreground">Already have an account?</span>
                <Button asChild variant="link" className="h-auto p-0">
                  <Link to="/login">Sign in</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
