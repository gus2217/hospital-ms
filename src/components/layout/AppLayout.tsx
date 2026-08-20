import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Activity,
  CalendarDays,
  CircleUserRound,
  ClipboardList,
  ClipboardPlus,
  CreditCard,
  FileBarChart2,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Pill,
  RotateCcw,
  ScrollText,
  Stethoscope,
  Users,
  HeartPulse,
  Bell,
  BedDouble,
  UserCog,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { useHospitalStore } from '@/store/hospitalStore'
import { useAuthStore } from '@/store/authStore'
import { hasPermission } from '@/lib/permissions'
import { ROLE_LABELS } from '@/lib/roles'
import { Permission } from '@/types'
import { initials } from '@/lib/format'
import { toast } from 'sonner'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  permission: Permission
}

interface NavSection {
  section: string
  items: NavItem[]
}

const navigation: NavSection[] = [
  {
    section: 'Overview',
    items: [
      {
        to: '/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        permission: Permission.VIEW_DASHBOARD,
      },
    ],
  },
  {
    section: 'Clinical',
    items: [
      {
        to: '/appointments',
        label: 'Appointments',
        icon: CalendarDays,
        permission: Permission.VIEW_APPOINTMENTS,
      },
      {
        to: '/patients',
        label: 'Patients',
        icon: Users,
        permission: Permission.VIEW_PATIENTS,
      },
      {
        to: '/doctors',
        label: 'Doctors',
        icon: Stethoscope,
        permission: Permission.VIEW_DOCTORS,
      },
      {
        to: '/records',
        label: 'Medical Records',
        icon: ClipboardList,
        permission: Permission.VIEW_MEDICAL_RECORDS,
      },
      {
        to: '/consultation',
        label: 'Consultation',
        icon: ClipboardPlus,
        permission: Permission.VIEW_CONSULTATION,
      },
    ],
  },
  {
    section: 'Operations',
    items: [
      {
        to: '/pharmacy',
        label: 'Pharmacy',
        icon: Pill,
        permission: Permission.VIEW_PHARMACY,
      },
      {
        to: '/pharmacy-tracking',
        label: 'Pharmacy Tracking',
        icon: FileBarChart2,
        permission: Permission.VIEW_DRUG_TRACKING,
      },
      {
        to: '/lab',
        label: 'Laboratory',
        icon: FlaskConical,
        permission: Permission.VIEW_LAB,
      },
      {
        to: '/wards',
        label: 'Wards & Admissions',
        icon: BedDouble,
        permission: Permission.VIEW_WARDS,
      },
      {
        to: '/billing',
        label: 'Billing',
        icon: CreditCard,
        permission: Permission.VIEW_BILLING,
      },
    ],
  },
  {
    section: 'Administration',
    items: [
      {
        to: '/staff',
        label: 'Staff Management',
        icon: UserCog,
        permission: Permission.VIEW_STAFF,
      },
      {
        to: '/reports',
        label: 'Reports & Analytics',
        icon: FileBarChart2,
        permission: Permission.VIEW_REPORTS,
      },
      {
        to: '/audit-logs',
        label: 'Audit Logs',
        icon: ScrollText,
        permission: Permission.VIEW_AUDIT_LOGS,
      },
    ],
  },
  {
    section: 'Portal',
    items: [
      {
        to: '/portal',
        label: 'Patient Portal',
        icon: UserRound,
        permission: Permission.PATIENT_SELF_SERVICE,
      },
    ],
  },
]

function Sidebar() {
  const currentUser = useAuthStore((s) => s.currentUser)
  const lowStockCount = useHospitalStore((s) =>
    s.drugs.filter((d) => d.stockQuantity <= d.reorderPoint).length,
  )

  const visibleSections = currentUser
    ? navigation
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => hasPermission(currentUser.role, item.permission)),
        }))
        .filter((section) => section.items.length > 0)
    : []

  return (
    <aside className="bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-40 hidden w-64 flex-col lg:flex">
      <div className="flex h-16 items-center gap-3 px-6">
        <div className="bg-primary flex size-9 items-center justify-center rounded-lg shadow-md">
          <HeartPulse className="size-5 text-white" />
        </div>
        <div>
          <p className="text-sm leading-tight font-bold tracking-tight">MediCore HMS</p>
          <p className="text-sidebar-foreground/50 text-[11px]">Hospital Management System</p>
        </div>
      </div>

      <Separator className="bg-sidebar-border/60" />

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {visibleSections.map(({ section, items }) => (
          <div key={section}>
            <p className="text-sidebar-foreground/40 px-3 pb-1.5 text-[10px] font-semibold tracking-widest uppercase">
              {section}
            </p>
            <div className="space-y-1">
              {items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive && 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm',
                    )
                  }
                >
                  <Icon className="size-[18px] shrink-0" />
                  <span className="flex-1">{label}</span>
                  {label === 'Pharmacy' && lowStockCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="rounded-full px-1.5 py-0 text-[10px] font-bold"
                    >
                      {lowStockCount}
                    </Badge>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border/60 p-4">
        <div className="bg-sidebar-accent/60 flex items-center gap-3 rounded-lg p-3">
          <Activity className="size-4 text-emerald-400" />
          <div className="text-[11px] leading-tight">
            <p className="font-semibold text-emerald-400">All systems operational</p>
            <p className="text-sidebar-foreground/50">Backend sync: mock mode</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

function Topbar() {
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.currentUser)
  const resetDemo = useHospitalStore((s) => s.resetDemo)
  const logout = useAuthStore((s) => s.logout)

  const today = new Date().toLocaleDateString('en-KE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const handleSignOut = () => {
    logout()
    toast.success('Signed out. See you soon!')
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-6 backdrop-blur">
      <div className="lg:hidden">
        <NavLink to="/dashboard" className="text-primary flex items-center gap-2 font-bold">
          <HeartPulse className="size-5" />
          <span>MediCore</span>
        </NavLink>
      </div>
      <p className="text-muted-foreground hidden text-sm sm:block">{today}</p>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-[18px]" />
          <span className="bg-destructive absolute top-2 right-2.5 size-1.5 rounded-full" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex cursor-pointer items-center gap-3 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-accent">
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {currentUser ? initials(currentUser.firstName, currentUser.lastName) : '—'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left sm:block">
                <p className="text-sm leading-tight font-semibold">
                  {currentUser
                    ? `${currentUser.firstName} ${currentUser.lastName}`
                    : 'Not signed in'}
                </p>
                <p className="text-muted-foreground text-[11px] leading-tight">
                  {currentUser ? ROLE_LABELS[currentUser.role] : '—'}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex items-center gap-2">
                <CircleUserRound className="size-4" />
                {currentUser?.email ?? '—'}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                resetDemo()
                toast.success('Demo data has been reset to its initial state.')
              }}
            >
              <RotateCcw />
              Reset demo data
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

export function AppLayout() {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="flex min-h-screen flex-col lg:pl-64">
        <Topbar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
        <footer className="text-muted-foreground border-t px-6 py-4 text-center text-xs">
          MediCore HMS · Booking → Consultation → Pharmacy → Billing · Demo build with mock data
        </footer>
      </div>
    </div>
  )
}
