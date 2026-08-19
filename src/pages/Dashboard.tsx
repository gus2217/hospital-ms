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
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  ClipboardPlus,
  Pill,
  Users,
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
import {
  appointmentStatusStyle,
} from '@/lib/status'
import { AppointmentStatus } from '@/types'
import {
  fullName,
  isToday,
  lowStockDrugs,
  orderedPrescriptions,
  upcomingAppointments,
  useEntityMaps,
} from '@/lib/useEntities'
import { formatCurrency, formatTime } from '@/lib/format'

const STATUS_COLORS: Record<string, string> = {
  Pending: '#f59e0b',
  Confirmed: '#0ea5e9',
  InProgress: '#8b5cf6',
  Completed: '#10b981',
  Cancelled: '#94a3b8',
  NoShow: '#ef4444',
}

export default function Dashboard() {
  const appointments = useHospitalStore((s) => s.appointments)
  const payments = useHospitalStore((s) => s.payments)
  const drugs = useHospitalStore((s) => s.drugs)
  const prescriptions = useHospitalStore((s) => s.prescriptions)
  const patients = useHospitalStore((s) => s.patients)

  const { patientById, doctorById } = useEntityMaps()

  const stats = useMemo(() => {
    const todayCount = appointments.filter((a) => isToday(a.scheduledStart)).length
    const collected = payments.reduce((sum, p) => sum + p.amount, 0)
    const pendingRx = orderedPrescriptions(prescriptions).length
    return { todayCount, collected, pendingRx, patientCount: patients.length }
  }, [appointments, payments, prescriptions, patients])

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

  const lowStock = useMemo(() => lowStockDrugs(drugs).slice(0, 4), [drugs])
  const upcoming = useMemo(() => upcomingAppointments(appointments).slice(0, 5), [appointments])

  const kpis = [
    {
      label: "Today's Appointments",
      value: String(stats.todayCount),
      sub: `${appointments.filter((a) => isToday(a.scheduledStart) && a.status === AppointmentStatus.InProgress).length} in progress now`,
      icon: CalendarDays,
      accent: 'text-sky-600 bg-sky-50',
    },
    {
      label: 'Registered Patients',
      value: String(stats.patientCount),
      sub: 'Across all departments',
      icon: Users,
      accent: 'text-violet-600 bg-violet-50',
    },
    {
      label: 'Revenue Collected',
      value: formatCurrency(stats.collected),
      sub: 'All time (mock data)',
      icon: CircleDollarSign,
      accent: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'Pending Prescriptions',
      value: String(stats.pendingRx),
      sub: 'Awaiting pharmacy dispensing',
      icon: Pill,
      accent: 'text-amber-600 bg-amber-50',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Hospital overview — patient flow from booking to billing."
      >
        <Button asChild variant="outline">
          <Link to="/appointments">
            <ClipboardPlus />
            New appointment
          </Link>
        </Button>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appointment status</CardTitle>
            <CardDescription>Distribution across all records</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  strokeWidth={2}
                >
                  {statusDistribution.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
              {statusDistribution.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2 text-xs">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[entry.name] }}
                  />
                  <span className="text-muted-foreground flex-1">{entry.name}</span>
                  <span className="font-semibold">{entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
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
      </div>
    </div>
  )
}
