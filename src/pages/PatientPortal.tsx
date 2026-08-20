import { useMemo, useState, type FormEvent } from 'react'
import {
  CalendarDays,
  CalendarPlus,
  Download,
  Eye,
  FileText,
  HeartPulse,
  Pencil,
  Receipt,
  UserRound,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader, StatusBadge } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { formatCurrency, formatDate, formatDateTime, formatTime, initials } from '@/lib/format'
import { fullName, useEntityMaps } from '@/lib/useEntities'

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const DEFAULT_BOOKING_START = toDatetimeLocal(
  new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
)

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
          <DialogTitle>Book an appointment</DialogTitle>
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
          <DialogTitle>Reschedule {appointment?.id}</DialogTitle>
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
          <DialogTitle>{record.id}</DialogTitle>
          <DialogDescription>
            Dr. {fullName(doctorById, record.doctorId)} · {formatDateTime(record.recordedAt)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div>
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
        .sort(
          (a, b) =>
            new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime(),
        ),
    [appointments, patientId],
  )
  const upcoming = myAppointments.filter(
    (a) => a.status !== AppointmentStatus.Completed && a.status !== AppointmentStatus.Cancelled && a.status !== AppointmentStatus.NoShow,
  )
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${patient?.firstName ?? ''}`}
        description="Your self-service portal — appointments, records, billing and prescriptions."
      >
        <Badge variant="outline" className="px-3 py-1">
          <UserRound className="size-3.5" /> Patient Portal
        </Badge>
        <Button onClick={() => setBookingOpen(true)}>
          <CalendarPlus /> Book appointment
        </Button>
      </PageHeader>

      {/* Overview strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="gap-2 py-4">
          <CardContent className="flex items-center gap-3 px-5">
            <CalendarDays className="text-sky-600 size-5" />
            <div>
              <p className="text-sm font-semibold">{upcoming.length} upcoming</p>
              <p className="text-muted-foreground text-xs">appointment(s) on your schedule</p>
            </div>
          </CardContent>
        </Card>
        <Card className="gap-2 py-4">
          <CardContent className="flex items-center gap-3 px-5">
            <Receipt className="text-amber-600 size-5" />
            <div>
              <p className="text-sm font-semibold">{formatCurrency(outstanding)}</p>
              <p className="text-muted-foreground text-xs">outstanding balance</p>
            </div>
          </CardContent>
        </Card>
        <Card className="gap-2 py-4">
          <CardContent className="flex items-center gap-3 px-5">
            <FileText className="text-emerald-600 size-5" />
            <div>
              <p className="text-sm font-semibold">{myRecords.length} record(s)</p>
              <p className="text-muted-foreground text-xs">on your medical file</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="appointments">
        <TabsList className="flex-wrap">
          <TabsTrigger value="appointments">
            <CalendarDays /> Appointments
          </TabsTrigger>
          <TabsTrigger value="records">
            <FileText /> Medical Records
          </TabsTrigger>
          <TabsTrigger value="billing">
            <Receipt /> Billing
          </TabsTrigger>
          <TabsTrigger value="prescriptions">
            <HeartPulse /> Prescriptions
          </TabsTrigger>
          <TabsTrigger value="profile">
            <UserRound /> Profile
          </TabsTrigger>
        </TabsList>

        {/* ---------------- Appointments ---------------- */}
        <TabsContent value="appointments" className="pt-4">
          <Card className="gap-0 border-0 py-0 shadow-none">
            <div className="space-y-3">
              {myAppointments.length === 0 ? (
                <p className="text-muted-foreground py-10 text-center text-sm">
                  No appointments yet — book your first visit above.
                </p>
              ) : (
                myAppointments.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex flex-1 items-start gap-3">
                      <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                        <CalendarDays className="size-5" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {fullName(doctorById, a.doctorId)} · {a.reasonForVisit}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {formatDate(a.scheduledStart)} at {formatTime(a.scheduledStart)} · {a.id}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        label={a.status}
                        variant={appointmentStatusStyle[a.status].variant}
                        dot={appointmentStatusStyle[a.status].dot}
                      />
                      {(a.status === AppointmentStatus.Pending ||
                        a.status === AppointmentStatus.Confirmed) && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRescheduling(a)}
                          >
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
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        {/* ---------------- Records ---------------- */}
        <TabsContent value="records" className="pt-4">
          <Card className="gap-0 border-0 py-0 shadow-none">
            <div className="space-y-3">
              {myRecords.length === 0 ? (
                <p className="text-muted-foreground py-10 text-center text-sm">
                  No medical records on file yet.
                </p>
              ) : (
                myRecords.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div>
                      <p className="font-medium">{r.diagnosis}</p>
                      <p className="text-muted-foreground text-xs">
                        Dr. {fullName(doctorById, r.doctorId)} · {formatDate(r.recordedAt)} · v{r.version}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setViewingRecord(r)}>
                      <Eye /> View
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        {/* ---------------- Billing ---------------- */}
        <TabsContent value="billing" className="pt-4">
          <div className="space-y-4">
            {myInvoices.length === 0 ? (
              <Card className="gap-0 border-0 py-10 shadow-none">
                <p className="text-muted-foreground text-center text-sm">No invoices yet.</p>
              </Card>
            ) : (
              myInvoices.map((inv) => {
                const invPayments = payments
                  .filter((p) => p.invoiceId === inv.id)
                  .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                const balance = inv.totalAmount - inv.amountPaid
                return (
                  <Card key={inv.id} className="gap-3 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-mono text-sm font-bold">{inv.id}</p>
                        <p className="text-muted-foreground text-xs">
                          Issued {formatDate(inv.issuedDate)} · due {formatDate(inv.dueDate)}
                        </p>
                      </div>
                      <StatusBadge
                        label={inv.status}
                        variant={invoiceStatusStyle[inv.status].variant}
                        dot={invoiceStatusStyle[inv.status].dot}
                      />
                    </div>
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
                      <div className="space-y-1">
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
                  </Card>
                )
              })
            )}
          </div>
        </TabsContent>

        {/* ---------------- Prescriptions ---------------- */}
        <TabsContent value="prescriptions" className="pt-4">
          <Card className="gap-0 border-0 py-0 shadow-none">
            <div className="space-y-3">
              {myPrescriptions.length === 0 ? (
                <p className="text-muted-foreground py-10 text-center text-sm">
                  No prescriptions issued yet.
                </p>
              ) : (
                myPrescriptions.map((rx) => (
                  <div
                    key={rx.id}
                    className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
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
          </Card>
        </TabsContent>

        {/* ---------------- Profile ---------------- */}
        <TabsContent value="profile" className="pt-4">
          <Card className="max-w-lg gap-5 p-6">
            <CardHeader className="px-0">
              <div className="flex items-center gap-3">
                <div className="bg-primary flex size-12 items-center justify-center rounded-full">
                  <span className="text-lg font-bold text-white">
                    {initials(patient?.firstName ?? '', patient?.lastName ?? '')}
                  </span>
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {patient?.firstName} {patient?.lastName}
                  </CardTitle>
                  <CardDescription>{patient?.email}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <form onSubmit={handleProfileSave} className="grid gap-4">
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
                <Input
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                />
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
