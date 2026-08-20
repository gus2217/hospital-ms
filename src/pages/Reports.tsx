import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  BarChart3,
  Boxes,
  CalendarDays,
  CircleDollarSign,
  Pill,
  Users,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useHospitalStore } from '@/store/hospitalStore'
import { AppointmentStatus, PrescriptionStatus } from '@/types'
import { formatCurrency } from '@/lib/format'
import { useEntityMaps } from '@/lib/useEntities'

const COLORS = ['#0d9488', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981']

function useReportData() {
  const appointments = useHospitalStore((s) => s.appointments)
  const invoices = useHospitalStore((s) => s.invoices)
  const prescriptions = useHospitalStore((s) => s.prescriptions)
  const medicalRecords = useHospitalStore((s) => s.medicalRecords)
  const drugs = useHospitalStore((s) => s.drugs)
  const patients = useHospitalStore((s) => s.patients)
  const { doctorById, drugById } = useEntityMaps()

  return useMemo(() => {
    // ---- Patient volume ----
    const volume = Array.from({ length: 14 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (13 - i))
      const key = d.toDateString()
      return {
        label: d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }),
        appointments: appointments.filter((a) => new Date(a.scheduledStart).toDateString() === key).length,
      }
    })

    // ---- Revenue by department ----
    const deptSums: Record<string, number> = { Consultation: 0, Pharmacy: 0, Laboratory: 0 }
    for (const inv of invoices) {
      for (const item of inv.items) {
        if (item.sourceType === 'Consultation' || item.sourceType === 'Appointment') {
          deptSums.Consultation += item.totalPrice
        } else if (item.sourceType === 'Prescription') {
          deptSums.Pharmacy += item.totalPrice
        } else if (item.sourceType === 'LabTest') {
          deptSums.Laboratory += item.totalPrice
        }
      }
    }
    const revenueByDept = Object.entries(deptSums).map(([name, value]) => ({ name, value }))

    // ---- Prescriptions ----
    const drugCounts = new Map<string, number>()
    for (const rx of prescriptions) {
      for (const item of rx.items) {
        drugCounts.set(item.drugId, (drugCounts.get(item.drugId) ?? 0) + item.quantity)
      }
    }
    const topDrugs = Array.from(drugCounts.entries())
      .map(([drugId, qty]) => ({ name: drugById.get(drugId)?.name ?? drugId, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6)

    const dispensedTrend = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const key = d.toDateString()
      return {
        label: d.toLocaleDateString('en-KE', { weekday: 'short' }),
        dispensed: prescriptions.filter(
          (rx) => rx.status === PrescriptionStatus.Dispensed && rx.dispensedAt && new Date(rx.dispensedAt).toDateString() === key,
        ).length,
      }
    })

    // ---- Appointment analytics ----
    const noShows = appointments.filter((a) => a.status === AppointmentStatus.NoShow).length
    const noShowRate = appointments.length ? Math.round((noShows / appointments.length) * 100) : 0
    const peakHours = Array.from({ length: 12 }, (_, i) => {
      const hour = i + 8
      return {
        label: `${String(hour).padStart(2, '0')}:00`,
        count: appointments.filter((a) => new Date(a.scheduledStart).getHours() === hour).length,
      }
    })
    const doctorUtil = Array.from(doctorById.values()).map((doc) => {
      const mine = appointments.filter((a) => a.doctorId === doc.id)
      const completed = mine.filter((a) => a.status === AppointmentStatus.Completed).length
      return {
        doctor: doc,
        total: mine.length,
        completed,
        utilisation: mine.length ? Math.round((completed / mine.length) * 100) : 0,
      }
    })

    // ---- Staff performance ----
    const perDoctor = Array.from(doctorById.values()).map((doc) => ({
      name: `Dr. ${doc.lastName}`,
      consultations: medicalRecords.filter((r) => r.doctorId === doc.id).length,
    }))

    // ---- Inventory ----
    const inventory = drugs.map((d) => ({
      drug: d,
      value: d.unitPrice * d.stockQuantity,
      status: d.stockQuantity <= d.reorderPoint ? ('Low' as const) : ('OK' as const),
    }))

    return {
      volume,
      revenueByDept,
      totalRevenue: Object.values(deptSums).reduce((a, b) => a + b, 0),
      topDrugs,
      dispensedTrend,
      noShowRate,
      noShows,
      peakHours,
      doctorUtil,
      perDoctor,
      inventory,
      totalInventoryValue: inventory.reduce((s, i) => s + i.value, 0),
      patientsCount: patients.length,
    }
  }, [appointments, invoices, prescriptions, medicalRecords, drugs, patients, doctorById, drugById])
}

const TOOLTIP_STYLE = { borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }

function PatientVolumeTab() {
  const d = useReportData()
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={CalendarDays} label="Appointments (14 days)" value={String(d.volume.reduce((s, v) => s + v.appointments, 0))} accent="text-sky-600 bg-sky-50" />
        <StatCard icon={Users} label="Registered patients" value={String(d.patientsCount)} accent="text-violet-600 bg-violet-50" />
        <StatCard icon={Activity} label="No-show rate" value={`${d.noShowRate}%`} accent="text-rose-600 bg-rose-50" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily patient volume — last 14 days</CardTitle>
          <CardDescription>Appointments scheduled per day</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={d.volume} margin={{ left: -16, right: 8, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="appointments" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

function RevenueTab() {
  const d = useReportData()
  return (
    <div className="space-y-4">
      <StatCard icon={CircleDollarSign} label="Total invoiced (all departments)" value={formatCurrency(d.totalRevenue)} accent="text-emerald-600 bg-emerald-50" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue by department</CardTitle>
          <CardDescription>Consultation · Pharmacy · Laboratory</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={d.revenueByDept} margin={{ left: -16, right: 8, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [formatCurrency(Number(v)), 'Invoiced']} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {d.revenueByDept.map((entry, i) => (
                  <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

function PrescriptionTab() {
  const d = useReportData()
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Pill className="size-4" /> Most prescribed drugs
          </CardTitle>
          <CardDescription>Units ordered across all prescriptions</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={d.topDrugs} layout="vertical" margin={{ left: 8, right: 16, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={11} width={110} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="qty" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dispensing trend — last 7 days</CardTitle>
          <CardDescription>Prescriptions dispensed per day</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={d.dispensedTrend} margin={{ left: -16, right: 8, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="dispensed" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

function AppointmentTab() {
  const d = useReportData()
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Peak hours</CardTitle>
            <CardDescription>Appointments by hour of day (08:00–19:00)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={d.peakHours} margin={{ left: -16, right: 8, top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} interval={1} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Doctor utilisation</CardTitle>
            <CardDescription>Completed vs total appointments per doctor</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Doctor</TableHead>
                  <TableHead>Appointments</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Utilisation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.doctorUtil.map((row) => (
                  <TableRow key={row.doctor.id}>
                    <TableCell className="font-medium">
                      Dr. {row.doctor.lastName} · {row.doctor.specialization}
                    </TableCell>
                    <TableCell>{row.total}</TableCell>
                    <TableCell>{row.completed}</TableCell>
                    <TableCell>
                      <Badge variant={row.utilisation >= 60 ? 'success' : row.utilisation >= 30 ? 'warning' : 'slate'}>
                        {row.utilisation}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StaffPerformanceTab() {
  const d = useReportData()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="size-4" /> Consultations per doctor
        </CardTitle>
        <CardDescription>Medical records authored by each doctor</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={d.perDoctor} margin={{ left: -16, right: 8, top: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="consultations" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function InventoryTab() {
  const d = useReportData()
  return (
    <div className="space-y-4">
      <StatCard icon={Boxes} label="Total inventory value" value={formatCurrency(d.totalInventoryValue)} accent="text-teal-600 bg-teal-50" />
      <Card className="gap-0 border-0 py-0 shadow-none">
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Drug</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Unit price</TableHead>
                <TableHead>Stock value</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.inventory.map(({ drug, value, status }) => (
                <TableRow key={drug.id}>
                  <TableCell>
                    <p className="font-medium">{drug.name}</p>
                    <p className="text-muted-foreground text-xs">{drug.batchNumber}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{drug.category}</Badge>
                  </TableCell>
                  <TableCell>{drug.stockQuantity}</TableCell>
                  <TableCell>{formatCurrency(drug.unitPrice)}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(value)}</TableCell>
                  <TableCell className="text-xs">{new Date(drug.expiryDate).toLocaleDateString('en-KE')}</TableCell>
                  <TableCell>
                    <Badge variant={status === 'Low' ? 'warning' : 'success'}>
                      {status === 'Low' ? 'Low stock' : 'Healthy'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Users
  label: string
  value: string
  accent: string
}) {
  return (
    <Card className="gap-2 py-4">
      <CardContent className="flex items-center justify-between px-5">
        <div>
          <p className="text-muted-foreground text-sm">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${accent}`}>
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function Reports() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Patient volume, revenue, prescriptions, appointments, staff performance and inventory."
      />

      <Tabs defaultValue="volume">
        <TabsList className="flex-wrap">
          <TabsTrigger value="volume">
            <Users /> Patient Volume
          </TabsTrigger>
          <TabsTrigger value="revenue">
            <CircleDollarSign /> Revenue
          </TabsTrigger>
          <TabsTrigger value="prescriptions">
            <Pill /> Prescriptions
          </TabsTrigger>
          <TabsTrigger value="appointments">
            <CalendarDays /> Appointments
          </TabsTrigger>
          <TabsTrigger value="staff">
            <BarChart3 /> Staff Performance
          </TabsTrigger>
          <TabsTrigger value="inventory">
            <Boxes /> Inventory
          </TabsTrigger>
        </TabsList>

        <TabsContent value="volume" className="pt-4">
          <PatientVolumeTab />
        </TabsContent>
        <TabsContent value="revenue" className="pt-4">
          <RevenueTab />
        </TabsContent>
        <TabsContent value="prescriptions" className="pt-4">
          <PrescriptionTab />
        </TabsContent>
        <TabsContent value="appointments" className="pt-4">
          <AppointmentTab />
        </TabsContent>
        <TabsContent value="staff" className="pt-4">
          <StaffPerformanceTab />
        </TabsContent>
        <TabsContent value="inventory" className="pt-4">
          <InventoryTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
