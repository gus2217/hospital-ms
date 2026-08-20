import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardPlus,
  FileText,
  FlaskConical,
  Pill,
  Receipt,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader, StatusBadge } from '@/components/PageHeader'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useHospitalStore } from '@/store/hospitalStore'
import { useAuthStore } from '@/store/authStore'
import { appointmentStatusStyle } from '@/lib/status'
import {
  AppointmentStatus,
  InvoiceStatus,
  PrescriptionStatus,
  UserRole,
} from '@/types'
import {
  fullName,
  isToday,
  lowStockDrugs,
  openInvoices,
  orderedPrescriptions,
  upcomingAppointments,
  useEntityMaps,
} from '@/lib/useEntities'
import { formatCurrency, formatDateTime, formatTime } from '@/lib/format'

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.Admin]: 'Administrator',
  [UserRole.Doctor]: 'Doctor',
  [UserRole.Pharmacist]: 'Pharmacist',
  [UserRole.Receptionist]: 'Receptionist',
  [UserRole.Nurse]: 'Nurse',
  [UserRole.Patient]: 'Patient',
}

const STATUS_COLORS: Record<string, string> = {
  Pending: '#f59e0b',
  Confirmed: '#0ea5e9',
  InProgress: '#8b5cf6',
  Completed: '#10b981',
  Cancelled: '#94a3b8',
  NoShow: '#ef4444',
}

const PRESCRIPTION_COLORS: Record<string, string> = {
  Ordered: '#f59e0b',
  Dispensed: '#10b981',
  Cancelled: '#94a3b8',
}

interface Kpi {
  label: string
  value: string
  sub: string
  icon: LucideIcon
  accent: string
}

const ROLE_QUICK_ACTIONS: Record<UserRole, { label: string; to: string; icon: LucideIcon }[]> = {
  [UserRole.Admin]: [{ label: 'New appointment', to: '/appointments', icon: ClipboardPlus }],
  [UserRole.Doctor]: [{ label: 'Start consultation', to: '/appointments', icon: ClipboardPlus }],
  [UserRole.Pharmacist]: [{ label: 'Dispense prescriptions', to: '/pharmacy', icon: Pill }],
  [UserRole.Receptionist]: [{ label: 'Register patient', to: '/patients', icon: UserPlus }],
  [UserRole.Nurse]: [{ label: "Today's schedule", to: '/appointments', icon: CalendarDays }],
  [UserRole.Patient]: [],
}

export default function Dashboard() {
  const currentUser = useAuthStore((s) => s.currentUser)
  const role = currentUser?.role ?? UserRole.Admin

  const appointments = useHospitalStore((s) => s.appointments)
  const payments = useHospitalStore((s) => s.payments)
  const drugs = useHospitalStore((s) => s.drugs)
  const prescriptions = useHospitalStore((s) => s.prescriptions)
  const patients = useHospitalStore((s) => s.patients)
  const medicalRecords = useHospitalStore((s) => s.medicalRecords)
  const invoices = useHospitalStore((s) => s.invoices)

  const { patientById, doctorById, recordById, invoiceById } = useEntityMaps()

  const stats = useMemo(() => {
    const todayAppts = appointments.filter((a) => isToday(a.scheduledStart))
    const myAppts = currentUser
      ? appointments.filter((a) => a.doctorId === currentUser.id)
      : []
    const myPatients = new Set(myAppts.map((a) => a.patientId)).size
    const myCompleted = myAppts.filter((a) => a.status === AppointmentStatus.Completed).length
    const myRecords = currentUser
      ? medicalRecords.filter((r) => r.doctorId === currentUser.id)
      : []

    return {
      todayCount: todayAppts.length,
      inProgress: todayAppts.filter((a) => a.status === AppointmentStatus.InProgress).length,
      completedToday: todayAppts.filter((a) => a.status === AppointmentStatus.Completed).length,
      collected: payments.reduce((sum, p) => sum + p.amount, 0),
      pendingRx: orderedPrescriptions(prescriptions).length,
      patientCount: patients.length,
      drugCount: drugs.length,
      lowStockCount: lowStockDrugs(drugs).length,
      dispensed: prescriptions.filter((p) => p.status === PrescriptionStatus.Dispensed).length,
      openInvoices: openInvoices(invoices).length,
      overdueInvoices: invoices.filter((i) => i.status === InvoiceStatus.Overdue).length,
      upcomingCount: upcomingAppointments(appointments).length,
      myPatients,
      myCompleted,
      myRecords,
    }
  }, [appointments, payments, prescriptions, patients, drugs, medicalRecords, invoices, currentUser])

  const kpis = useMemo((): Kpi[] => {
    const s = stats
    switch (role) {
      case UserRole.Doctor:
        return [
          {
            label: "Today's Appointments",
            value: String(s.todayCount),
            sub: `${s.inProgress} in progress now`,
            icon: CalendarDays,
            accent: 'text-sky-600 bg-sky-50',
          },
          {
            label: 'My Patients',
            value: String(s.myPatients),
            sub: 'Assigned to your care',
            icon: Users,
            accent: 'text-violet-600 bg-violet-50',
          },
          {
            label: 'Completed Consultations',
            value: String(s.myCompleted),
            sub: 'Across your schedule',
            icon: ClipboardCheck,
            accent: 'text-emerald-600 bg-emerald-50',
          },
          {
            label: 'Upcoming Appointments',
            value: String(s.upcomingCount),
            sub: 'In the next few days',
            icon: CalendarDays,
            accent: 'text-teal-600 bg-teal-50',
          },
        ]
      case UserRole.Pharmacist:
        return [
          {
            label: 'Pending Prescriptions',
            value: String(s.pendingRx),
            sub: 'Awaiting dispensing',
            icon: Pill,
            accent: 'text-amber-600 bg-amber-50',
          },
          {
            label: 'Low Stock Items',
            value: String(s.lowStockCount),
            sub: 'At or below reorder level',
            icon: AlertTriangle,
            accent: 'text-rose-600 bg-rose-50',
          },
          {
            label: 'Drugs in Inventory',
            value: String(s.drugCount),
            sub: 'Across the formulary',
            icon: FlaskConical,
            accent: 'text-teal-600 bg-teal-50',
          },
          {
            label: 'Dispensed Prescriptions',
            value: String(s.dispensed),
            sub: 'All time (mock data)',
            icon: ClipboardCheck,
            accent: 'text-emerald-600 bg-emerald-50',
          },
        ]
      case UserRole.Receptionist:
        return [
          {
            label: "Today's Appointments",
            value: String(s.todayCount),
            sub: `${s.inProgress} in progress now`,
            icon: CalendarDays,
            accent: 'text-sky-600 bg-sky-50',
          },
          {
            label: 'Registered Patients',
            value: String(s.patientCount),
            sub: 'Across all departments',
            icon: Users,
            accent: 'text-violet-600 bg-violet-50',
          },
          {
            label: 'Open Invoices',
            value: String(s.openInvoices),
            sub: 'Awaiting payment',
            icon: Receipt,
            accent: 'text-amber-600 bg-amber-50',
          },
          {
            label: 'Overdue Invoices',
            value: String(s.overdueInvoices),
            sub: 'Past their due date',
            icon: AlertTriangle,
            accent: 'text-rose-600 bg-rose-50',
          },
        ]
      case UserRole.Nurse:
        return [
          {
            label: "Today's Appointments",
            value: String(s.todayCount),
            sub: 'On the schedule',
            icon: CalendarDays,
            accent: 'text-sky-600 bg-sky-50',
          },
          {
            label: 'In Progress Now',
            value: String(s.inProgress),
            sub: 'Currently with a doctor',
            icon: Activity,
            accent: 'text-amber-600 bg-amber-50',
          },
          {
            label: 'Registered Patients',
            value: String(s.patientCount),
            sub: 'Across all departments',
            icon: Users,
            accent: 'text-violet-600 bg-violet-50',
          },
          {
            label: 'Completed Today',
            value: String(s.completedToday),
            sub: 'Appointments finished',
            icon: ClipboardCheck,
            accent: 'text-emerald-600 bg-emerald-50',
          },
        ]
      default:
        return [
          {
            label: "Today's Appointments",
            value: String(s.todayCount),
            sub: `${s.inProgress} in progress now`,
            icon: CalendarDays,
            accent: 'text-sky-600 bg-sky-50',
          },
          {
            label: 'Registered Patients',
            value: String(s.patientCount),
            sub: 'Across all departments',
            icon: Users,
            accent: 'text-violet-600 bg-violet-50',
          },
          {
            label: 'Revenue Collected',
            value: formatCurrency(s.collected),
            sub: 'All time (mock data)',
            icon: CircleDollarSign,
            accent: 'text-emerald-600 bg-emerald-50',
          },
          {
            label: 'Pending Prescriptions',
            value: String(s.pendingRx),
            sub: 'Awaiting pharmacy dispensing',
            icon: Pill,
            accent: 'text-amber-600 bg-amber-50',
          },
        ]
    }
  }, [role, stats])

  const revenueByDay = useMemo(() => {
    const days: { label: string; revenue: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toDateString()
      const total = payments
        .filter((p) => new Date(p.paymentDate).toDateString() === key)
        .reduce((sum, p) => sum + p.amount, 0)
      days.push({
        label: d.toLocaleDateString('en-KE', { weekday: 'short' }),
        revenue: total,
      })
    }
    return days
  }, [payments])

  const statusDistribution = useMemo(() => {
    const counts = new Map<string, number>()
    for (const a of appointments) counts.set(a.status, (counts.get(a.status) ?? 0) + 1)
    return Object.values(AppointmentStatus)
      .map((status) => ({ name: status, value: counts.get(status) ?? 0 }))
      .filter((d) => d.value > 0)
  }, [appointments])

  const prescriptionDistribution = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of prescriptions) counts.set(p.status, (counts.get(p.status) ?? 0) + 1)
    return Object.values(PrescriptionStatus)
      .map((status) => ({ name: status, value: counts.get(status) ?? 0 }))
      .filter((d) => d.value > 0)
  }, [prescriptions])

  const todayAppointments = useMemo(
    () =>
      appointments
        .filter((a) => isToday(a.scheduledStart))
        .sort(
          (a, b) =>
            new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime(),
        )
        .slice(0, 6),
    [appointments],
  )

  const lowStock = useMemo(() => lowStockDrugs(drugs).slice(0, 4), [drugs])
  const upcoming = useMemo(() => upcomingAppointments(appointments).slice(0, 5), [appointments])
  const pendingRx = useMemo(() => orderedPrescriptions(prescriptions).slice(0, 5), [prescriptions])
  const recentlyDispensed = useMemo(
    () =>
      prescriptions
        .filter((p) => p.status === PrescriptionStatus.Dispensed && p.dispensedAt)
        .sort(
          (a, b) =>
            new Date(b.dispensedAt ?? 0).getTime() - new Date(a.dispensedAt ?? 0).getTime(),
        )
        .slice(0, 5),
    [prescriptions],
  )

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const displayName = currentUser
    ? role === UserRole.Doctor
      ? `Dr. ${currentUser.lastName}`
      : `${currentUser.firstName} ${currentUser.lastName}`
    : 'Guest'

  const showFinanceCharts = role === UserRole.Admin || role === UserRole.Receptionist
  const showPrescriptionCharts = role === UserRole.Pharmacist

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting}, ${displayName}`}
        description={`Signed in as ${ROLE_LABELS[role]} · role-based view`}
      >
        <Badge variant="outline" className="px-3 py-1">
          {ROLE_LABELS[role]}
        </Badge>
        {ROLE_QUICK_ACTIONS[role].map((action) => (
          <Button key={action.label} asChild>
            <Link to={action.to}>
              <action.icon />
              {action.label}
            </Link>
          </Button>
        ))}
      </PageHeader>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="gap-3 py-5">
            <CardContent className="flex items-start justify-between px-5">
              <div>
                <p className="text-muted-foreground text-sm">{kpi.label}</p>
                <p className="mt-2 text-2xl font-bold tracking-tight">{kpi.value}</p>
                <p className="text-muted-foreground mt-1 text-xs">{kpi.sub}</p>
              </div>
              <div className={`rounded-xl p-2.5 ${kpi.accent}`}>
                <kpi.icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {showFinanceCharts ? (
          <>
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Revenue — last 7 days</CardTitle>
                <CardDescription>Payments collected per day</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={revenueByDay} margin={{ left: -12, right: 8, top: 4 }}>
                    <defs>
                      <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0d9488" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `${v / 1000}k`} />
                    <Tooltip
                      formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#0d9488"
                      strokeWidth={2.5}
                      fill="url(#revenueFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        ) : showPrescriptionCharts ? (
          <Card className="xl:col-span-2">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Pending prescriptions</CardTitle>
                <CardDescription>Awaiting dispensing at the pharmacy</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/pharmacy">
                  Dispense queue <ArrowRight />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRx.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                        No prescriptions awaiting dispensing. 🎉
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingRx.map((p) => {
                      const record = recordById.get(p.medicalRecordId)
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">
                            {fullName(patientById, record?.patientId)}
                          </TableCell>
                          <TableCell>{p.items.length}</TableCell>
                          <TableCell>{formatDateTime(p.issuedAt)}</TableCell>
                          <TableCell>
                            <StatusBadge label={p.status} variant="warning" dot="bg-amber-500" />
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card className="xl:col-span-2">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Today's schedule</CardTitle>
                <CardDescription>Appointments happening today</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/appointments">
                  View all <ArrowRight />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayAppointments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                        No appointments scheduled today.
                      </TableCell>
                    </TableRow>
                  ) : (
                    todayAppointments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">
                          {fullName(patientById, a.patientId)}
                        </TableCell>
                        <TableCell>{formatTime(a.scheduledStart)}</TableCell>
                        <TableCell className="max-w-40 truncate">{a.reasonForVisit}</TableCell>
                        <TableCell>
                          <StatusBadge
                            label={a.status}
                            variant={appointmentStatusStyle[a.status].variant}
                            dot={appointmentStatusStyle[a.status].dot}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {showPrescriptionCharts ? 'Prescription status' : 'Appointment status'}
            </CardTitle>
            <CardDescription>Distribution across all records</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={showPrescriptionCharts ? prescriptionDistribution : statusDistribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  strokeWidth={2}
                >
                  {(showPrescriptionCharts ? prescriptionDistribution : statusDistribution).map(
                    (entry) => (
                      <Cell
                        key={entry.name}
                        fill={
                          (showPrescriptionCharts ? PRESCRIPTION_COLORS : STATUS_COLORS)[entry.name] ??
                          '#94a3b8'
                        }
                      />
                    ),
                  )}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
              {(showPrescriptionCharts ? prescriptionDistribution : statusDistribution).map(
                (entry) => (
                  <div key={entry.name} className="flex items-center gap-2 text-xs">
                    <span
                      className="size-2 rounded-full"
                      style={{
                        backgroundColor:
                          (showPrescriptionCharts ? PRESCRIPTION_COLORS : STATUS_COLORS)[entry.name],
                      }}
                    />
                    <span className="text-muted-foreground flex-1">{entry.name}</span>
                    <span className="font-semibold">{entry.value}</span>
                  </div>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {role === UserRole.Pharmacist ? (
          <Card className="xl:col-span-2">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Recently dispensed</CardTitle>
                <CardDescription>Latest prescriptions completed</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/pharmacy">
                  Pharmacy <ArrowRight />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Dispensed</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentlyDispensed.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                        Nothing dispensed yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentlyDispensed.map((p) => {
                      const record = recordById.get(p.medicalRecordId)
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">
                            {fullName(patientById, record?.patientId)}
                          </TableCell>
                          <TableCell>{p.items.length}</TableCell>
                          <TableCell>{formatDateTime(p.dispensedAt ?? '')}</TableCell>
                          <TableCell>
                            <StatusBadge label={p.status} variant="success" dot="bg-emerald-500" />
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card className="xl:col-span-2">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Upcoming appointments</CardTitle>
                <CardDescription>Next patients on the schedule</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/appointments">
                  View all <ArrowRight />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcoming.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        No upcoming appointments.
                      </TableCell>
                    </TableRow>
                  ) : (
                    upcoming.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">
                          {fullName(patientById, a.patientId)}
                        </TableCell>
                        <TableCell>{fullName(doctorById, a.doctorId)}</TableCell>
                        <TableCell>{formatTime(a.scheduledStart)}</TableCell>
                        <TableCell className="max-w-40 truncate">{a.reasonForVisit}</TableCell>
                        <TableCell>
                          <StatusBadge
                            label={a.status}
                            variant={appointmentStatusStyle[a.status].variant}
                            dot={appointmentStatusStyle[a.status].dot}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <RoleFocusCard
          role={role}
          lowStock={lowStock}
          records={stats.myRecords}
          allRecords={medicalRecords}
          payments={payments}
          patientById={patientById}
          doctorById={doctorById}
          invoiceById={invoiceById}
        />
      </div>
    </div>
  )
}

function RoleFocusCard({
  role,
  lowStock,
  records,
  allRecords,
  payments,
  patientById,
  doctorById,
  invoiceById,
}: {
  role: UserRole
  lowStock: ReturnType<typeof lowStockDrugs>
  records: ReturnType<typeof useEntityMaps>['medicalRecords']
  allRecords: ReturnType<typeof useEntityMaps>['medicalRecords']
  payments: ReturnType<typeof useEntityMaps>['payments']
  patientById: ReturnType<typeof useEntityMaps>['patientById']
  doctorById: ReturnType<typeof useEntityMaps>['doctorById']
  invoiceById: ReturnType<typeof useEntityMaps>['invoiceById']
}) {
  if (role === UserRole.Admin || role === UserRole.Pharmacist) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="text-amber-500 size-4" />
            Low stock alerts
          </CardTitle>
          <CardDescription>Drugs at or below reorder level</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {lowStock.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              All inventory levels are healthy. 🎉
            </p>
          ) : (
            lowStock.map((drug) => (
              <div
                key={drug.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium">{drug.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {drug.stockQuantity} left · reorder at {drug.reorderLevel}
                  </p>
                </div>
                <Badge variant={drug.stockQuantity === 0 ? 'destructive' : 'warning'}>
                  {drug.stockQuantity === 0 ? 'Out of stock' : 'Low'}
                </Badge>
              </div>
            ))
          )}
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link to="/pharmacy">
              Manage inventory <ArrowRight />
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (role === UserRole.Receptionist) {
    const recent = payments.slice(0, 4)
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="text-emerald-500 size-4" />
            Recent payments
          </CardTitle>
          <CardDescription>Latest payments received</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recent.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">No payments yet.</p>
          ) : (
            recent.map((pay) => {
              const invoice = invoiceById.get(pay.invoiceId)
              return (
                <div
                  key={pay.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {fullName(patientById, invoice?.patientId)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {pay.paymentMethod} · {formatDateTime(pay.paymentDate)}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-emerald-600">{formatCurrency(pay.amount)}</p>
                </div>
              )
            })
          )}
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link to="/billing">
              Open billing <ArrowRight />
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Doctor / Nurse → recent consultations
  const recent = (role === UserRole.Doctor ? records : allRecords)
    .slice()
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
    .slice(0, 4)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="text-sky-500 size-4" />
          {role === UserRole.Doctor ? 'My recent consultations' : 'Recent consultations'}
        </CardTitle>
        <CardDescription>Latest medical records on file</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {recent.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">No records yet.</p>
        ) : (
          recent.map((r) => (
            <div key={r.id} className="rounded-lg border px-3 py-2.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{fullName(patientById, r.patientId)}</p>
                <span className="text-muted-foreground text-xs">{formatDateTime(r.recordedAt)}</span>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                {role === UserRole.Nurse
                  ? `Dr. ${fullName(doctorById, r.doctorId)}`
                  : r.diagnosis}
              </p>
            </div>
          ))
        )}
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link to="/records">
            Open medical records <ArrowRight />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
