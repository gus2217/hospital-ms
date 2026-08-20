import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  BedDouble,
  CalendarDays,
  Clock3,
  Eye,
  FileText,
  FlaskConical,
  Phone,
  Pill,
  Receipt,
  Search,
  Stethoscope,
  UserRound,
  Users,
} from 'lucide-react'
import { PageHeader, StatusBadge } from '@/components/PageHeader'
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
import { Separator } from '@/components/ui/separator'
import { useHospitalStore } from '@/store/hospitalStore'
import {
  admissionStatusStyle,
  appointmentStatusStyle,
  invoiceStatusStyle,
  labTestStatusStyle,
  prescriptionStatusStyle,
} from '@/lib/status'
import { AppointmentStatus, type MedicalRecord } from '@/types'
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

function ageFrom(dob: string): number {
  const d = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1
  return age
}

const STATUS_ACCENTS: Record<AppointmentStatus, string> = {
  [AppointmentStatus.Pending]: 'border-l-amber-400',
  [AppointmentStatus.Confirmed]: 'border-l-sky-400',
  [AppointmentStatus.InProgress]: 'border-l-violet-400',
  [AppointmentStatus.Completed]: 'border-l-emerald-400',
  [AppointmentStatus.Cancelled]: 'border-l-slate-300',
  [AppointmentStatus.NoShow]: 'border-l-red-400',
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

export default function Patient360() {
  const patients = useHospitalStore((s) => s.patients)
  const appointments = useHospitalStore((s) => s.appointments)
  const medicalRecords = useHospitalStore((s) => s.medicalRecords)
  const prescriptions = useHospitalStore((s) => s.prescriptions)
  const labTests = useHospitalStore((s) => s.labTests)
  const admissions = useHospitalStore((s) => s.admissions)
  const wards = useHospitalStore((s) => s.wards)
  const invoices = useHospitalStore((s) => s.invoices)
  const payments = useHospitalStore((s) => s.payments)

  const { doctorById, drugById } = useEntityMaps()

  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [viewingRecord, setViewingRecord] = useState<MedicalRecord | null>(null)

  const results = useMemo(() => {
    const q = query.trim()
    if (!q) return patients.slice(0, 10)
    const nameQ = q.toLowerCase()
    const digitsQ = q.replace(/\D/g, '')
    return patients
      .filter((p) => {
        const name = `${p.firstName} ${p.lastName}`.toLowerCase()
        const phone = (p.phoneNumber ?? '').replace(/\D/g, '')
        return (
          name.includes(nameQ) ||
          p.id.toLowerCase().includes(nameQ) ||
          (digitsQ.length > 0 && phone.includes(digitsQ))
        )
      })
      .slice(0, 10)
  }, [patients, query])

  const patient = patients.find((p) => p.id === selectedId)

  const data = useMemo(() => {
    if (!selectedId) return null
    const pAppts = appointments
      .filter((a) => a.patientId === selectedId)
      .sort(
        (a, b) =>
          new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime(),
      )
    const pRecords = medicalRecords
      .filter((r) => r.patientId === selectedId)
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
    const recordIds = new Set(pRecords.map((r) => r.id))
    const pRx = prescriptions.filter((p) => recordIds.has(p.medicalRecordId))
    const pLab = labTests
      .filter((t) => t.patientId === selectedId)
      .sort((a, b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime())
    const pAdmissions = admissions
      .filter((a) => a.patientId === selectedId)
      .sort((a, b) => new Date(b.admittedAt).getTime() - new Date(a.admittedAt).getTime())
    const pInvoices = invoices
      .filter((i) => i.patientId === selectedId)
      .sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime())
    const outstanding = pInvoices.reduce((s, i) => s + (i.totalAmount - i.amountPaid), 0)
    const upcoming = pAppts.filter(
      (a) =>
        a.status !== AppointmentStatus.Completed &&
        a.status !== AppointmentStatus.Cancelled &&
        a.status !== AppointmentStatus.NoShow,
    )
    return {
      pAppts,
      pRecords,
      pRx,
      pLab,
      pAdmissions,
      pInvoices,
      outstanding,
      upcoming,
      next: upcoming[0],
    }
  }, [selectedId, appointments, medicalRecords, prescriptions, labTests, admissions, invoices])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient 360"
        description="Select a patient or search by name / phone number for their complete record."
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_1fr]">
        {/* ---------- Search / picker ---------- */}
        <Card className="h-fit gap-3 p-4 xl:sticky xl:top-20">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, ID or phone number…"
              className="pl-9"
              autoFocus
            />
          </div>
          <p className="text-muted-foreground text-xs">
            {results.length} of {patients.length} patient(s)
          </p>
          <div className="max-h-[26rem] space-y-1.5 overflow-y-auto pr-1">
            {results.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                No patients match “{query}”.
              </p>
            ) : (
              results.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                    selectedId === p.id
                      ? 'border-primary bg-accent/60 shadow-sm'
                      : 'hover:bg-accent/40',
                  )}
                >
                  <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold">
                    {initials(p.firstName, p.lastName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {p.firstName} {p.lastName}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {p.id} · {p.phoneNumber ?? 'no phone'}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* ---------- Detail ---------- */}
        {!patient || !data ? (
          <Card className="gap-0 border-0 py-20 shadow-none">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="bg-primary/10 text-primary flex size-16 items-center justify-center rounded-2xl">
                <Users className="size-8" />
              </div>
              <div>
                <p className="text-lg font-semibold">Select a patient to begin</p>
                <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                  Search by name, patient ID or phone number — then explore their full 360° record:
                  appointments, consultations, prescriptions, lab results, admissions and billing.
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Identity header */}
            <Card className="gap-4 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="bg-primary flex size-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white">
                  {initials(patient.firstName, patient.lastName)}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold tracking-tight">
                      {patient.firstName} {patient.lastName}
                    </h2>
                    <Badge variant="outline" className="font-mono">
                      {patient.patientNumber}
                    </Badge>
                    <Badge variant="secondary" className="font-mono">
                      {patient.id}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <span>{ageFrom(patient.dateOfBirth)} years · {patient.gender} · {formatDate(patient.dateOfBirth)}</span>
                    <span className="flex items-center gap-1">
                      <Phone className="size-3" /> {patient.phoneNumber ?? '—'}
                    </span>
                    <span>{patient.email}</span>
                    <span>
                      {patient.idType} · {patient.idNumber}
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-1 text-xs">
                    Next of kin:{' '}
                    <span className="font-medium">
                      {patient.nextOfKinName} ({patient.nextOfKinRelationship}) · {patient.nextOfKinPhone}
                    </span>
                    {patient.shaLicenseNumber && (
                      <span className="ml-3">SHA: <span className="font-medium">{patient.shaLicenseNumber}</span></span>
                    )}
                    {patient.insurancePolicyNumber && (
                      <span className="ml-3">Cover: <span className="font-medium">{patient.insurancePolicyNumber}</span></span>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {patient.allergies && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="size-3" /> {patient.allergies}
                      </Badge>
                    )}
                    {patient.chronicIllnesses?.map((c) => (
                      <Badge key={c} variant="warning">{c}</Badge>
                    ))}
                    {patient.disability && (
                      <Badge variant="secondary">{patient.disability}</Badge>
                    )}
                    <Badge variant={patient.consentToTreat ? 'success' : 'destructive'}>
                      {patient.consentToTreat ? 'Treatment consent ✓' : 'No treatment consent'}
                    </Badge>
                    <Badge variant={patient.consentToShare ? 'success' : 'slate'}>
                      {patient.consentToShare ? 'Info sharing ✓' : 'No info sharing'}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
                  <div className="rounded-lg bg-muted/50 px-3 py-2 text-center">
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wide">Upcoming</p>
                    <p className="text-lg font-bold">{data.upcoming.length}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 px-3 py-2 text-center">
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wide">Balance</p>
                    <p className="text-lg font-bold text-red-600">
                      {formatCurrency(data.outstanding)}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Stat chips */}
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
              {(
                [
                  ['Appointments', data.pAppts.length, CalendarDays, 'text-sky-600 bg-sky-50'],
                  ['Records', data.pRecords.length, FileText, 'text-violet-600 bg-violet-50'],
                  ['Prescriptions', data.pRx.length, Pill, 'text-emerald-600 bg-emerald-50'],
                  ['Lab tests', data.pLab.length, FlaskConical, 'text-amber-600 bg-amber-50'],
                  ['Admissions', data.pAdmissions.length, BedDouble, 'text-rose-600 bg-rose-50'],
                  ['Invoices', data.pInvoices.length, Receipt, 'text-teal-600 bg-teal-50'],
                ] as const
              ).map(([label, value, Icon, accent]) => (
                <Card key={label} className="gap-2 py-4">
                  <CardContent className="flex items-center justify-between px-4">
                    <div>
                      <p className="text-muted-foreground text-xs">{label}</p>
                      <p className="mt-0.5 text-xl font-bold">{value}</p>
                    </div>
                    <div className={cn('rounded-lg p-2', accent)}>
                      <Icon className="size-4" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Tabs defaultValue="overview">
              <TabsList className="flex-wrap">
                <TabsTrigger value="overview">
                  <UserRound /> Overview
                </TabsTrigger>
                <TabsTrigger value="appointments">
                  <CalendarDays /> Appointments
                </TabsTrigger>
                <TabsTrigger value="records">
                  <FileText /> Records
                </TabsTrigger>
                <TabsTrigger value="prescriptions">
                  <Pill /> Prescriptions
                </TabsTrigger>
                <TabsTrigger value="lab">
                  <FlaskConical /> Laboratory
                </TabsTrigger>
                <TabsTrigger value="admissions">
                  <BedDouble /> Admissions
                </TabsTrigger>
                <TabsTrigger value="billing">
                  <Receipt /> Billing
                </TabsTrigger>
              </TabsList>

              {/* -------- Overview -------- */}
              <TabsContent value="overview" className="pt-4">
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <Card className="gap-0 overflow-hidden py-0">
                    <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-3">
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        <Stethoscope className="text-primary size-4" /> Next appointment
                      </p>
                      {data.next && (
                        <Badge variant="outline" className="font-normal">
                          {relativeDayLabel(data.next.scheduledStart)}
                        </Badge>
                      )}
                    </div>
                    <div className="p-5">
                      {data.next ? (
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-xl">
                            <CalendarDays className="size-6" />
                          </div>
                          <div>
                            <p className="font-semibold">
                              Dr. {fullName(doctorById, data.next.doctorId)}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {relativeDayLabel(data.next.scheduledStart)} at{' '}
                              {formatTime(data.next.scheduledStart)} · {data.next.reasonForVisit}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground py-4 text-center text-sm">
                          No upcoming appointments.
                        </p>
                      )}
                    </div>
                  </Card>

                  <Card className="gap-3 p-5">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <Receipt className="text-amber-500 size-4" /> Billing snapshot
                    </p>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total invoiced</span>
                        <span className="font-semibold">
                          {formatCurrency(
                            data.pInvoices.reduce((s, i) => s + i.totalAmount, 0),
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-emerald-600">
                        <span>Paid</span>
                        <span>
                          {formatCurrency(
                            data.pInvoices.reduce((s, i) => s + i.amountPaid, 0),
                          )}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold">
                        <span>Outstanding</span>
                        <span className={data.outstanding > 0 ? 'text-red-600' : ''}>
                          {formatCurrency(data.outstanding)}
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <Card className="gap-3 p-5">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <FileText className="text-sky-500 size-4" /> Recent records
                    </p>
                    <div className="space-y-2">
                      {data.pRecords.length === 0 ? (
                        <p className="text-muted-foreground py-4 text-center text-sm">
                          No records yet.
                        </p>
                      ) : (
                        data.pRecords.slice(0, 3).map((r) => (
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

                  <Card className="gap-3 p-5">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <FlaskConical className="text-amber-500 size-4" /> Latest lab results
                    </p>
                    <div className="space-y-2">
                      {data.pLab.length === 0 ? (
                        <p className="text-muted-foreground py-4 text-center text-sm">
                          No lab tests on file.
                        </p>
                      ) : (
                        data.pLab.slice(0, 3).map((t) => (
                          <div key={t.id} className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                            <div>
                              <p className="text-sm font-medium">{t.testName}</p>
                              <p className="text-muted-foreground text-xs">
                                {formatDate(t.orderedAt)} · {t.testCategory}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {t.isAbnormal && (
                                <Badge variant="destructive">Abnormal</Badge>
                              )}
                              <StatusBadge
                                label={t.status}
                                variant={labTestStatusStyle[t.status].variant}
                                dot={labTestStatusStyle[t.status].dot}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                </div>
              </TabsContent>

              {/* -------- Appointments -------- */}
              <TabsContent value="appointments" className="pt-4">
                <div className="space-y-3">
                  {data.pAppts.length === 0 ? (
                    <p className="text-muted-foreground py-10 text-center text-sm">
                      No appointments for this patient.
                    </p>
                  ) : (
                    data.pAppts.map((a) => (
                      <div
                        key={a.id}
                        className={cn(
                          'flex flex-col gap-2 rounded-xl border border-l-4 bg-card p-4 shadow-sm sm:flex-row sm:items-center',
                          STATUS_ACCENTS[a.status],
                        )}
                      >
                        <div className="flex-1">
                          <p className="font-semibold">
                            Dr. {fullName(doctorById, a.doctorId)}
                            <span className="text-muted-foreground text-xs font-normal">
                              {' '}
                              · {doctorById.get(a.doctorId)?.specialization}
                            </span>
                          </p>
                          <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                            <Clock3 className="size-3.5" />
                            {relativeDayLabel(a.scheduledStart)} · {formatTime(a.scheduledStart)}–
                            {formatTime(a.scheduledEnd)} · {a.id}
                          </p>
                          <p className="text-muted-foreground mt-1 text-xs">{a.reasonForVisit}</p>
                        </div>
                        <StatusBadge
                          label={a.status}
                          variant={appointmentStatusStyle[a.status].variant}
                          dot={appointmentStatusStyle[a.status].dot}
                        />
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* -------- Records -------- */}
              <TabsContent value="records" className="pt-4">
                <div className="space-y-3">
                  {data.pRecords.length === 0 ? (
                    <p className="text-muted-foreground py-10 text-center text-sm">
                      No medical records for this patient.
                    </p>
                  ) : (
                    data.pRecords.map((r) => (
                      <div
                        key={r.id}
                        className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center"
                      >
                        <div className="bg-sky-50 text-sky-600 flex size-10 shrink-0 items-center justify-center rounded-lg">
                          <FileText className="size-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{r.diagnosis}</p>
                          <p className="text-muted-foreground text-xs">
                            Dr. {fullName(doctorById, r.doctorId)} · {formatDateTime(r.recordedAt)} · v{r.version}
                            {r.consultationFee && (
                              <span className="ml-2 font-medium">
                                · {formatCurrency(r.consultationFee)}
                              </span>
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

              {/* -------- Prescriptions -------- */}
              <TabsContent value="prescriptions" className="pt-4">
                <div className="space-y-3">
                  {data.pRx.length === 0 ? (
                    <p className="text-muted-foreground py-10 text-center text-sm">
                      No prescriptions for this patient.
                    </p>
                  ) : (
                    data.pRx.map((rx) => (
                      <div
                        key={rx.id}
                        className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center"
                      >
                        <div className="bg-emerald-50 text-emerald-600 flex size-10 shrink-0 items-center justify-center rounded-lg">
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
                          <ul className="text-muted-foreground mt-1 space-y-0.5 text-xs">
                            {rx.items.map((item) => (
                              <li key={item.id}>
                                {drugById.get(item.drugId)?.name ?? item.drugId} × {item.quantity} —{' '}
                                {item.dosageInstructions}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* -------- Lab -------- */}
              <TabsContent value="lab" className="pt-4">
                <div className="space-y-3">
                  {data.pLab.length === 0 ? (
                    <p className="text-muted-foreground py-10 text-center text-sm">
                      No lab tests for this patient.
                    </p>
                  ) : (
                    data.pLab.map((t) => (
                      <div
                        key={t.id}
                        className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center"
                      >
                        <div className="bg-amber-50 text-amber-600 flex size-10 shrink-0 items-center justify-center rounded-lg">
                          <FlaskConical className="size-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{t.testName}</p>
                            {t.isAbnormal && <Badge variant="destructive">Abnormal</Badge>}
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {t.testCategory} · ordered {formatDateTime(t.orderedAt)}
                            {t.completedAt && <> · completed {formatDateTime(t.completedAt)}</>}
                          </p>
                          {t.result && (
                            <p className="mt-1 rounded-lg bg-muted/50 px-3 py-2 text-xs">
                              {t.result}
                            </p>
                          )}
                        </div>
                        <StatusBadge
                          label={t.status}
                          variant={labTestStatusStyle[t.status].variant}
                          dot={labTestStatusStyle[t.status].dot}
                        />
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* -------- Admissions -------- */}
              <TabsContent value="admissions" className="pt-4">
                <div className="space-y-3">
                  {data.pAdmissions.length === 0 ? (
                    <p className="text-muted-foreground py-10 text-center text-sm">
                      No admissions for this patient.
                    </p>
                  ) : (
                    data.pAdmissions.map((ad) => {
                      const ward = wards.find((w) => w.id === ad.wardId)
                      return (
                        <div
                          key={ad.id}
                          className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center"
                        >
                          <div className="bg-rose-50 text-rose-600 flex size-10 shrink-0 items-center justify-center rounded-lg">
                            <BedDouble className="size-5" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold">
                              {ward?.name ?? ad.wardId} · Bed {ad.bedNumber}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              Admitted {formatDateTime(ad.admittedAt)}
                              {ad.expectedDischargeDate && (
                                <> · expected discharge {formatDate(ad.expectedDischargeDate)}</>
                              )}
                              {ad.actualDischargeDate && (
                                <> · discharged {formatDate(ad.actualDischargeDate)}</>
                              )}
                            </p>
                            <p className="text-muted-foreground mt-1 text-xs">{ad.diagnosis}</p>
                          </div>
                          <StatusBadge
                            label={ad.status}
                            variant={admissionStatusStyle[ad.status].variant}
                            dot={admissionStatusStyle[ad.status].dot}
                          />
                        </div>
                      )
                    })
                  )}
                </div>
              </TabsContent>

              {/* -------- Billing -------- */}
              <TabsContent value="billing" className="pt-4">
                <div className="space-y-4">
                  {data.pInvoices.length === 0 ? (
                    <p className="text-muted-foreground py-10 text-center text-sm">
                      No invoices for this patient.
                    </p>
                  ) : (
                    data.pInvoices.map((inv) => {
                      const invPayments = payments
                        .filter((p) => p.invoiceId === inv.id)
                        .sort(
                          (a, b) =>
                            new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime(),
                        )
                      const balance = inv.totalAmount - inv.amountPaid
                      return (
                        <Card key={inv.id} className="gap-4 overflow-hidden p-0">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="bg-amber-50 text-amber-600 flex size-8 items-center justify-center rounded-lg">
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
                          <div className="px-5 pb-4">
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
                              <div className="mt-3 space-y-1">
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
            </Tabs>
          </div>
        )}
      </div>

      <RecordDetailDialog
        record={viewingRecord}
        open={viewingRecord !== null}
        onOpenChange={() => setViewingRecord(null)}
      />
    </div>
  )
}
