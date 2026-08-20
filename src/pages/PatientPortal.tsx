import { useMemo, useState, type FormEvent } from 'react'
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  Clock3,
  Download,
  Eye,
  FileText,
  HeartPulse,
  Pencil,
  Pill,
  Receipt,
  ShieldCheck,
  Stethoscope,
  UserRound,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useHospitalStore } from '@/store/hospitalStore'
import { useAuthStore } from '@/store/authStore'
import { appointmentStatusStyle, invoiceStatusStyle, prescriptionStatusStyle } from '@/lib/status'
import {
  AppointmentStatus,
  type Appointment,
  type MedicalRecord,
} from '@/types'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatTime,
  initials,
  relativeDayLabel,
} from '@/lib/format'
import { fullName, useEntityMaps } from '@/lib/useEntities'
import { cn } from '@/lib/utils'

const STATUS_ACCENTS: Record<AppointmentStatus, string> = {
  [AppointmentStatus.Pending]: 'border-l-amber-400',
  [AppointmentStatus.Confirmed]: 'border-l-sky-400',
  [AppointmentStatus.InProgress]: 'border-l-violet-400',
  [AppointmentStatus.Completed]: 'border-l-emerald-400',
  [AppointmentStatus.Cancelled]: 'border-l-slate-300',
  [AppointmentStatus.NoShow]: 'border-l-red-400',
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const DEFAULT_BOOKING_START = toDatetimeLocal(
  new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
)

function daysUntil(iso: string): string {
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
  if (diff < 1) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return `In ${diff} days`
}

function greeting(): string {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

// ======================= Dialogs =======================

function BookingDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const currentUser = useAuthStore((s) => s.currentUser)
  const addAppointment = useHospitalStore((s) => s.addAppointment)
  const { doctors } = useEntityMaps()

  const [doctorId, setDoctorId] = useState('')
  const [scheduledStart, setScheduledStart] = useState(DEFAULT_BOOKING_START)
  const [reason, setReason] = useState('')

  const valid = doctorId && scheduledStart && reason.trim()

  function handleBook() {
    if (!valid || !currentUser) return
    const start = new Date(scheduledStart).toISOString()
    addAppointment({
      patientId: currentUser.id,
      doctorId,
      scheduledStart: start,
      scheduledEnd: new Date(new Date(start).getTime() + 45 * 60_000).toISOString(),
      status: AppointmentStatus.Pending,
      reasonForVisit: reason.trim(),
    })
    toast.success('Booking request sent — reception will confirm shortly.')
    onOpenChange(false)
    setReason('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="text-primary size-5" /> Book an appointment
          </DialogTitle>
          <DialogDescription>
            Your request is created as Pending and confirmed by the reception desk.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Doctor</Label>
            <Select value={doctorId} onValueChange={setDoctorId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    Dr. {d.lastName} · {d.specialization}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Date & time</Label>
            <Input
              type="datetime-local"
              value={scheduledStart}
              onChange={(e) => setScheduledStart(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Reason for visit</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Briefly describe your symptoms…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleBook} disabled={!valid}>
            <CalendarPlus /> Request booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RescheduleDialog({
  appointment,
  open,
  onOpenChange,
}: {
  appointment: Appointment | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const updateAppointment = useHospitalStore((s) => s.updateAppointment)
  const [start, setStart] = useState('')

  function handleSave() {
    if (!appointment || !start) return
    const scheduledStart = new Date(start).toISOString()
    updateAppointment(appointment.id, {
      scheduledStart,
      scheduledEnd: new Date(new Date(scheduledStart).getTime() + 45 * 60_000).toISOString(),
    })
    toast.success(`${appointment.id} rescheduled.`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock3 className="text-primary size-5" /> Reschedule {appointment?.id}
          </DialogTitle>
          <DialogDescription>Pick a new date and time.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label>New date & time</Label>
          <Input
            type="datetime-local"
            value={start || (appointment ? toDatetimeLocal(appointment.scheduledStart) : '')}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!start}>
            Save new time
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RecordDetailDialog({
  record,
  open,
  onOpenChange,
}: {
  record: MedicalRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { doctorById } = useEntityMaps()
  if (!record) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="text-primary size-5" /> {record.id}
          </DialogTitle>
          <DialogDescription>
            Dr. {fullName(doctorById, record.doctorId)} · {formatDateTime(record.recordedAt)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="rounded-lg border-l-4 border-l-teal-500 bg-muted/30 p-3">
            <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wide">
              Diagnosis
            </p>
            <p className="font-medium">{record.diagnosis}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wide">
              Treatment plan
            </p>
            <p className="whitespace-pre-wrap">{record.treatmentPlan}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wide">
              Clinical notes
            </p>
            <p className="whitespace-pre-wrap">{record.clinicalNotes}</p>
          </div>
          {record.consultationFee && (
            <div className="flex justify-between rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-muted-foreground">Consultation fee</span>
              <span className="font-semibold">{formatCurrency(record.consultationFee)}</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ======================= Portal =======================

export default function PatientPortal() {
  const currentUser = useAuthStore((s) => s.currentUser)
  const patientId = currentUser?.id ?? ''

  const appointments = useHospitalStore((s) => s.appointments)
  const medicalRecords = useHospitalStore((s) => s.medicalRecords)
  const prescriptions = useHospitalStore((s) => s.prescriptions)
  const invoices = useHospitalStore((s) => s.invoices)
  const payments = useHospitalStore((s) => s.payments)
  const setAppointmentStatus = useHospitalStore((s) => s.setAppointmentStatus)
  const updatePatient = useHospitalStore((s) => s.updatePatient)

  const { doctorById, patientById, recordById, drugById } = useEntityMaps()

  const [bookingOpen, setBookingOpen] = useState(false)
  const [rescheduling, setRescheduling] = useState<Appointment | null>(null)
  const [viewingRecord, setViewingRecord] = useState<MedicalRecord | null>(null)

  const myAppointments = useMemo(
    () =>
      appointments
        .filter((a) => a.patientId === patientId)
        .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()),
    [appointments, patientId],
  )
  const upcoming = myAppointments.filter(
    (a) =>
      a.status !== AppointmentStatus.Completed &&
      a.status !== AppointmentStatus.Cancelled &&
      a.status !== AppointmentStatus.NoShow,
  )
  const nextAppointment = upcoming[0]

  const myRecords = useMemo(
    () =>
      medicalRecords
        .filter((r) => r.patientId === patientId)
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()),
    [medicalRecords, patientId],
  )
  const myInvoices = useMemo(
    () =>
      invoices
        .filter((i) => i.patientId === patientId)
        .sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime()),
    [invoices, patientId],
  )
  const myPrescriptions = useMemo(() => {
    const recordIds = new Set(myRecords.map((r) => r.id))
    return prescriptions.filter((p) => recordIds.has(p.medicalRecordId))
  }, [prescriptions, myRecords])

  const outstanding = myInvoices.reduce((s, i) => s + (i.totalAmount - i.amountPaid), 0)
  const activeRx = myPrescriptions.filter((p) => p.status === 'Ordered').length

  // ---- Profile state ----
  const patient = patientById.get(patientId)
  const [firstName, setFirstName] = useState(patient?.firstName ?? '')
  const [lastName, setLastName] = useState(patient?.lastName ?? '')
  const [phone, setPhone] = useState(patient?.phoneNumber ?? '')
  const [emergencyContact, setEmergencyContact] = useState(patient?.emergencyContact ?? '')
  const [insurance, setInsurance] = useState(patient?.insurancePolicyNumber ?? '')

  function handleProfileSave(e: FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First and last name are required.')
      return
    }
    updatePatient(patientId, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phoneNumber: phone.trim() || undefined,
      emergencyContact: emergencyContact.trim(),
      insurancePolicyNumber: insurance.trim() || undefined,
    })
    toast.success('Profile updated.')
  }

  function downloadPrescription(rxId: string) {
    const rx = prescriptions.find((p) => p.id === rxId)
    if (!rx) return
    const record = recordById.get(rx.medicalRecordId)
    const lines = [
      '==========================================',
      '        MEDICORE HMS — PRESCRIPTION',
      '==========================================',
      `Prescription: ${rx.id}`,
      `Patient: ${fullName(patientById, record?.patientId)}`,
      `Doctor: ${fullName(doctorById, record?.doctorId)}`,
      `Issued: ${formatDateTime(rx.issuedAt)}`,
      `Status: ${rx.status}`,
      '------------------------------------------',
      ...rx.items.map((item) => {
        const drug = drugById.get(item.drugId)
        return `• ${drug?.name ?? item.drugId} × ${item.quantity}\n  ${item.dosageInstructions}`
      }),
      '------------------------------------------',
      'This is a demo document generated by MediCore HMS.',
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${rx.id}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`${rx.id} downloaded.`)
  }

  const stats = [
    {
      label: 'Upcoming appointments',
      value: String(upcoming.length),
      icon: CalendarDays,
      accent: 'text-sky-600 bg-sky-50',
    },
    {
      label: 'Medical records',
      value: String(myRecords.length),
      icon: FileText,
      accent: 'text-violet-600 bg-violet-50',
    },
    {
      label: 'Outstanding balance',
      value: formatCurrency(outstanding),
      icon: Receipt,
      accent: 'text-amber-600 bg-amber-50',
    },
    {
      label: 'Active prescriptions',
      value: String(activeRx),
      icon: Pill,
      accent: 'text-emerald-600 bg-emerald-50',
    },
  ]

  const nextDoctor = nextAppointment ? doctorById.get(nextAppointment.doctorId) : undefined

  return (
    <div className="space-y-6">
      {/* ---------- Hero ---------- */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-teal-600 via-teal-600 to-emerald-600 p-6 text-white shadow-lg sm:p-8">
        <div className="absolute -top-16 -right-10 size-64 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-24 right-24 size-72 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="absolute top-6 right-6 hidden opacity-20 sm:block">
          <HeartPulse className="size-28" />
        </div>

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-medium text-white/70">{greeting()} 👋</p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {patient?.firstName} {patient?.lastName}
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-white/80">
              Your health, at your fingertips — appointments, records, billing and prescriptions
              in one calm place.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                onClick={() => setBookingOpen(true)}
                className="bg-white text-teal-700 shadow-sm hover:bg-white/90"
              >
                <CalendarPlus /> Book appointment
              </Button>
              <Button
                variant="outline"
                onClick={() => document.querySelector<HTMLButtonElement>('[data-portal-tab="records"]')?.click()}
                className="border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white"
              >
                <FileText /> View records
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex size-20 items-center justify-center rounded-2xl border border-white/25 bg-white/15 text-2xl font-bold backdrop-blur">
              {initials(patient?.firstName ?? '', patient?.lastName ?? '')}
            </div>
            <div className="space-y-1.5 text-sm">
              <p className="text-white/70">Patient ID</p>
              <p className="font-mono font-semibold">{patientId}</p>
              <p className="flex items-center gap-1.5 text-white/80">
                <ShieldCheck className="size-3.5" />
                {insurance ? `NHIF · ${insurance}` : 'No insurance on file'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Stats ---------- */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="gap-2 py-4">
            <CardContent className="flex items-center justify-between px-5">
              <div>
                <p className="text-muted-foreground text-sm">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight">{stat.value}</p>
              </div>
              <div className={cn('rounded-xl p-2.5', stat.accent)}>
                <stat.icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview" data-portal-tab="overview">
            <HeartPulse /> Overview
          </TabsTrigger>
          <TabsTrigger value="appointments" data-portal-tab="appointments">
            <CalendarDays /> Appointments
          </TabsTrigger>
          <TabsTrigger value="records" data-portal-tab="records">
            <FileText /> Medical Records
          </TabsTrigger>
          <TabsTrigger value="billing" data-portal-tab="billing">
            <Receipt /> Billing
          </TabsTrigger>
          <TabsTrigger value="prescriptions" data-portal-tab="prescriptions">
            <Pill /> Prescriptions
          </TabsTrigger>
          <TabsTrigger value="profile" data-portal-tab="profile">
            <UserRound /> Profile
          </TabsTrigger>
        </TabsList>

        {/* ---------------- Overview ---------------- */}
        <TabsContent value="overview" className="pt-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {/* Next appointment spotlight */}
            <Card className="gap-0 overflow-hidden py-0 xl:col-span-2">
              <div className="flex items-center justify-between border-b bg-muted/30 px-6 py-3">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Stethoscope className="text-primary size-4" /> Next appointment
                </p>
                <Badge variant="outline" className="font-normal">
                  {nextAppointment ? daysUntil(nextAppointment.scheduledStart) : '—'}
                </Badge>
              </div>
              {nextAppointment ? (
                <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
                  <div className="bg-primary/10 text-primary flex size-14 shrink-0 items-center justify-center rounded-2xl">
                    <CalendarDays className="size-7" />
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-bold">
                      Dr. {nextDoctor?.lastName}
                      <span className="text-muted-foreground text-sm font-normal">
                        {' '}
                        · {nextDoctor?.specialization}
                      </span>
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-sm">
                      {relativeDayLabel(nextAppointment.scheduledStart)} at{' '}
                      {formatTime(nextAppointment.scheduledStart)} · {nextAppointment.id}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {nextAppointment.reasonForVisit}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      label={nextAppointment.status}
                      variant={appointmentStatusStyle[nextAppointment.status].variant}
                      dot={appointmentStatusStyle[nextAppointment.status].dot}
                    />
                    {(nextAppointment.status === AppointmentStatus.Pending ||
                      nextAppointment.status === AppointmentStatus.Confirmed) && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => setRescheduling(nextAppointment)}>
                          <Pencil /> Reschedule
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => {
                            setAppointmentStatus(nextAppointment.id, AppointmentStatus.Cancelled)
                            toast.info(`${nextAppointment.id} cancelled.`)
                          }}
                        >
                          <XCircle /> Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 p-8 text-center">
                  <div className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-2xl">
                    <CalendarPlus className="size-7" />
                  </div>
                  <div>
                    <p className="font-semibold">No upcoming appointments</p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Book your next visit — reception will confirm it shortly.
                    </p>
                  </div>
                  <Button onClick={() => setBookingOpen(true)}>
                    <CalendarPlus /> Book appointment
                  </Button>
                </div>
              )}
            </Card>

            {/* Quick actions */}
            <Card className="gap-3 p-6">
              <p className="text-sm font-semibold">Quick actions</p>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => setBookingOpen(true)}>
                  <CalendarPlus /> Book appointment
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => document.querySelector<HTMLButtonElement>('[data-portal-tab="records"]')?.click()}
                >
                  <FileText /> My medical records
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => document.querySelector<HTMLButtonElement>('[data-portal-tab="billing"]')?.click()}
                >
                  <Receipt /> View invoices
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => document.querySelector<HTMLButtonElement>('[data-portal-tab="prescriptions"]')?.click()}
                >
                  <Pill /> My prescriptions
                </Button>
              </div>
            </Card>
          </div>

          {/* Recent records + invoices */}
          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className="gap-3 p-6">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <FileText className="text-sky-500 size-4" /> Recent records
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => document.querySelector<HTMLButtonElement>('[data-portal-tab="records"]')?.click()}
                >
                  View all <ArrowRight />
                </Button>
              </div>
              <div className="space-y-2">
                {myRecords.length === 0 ? (
                  <p className="text-muted-foreground py-6 text-center text-sm">
                    No records on file yet.
                  </p>
                ) : (
                  myRecords.slice(0, 3).map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setViewingRecord(r)}
                      className="flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-accent/50"
                    >
                      <div>
                        <p className="text-sm font-medium">{r.diagnosis}</p>
                        <p className="text-muted-foreground text-xs">
                          Dr. {fullName(doctorById, r.doctorId)} · {formatDate(r.recordedAt)}
                        </p>
                      </div>
                      <Eye className="text-muted-foreground size-4" />
                    </button>
                  ))
                )}
              </div>
            </Card>

            <Card className="gap-3 p-6">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Receipt className="text-amber-500 size-4" /> Recent invoices
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => document.querySelector<HTMLButtonElement>('[data-portal-tab="billing"]')?.click()}
                >
                  View all <ArrowRight />
                </Button>
              </div>
              <div className="space-y-2">
                {myInvoices.length === 0 ? (
                  <p className="text-muted-foreground py-6 text-center text-sm">No invoices yet.</p>
                ) : (
                  myInvoices.slice(0, 3).map((inv) => {
                    const balance = inv.totalAmount - inv.amountPaid
                    return (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between rounded-lg border px-3 py-2.5"
                      >
                        <div>
                          <p className="font-mono text-xs font-semibold">{inv.id}</p>
                          <p className="text-muted-foreground text-xs">
                            {formatDate(inv.issuedDate)} · {inv.items.length} item(s)
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{formatCurrency(inv.totalAmount)}</p>
                          <p className={balance > 0 ? 'text-red-600 text-xs' : 'text-emerald-600 text-xs'}>
                            {balance > 0 ? `${formatCurrency(balance)} due` : 'Paid'}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ---------------- Appointments ---------------- */}
        <TabsContent value="appointments" className="pt-4">
          <div className="space-y-3">
            {myAppointments.length === 0 ? (
              <Card className="gap-0 border-0 py-14 shadow-none">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-2xl">
                    <CalendarDays className="size-7" />
                  </div>
                  <div>
                    <p className="font-semibold">No appointments yet</p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Book your first visit — reception will confirm it shortly.
                    </p>
                  </div>
                  <Button onClick={() => setBookingOpen(true)}>
                    <CalendarPlus /> Book appointment
                  </Button>
                </div>
              </Card>
            ) : (
              myAppointments.map((a) => {
                const doc = doctorById.get(a.doctorId)
                return (
                  <div
                    key={a.id}
                    className={cn(
                      'flex flex-col gap-3 rounded-xl border border-l-4 bg-card p-4 shadow-sm sm:flex-row sm:items-center',
                      STATUS_ACCENTS[a.status],
                    )}
                  >
                    <div className="flex flex-1 items-start gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-xs font-bold text-accent-foreground">
                        {doc ? initials(doc.firstName, doc.lastName) : '—'}
                      </div>
                      <div>
                        <p className="font-semibold">
                          Dr. {doc?.lastName}
                          <span className="text-muted-foreground text-xs font-normal">
                            {' '}
                            · {doc?.specialization}
                          </span>
                        </p>
                        <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                          <Clock3 className="size-3.5" />
                          {relativeDayLabel(a.scheduledStart)} · {formatTime(a.scheduledStart)}–
                          {formatTime(a.scheduledEnd)}
                        </p>
                        <p className="text-muted-foreground mt-1 text-xs">{a.reasonForVisit}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge
                        label={a.status}
                        variant={appointmentStatusStyle[a.status].variant}
                        dot={appointmentStatusStyle[a.status].dot}
                      />
                      {(a.status === AppointmentStatus.Pending ||
                        a.status === AppointmentStatus.Confirmed) && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => setRescheduling(a)}>
                            <Pencil /> Reschedule
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => {
                              setAppointmentStatus(a.id, AppointmentStatus.Cancelled)
                              toast.info(`${a.id} cancelled.`)
                            }}
                          >
                            <XCircle /> Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </TabsContent>

        {/* ---------------- Records ---------------- */}
        <TabsContent value="records" className="pt-4">
          <div className="space-y-3">
            {myRecords.length === 0 ? (
              <Card className="gap-0 border-0 py-14 shadow-none">
                <p className="text-muted-foreground text-center text-sm">
                  No medical records on file yet.
                </p>
              </Card>
            ) : (
              myRecords.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center"
                >
                  <div className="bg-sky-50 text-sky-600 flex size-11 shrink-0 items-center justify-center rounded-xl">
                    <FileText className="size-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{r.diagnosis}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Dr. {fullName(doctorById, r.doctorId)} · {formatDate(r.recordedAt)} · v{r.version}
                      {r.consultationFee && (
                        <span className="ml-2 font-medium">· {formatCurrency(r.consultationFee)}</span>
                      )}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setViewingRecord(r)}>
                    <Eye /> View
                  </Button>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* ---------------- Billing ---------------- */}
        <TabsContent value="billing" className="pt-4">
          <div className="space-y-4">
            {myInvoices.length === 0 ? (
              <Card className="gap-0 border-0 py-14 shadow-none">
                <p className="text-muted-foreground text-center text-sm">No invoices yet.</p>
              </Card>
            ) : (
              myInvoices.map((inv) => {
                const invPayments = payments
                  .filter((p) => p.invoiceId === inv.id)
                  .sort(
                    (a, b) =>
                      new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime(),
                  )
                const balance = inv.totalAmount - inv.amountPaid
                return (
                  <Card key={inv.id} className="gap-4 overflow-hidden p-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="bg-amber-50 text-amber-600 flex size-9 items-center justify-center rounded-lg">
                          <Receipt className="size-4" />
                        </div>
                        <div>
                          <p className="font-mono text-sm font-bold">{inv.id}</p>
                          <p className="text-muted-foreground text-xs">
                            Issued {formatDate(inv.issuedDate)} · due {formatDate(inv.dueDate)}
                          </p>
                        </div>
                      </div>
                      <StatusBadge
                        label={inv.status}
                        variant={invoiceStatusStyle[inv.status].variant}
                        dot={invoiceStatusStyle[inv.status].dot}
                      />
                    </div>
                    <div className="px-6 pb-4">
                      <div className="space-y-1.5 text-sm">
                        {inv.items.map((item) => (
                          <div key={item.id} className="flex justify-between">
                            <span className="text-muted-foreground">{item.description}</span>
                            <span>{formatCurrency(item.totalPrice)}</span>
                          </div>
                        ))}
                        <Separator />
                        <div className="flex justify-between font-semibold">
                          <span>Total</span>
                          <span>{formatCurrency(inv.totalAmount)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-600">
                          <span>Paid</span>
                          <span>{formatCurrency(inv.amountPaid)}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>Balance</span>
                          <span className={balance > 0 ? 'text-red-600' : ''}>
                            {formatCurrency(balance)}
                          </span>
                        </div>
                      </div>

                      {invPayments.length > 0 && (
                        <div className="mt-4 space-y-1">
                          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                            Payment history
                          </p>
                          {invPayments.map((p) => (
                            <div
                              key={p.id}
                              className="text-muted-foreground flex justify-between rounded-lg bg-muted/50 px-3 py-2 text-xs"
                            >
                              <span>
                                {p.paymentMethod} · {formatDateTime(p.paymentDate)}
                              </span>
                              <span className="font-semibold text-foreground">
                                {formatCurrency(p.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })
            )}
          </div>
        </TabsContent>

        {/* ---------------- Prescriptions ---------------- */}
        <TabsContent value="prescriptions" className="pt-4">
          <div className="space-y-3">
            {myPrescriptions.length === 0 ? (
              <Card className="gap-0 border-0 py-14 shadow-none">
                <p className="text-muted-foreground text-center text-sm">
                  No prescriptions issued yet.
                </p>
              </Card>
            ) : (
              myPrescriptions.map((rx) => (
                <div
                  key={rx.id}
                  className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center"
                >
                  <div className="bg-emerald-50 text-emerald-600 flex size-11 shrink-0 items-center justify-center rounded-xl">
                    <Pill className="size-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-sm font-bold">{rx.id}</p>
                      <StatusBadge
                        label={rx.status}
                        variant={prescriptionStatusStyle[rx.status].variant}
                        dot={prescriptionStatusStyle[rx.status].dot}
                      />
                    </div>
                    <ul className="text-muted-foreground mt-1.5 space-y-0.5 text-xs">
                      {rx.items.map((item) => (
                        <li key={item.id}>
                          {drugById.get(item.drugId)?.name ?? item.drugId} × {item.quantity} —{' '}
                          {item.dosageInstructions}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => downloadPrescription(rx.id)}>
                    <Download /> Download
                  </Button>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* ---------------- Profile ---------------- */}
        <TabsContent value="profile" className="pt-4">
          <Card className="max-w-xl gap-6 overflow-hidden p-0">
            <div className="relative overflow-hidden bg-linear-to-br from-teal-600 to-emerald-600 px-6 py-8 text-white">
              <div className="absolute -top-10 -right-6 size-40 rounded-full bg-white/10 blur-xl" />
              <div className="relative flex items-center gap-4">
                <div className="flex size-16 items-center justify-center rounded-2xl border border-white/25 bg-white/15 text-xl font-bold backdrop-blur">
                  {initials(patient?.firstName ?? '', patient?.lastName ?? '')}
                </div>
                <div>
                  <p className="text-xl font-bold">
                    {patient?.firstName} {patient?.lastName}
                  </p>
                  <p className="text-sm text-white/75">{patient?.email}</p>
                  <p className="text-white/75 mt-1 flex items-center gap-1.5 text-xs">
                    <ShieldCheck className="size-3.5" />
                    {insurance ? `NHIF · ${insurance}` : 'No insurance on file'}
                  </p>
                </div>
              </div>
            </div>
            <form onSubmit={handleProfileSave} className="grid gap-4 px-6 pb-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>First name</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Last name</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Emergency contact</Label>
                <Input value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Insurance policy number</Label>
                <Input value={insurance} onChange={(e) => setInsurance(e.target.value)} />
              </div>
              <div className="flex justify-end">
                <Button type="submit">Save profile</Button>
              </div>
            </form>
          </Card>
        </TabsContent>
      </Tabs>

      <BookingDialog open={bookingOpen} onOpenChange={setBookingOpen} />
      <RescheduleDialog
        appointment={rescheduling}
        open={rescheduling !== null}
        onOpenChange={() => setRescheduling(null)}
      />
      <RecordDetailDialog
        record={viewingRecord}
        open={viewingRecord !== null}
        onOpenChange={() => setViewingRecord(null)}
      />
    </div>
  )
}
