import { useMemo, useState } from 'react'
import type { AppColumnDef } from '@/components/DataTable'
import {
  CalendarPlus,
  CheckCircle2,
  CircleSlash,
  ClipboardPlus,
  Eye,
  MoreHorizontal,
  Pencil,
  PlayCircle,
  Plus,
  Trash2,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { DataTable } from '@/components/DataTable'
import { PageHeader, StatusBadge } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { appointmentStatusStyle } from '@/lib/status'
import { useHospitalStore } from '@/store/hospitalStore'
import {
  AppointmentStatus,
  type Appointment,
  type PrescriptionItem,
} from '@/types'
import { formatTime, relativeDayLabel } from '@/lib/format'
import { fullName, useEntityMaps } from '@/lib/useEntities'
import { cn } from '@/lib/utils'

type AppointmentDraft = {
  patientId: string
  doctorId: string
  scheduledStart: string
  durationMin: number
  reasonForVisit: string
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function AppointmentFormDialog({
  open,
  onOpenChange,
  editing,
  defaultPatientId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: Appointment
  defaultPatientId?: string
}) {
  const { patients, doctors } = useEntityMaps()
  const addAppointment = useHospitalStore((s) => s.addAppointment)
  const updateAppointment = useHospitalStore((s) => s.updateAppointment)

  const [draft, setDraft] = useState<AppointmentDraft>({
    patientId: editing?.patientId ?? defaultPatientId ?? '',
    doctorId: editing?.doctorId ?? '',
    scheduledStart: editing
      ? toDatetimeLocal(editing.scheduledStart)
      : toDatetimeLocal(new Date(Date.now() + 60 * 60 * 1000).toISOString()),
    durationMin: 45,
    reasonForVisit: editing?.reasonForVisit ?? '',
  })

  const valid =
    draft.patientId && draft.doctorId && draft.scheduledStart && draft.reasonForVisit.trim()

  function handleSave() {
    if (!valid) return
    const scheduledStart = new Date(draft.scheduledStart).toISOString()
    const scheduledEnd = new Date(
      new Date(draft.scheduledStart).getTime() + draft.durationMin * 60_000,
    ).toISOString()

    if (editing) {
      updateAppointment(editing.id, {
        patientId: draft.patientId,
        doctorId: draft.doctorId,
        scheduledStart,
        scheduledEnd,
        reasonForVisit: draft.reasonForVisit.trim(),
      })
      toast.success(`Appointment ${editing.id} updated.`)
    } else {
      addAppointment({
        patientId: draft.patientId,
        doctorId: draft.doctorId,
        scheduledStart,
        scheduledEnd,
        status: AppointmentStatus.Pending,
        reasonForVisit: draft.reasonForVisit.trim(),
      })
      toast.success('Appointment booked. Status: Pending.')
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.id}` : 'Book new appointment'}</DialogTitle>
          <DialogDescription>
            Schedule a patient visit with a doctor.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="apt-patient">Patient</Label>
            <Select
              value={draft.patientId}
              onValueChange={(v) => setDraft((d) => ({ ...d, patientId: v }))}
            >
              <SelectTrigger id="apt-patient" className="w-full">
                <SelectValue placeholder="Select patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} · {p.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="apt-doctor">Doctor</Label>
            <Select
              value={draft.doctorId}
              onValueChange={(v) => setDraft((d) => ({ ...d, doctorId: v }))}
            >
              <SelectTrigger id="apt-doctor" className="w-full">
                <SelectValue placeholder="Select doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    {doc.firstName} {doc.lastName} · {doc.specialization}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="apt-start">Starts</Label>
              <Input
                id="apt-start"
                type="datetime-local"
                value={draft.scheduledStart}
                onChange={(e) => setDraft((d) => ({ ...d, scheduledStart: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="apt-duration">Duration (min)</Label>
              <Select
                value={String(draft.durationMin)}
                onValueChange={(v) => setDraft((d) => ({ ...d, durationMin: Number(v) }))}
              >
                <SelectTrigger id="apt-duration" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[15, 30, 45, 60, 90].map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m} minutes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="apt-reason">Reason for visit</Label>
            <Textarea
              id="apt-reason"
              value={draft.reasonForVisit}
              onChange={(e) => setDraft((d) => ({ ...d, reasonForVisit: e.target.value }))}
              placeholder="e.g. Persistent cough and mild fever"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!valid}>
            {editing ? 'Save changes' : 'Book appointment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface RxDraftItem {
  drugId: string
  quantity: number
  dosageInstructions: string
}

function ConsultationDialog({
  appointment,
  open,
  onOpenChange,
}: {
  appointment: Appointment | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { doctorById, patientById, drugs } = useEntityMaps()
  const completeConsultation = useHospitalStore((s) => s.completeConsultation)

  const [diagnosis, setDiagnosis] = useState('')
  const [treatmentPlan, setTreatmentPlan] = useState('')
  const [clinicalNotes, setClinicalNotes] = useState('')
  const [withRx, setWithRx] = useState(true)
  const [rxItems, setRxItems] = useState<RxDraftItem[]>([
    { drugId: '', quantity: 1, dosageInstructions: '' },
  ])

  const valid = diagnosis.trim() && treatmentPlan.trim() && clinicalNotes.trim()
  const rxValid = !withRx || rxItems.every((i) => i.drugId && i.quantity > 0)

  function handleComplete() {
    if (!appointment || !valid || !rxValid) return
    const rx = withRx
      ? {
          items: rxItems
            .filter((i) => i.drugId)
            .map(
              (i): PrescriptionItem => ({
                id: `draft-${i.drugId}-${i.quantity}`,
                drugId: i.drugId,
                quantity: i.quantity,
                dosageInstructions: i.dosageInstructions || 'As directed by physician.',
              }),
            ),
        }
      : undefined

    completeConsultation(appointment.id, appointment.doctorId, {
      diagnosis: diagnosis.trim(),
      treatmentPlan: treatmentPlan.trim(),
      clinicalNotes: clinicalNotes.trim(),
      prescription: rx,
    })
    toast.success(`Consultation completed for ${fullName(patientById, appointment.patientId)}.`)
    onOpenChange(false)
    setDiagnosis('')
    setTreatmentPlan('')
    setClinicalNotes('')
    setRxItems([{ drugId: '', quantity: 1, dosageInstructions: '' }])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Complete consultation</DialogTitle>
          <DialogDescription>
            {appointment
              ? `${fullName(patientById, appointment.patientId)} with ${fullName(doctorById, appointment.doctorId)}`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[55vh] gap-4 overflow-y-auto pr-1">
          <div className="grid gap-2">
            <Label htmlFor="cx-diagnosis">Diagnosis</Label>
            <Input
              id="cx-diagnosis"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. Acute sinusitis"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cx-plan">Treatment plan</Label>
            <Textarea
              id="cx-plan"
              value={treatmentPlan}
              onChange={(e) => setTreatmentPlan(e.target.value)}
              placeholder="Medications, follow-up, lifestyle advice…"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cx-notes">Clinical notes</Label>
            <Textarea
              id="cx-notes"
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Objective findings, vitals, observations…"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Issue prescription</p>
              <p className="text-muted-foreground text-xs">
                Forward to pharmacy for dispensing and billing
              </p>
            </div>
            <Button
              type="button"
              variant={withRx ? 'default' : 'outline'}
              size="sm"
              onClick={() => setWithRx((v) => !v)}
            >
              {withRx ? 'Enabled' : 'Disabled'}
            </Button>
          </div>

          {withRx && (
            <div className="space-y-3 rounded-lg border p-3">
              {rxItems.map((item, idx) => (
                <div key={idx} className="grid gap-2 sm:grid-cols-[1fr_80px_1fr_auto]">
                  <Select
                    value={item.drugId}
                    onValueChange={(v) =>
                      setRxItems((items) =>
                        items.map((it, i) => (i === idx ? { ...it, drugId: v } : it)),
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Drug" />
                    </SelectTrigger>
                    <SelectContent>
                      {drugs.map((drug) => (
                        <SelectItem key={drug.id} value={drug.id}>
                          {drug.name} ({drug.stockQuantity} in stock)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      setRxItems((items) =>
                        items.map((it, i) =>
                          i === idx ? { ...it, quantity: Number(e.target.value) } : it,
                        ),
                      )
                    }
                    placeholder="Qty"
                  />
                  <Input
                    value={item.dosageInstructions}
                    onChange={(e) =>
                      setRxItems((items) =>
                        items.map((it, i) =>
                          i === idx ? { ...it, dosageInstructions: e.target.value } : it,
                        ),
                      )
                    }
                    placeholder="Dosage instructions"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setRxItems((items) => items.filter((_, i) => i !== idx))}
                    disabled={rxItems.length === 1}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setRxItems((items) => [
                    ...items,
                    { drugId: '', quantity: 1, dosageInstructions: '' },
                  ])
                }
              >
                <Plus /> Add item
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleComplete} disabled={!valid || !rxValid}>
            <CheckCircle2 /> Complete & record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function Appointments() {
  const appointments = useHospitalStore((s) => s.appointments)
  const setAppointmentStatus = useHospitalStore((s) => s.setAppointmentStatus)
  const deleteAppointment = useHospitalStore((s) => s.deleteAppointment)
  const medicalRecords = useHospitalStore((s) => s.medicalRecords)

  const { patientById, doctorById } = useEntityMaps()

  const [statusFilter, setStatusFilter] = useState<'All' | AppointmentStatus>('All')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Appointment | undefined>(undefined)
  const [consulting, setConsulting] = useState<Appointment | null>(null)

  const filtered = useMemo(
    () =>
      statusFilter === 'All'
        ? appointments
        : appointments.filter((a) => a.status === statusFilter),
    [appointments, statusFilter],
  )

  const columns = useMemo<AppColumnDef<Appointment>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-teal-700">{row.original.id}</span>
        ),
      },
      {
        accessorKey: 'patientId',
        header: 'Patient',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{fullName(patientById, row.original.patientId)}</p>
            <p className="text-muted-foreground text-xs">{row.original.patientId}</p>
          </div>
        ),
      },
      {
        accessorKey: 'doctorId',
        header: 'Doctor',
        cell: ({ row }) => (
          <div>
            <p>{fullName(doctorById, row.original.doctorId)}</p>
            <p className="text-muted-foreground text-xs">
              {doctorById.get(row.original.doctorId)?.specialization}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'scheduledStart',
        header: 'When',
        sortFn: 'datetime',
        cell: ({ row }) => (
          <div>
            <p>{relativeDayLabel(row.original.scheduledStart)}</p>
            <p className="text-muted-foreground text-xs">
              {formatTime(row.original.scheduledStart)} – {formatTime(row.original.scheduledEnd)}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'reasonForVisit',
        header: 'Reason',
        cell: ({ row }) => (
          <span className="text-muted-foreground block max-w-48 truncate">
            {row.original.reasonForVisit}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <StatusBadge
            label={row.original.status}
            variant={appointmentStatusStyle[row.original.status].variant}
            dot={appointmentStatusStyle[row.original.status].dot}
          />
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const a = row.original
          return (
            <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {a.status === AppointmentStatus.Pending && (
                    <DropdownMenuItem
                      onClick={() => {
                        setAppointmentStatus(a.id, AppointmentStatus.Confirmed)
                        toast.success(`${a.id} confirmed.`)
                      }}
                    >
                      <CheckCircle2 /> Confirm booking
                    </DropdownMenuItem>
                  )}
                  {a.status === AppointmentStatus.Confirmed && (
                    <DropdownMenuItem
                      onClick={() => {
                        setAppointmentStatus(a.id, AppointmentStatus.InProgress)
                        toast.success(`${a.id} started — patient in consultation.`)
                      }}
                    >
                      <PlayCircle /> Start consultation
                    </DropdownMenuItem>
                  )}
                  {a.status === AppointmentStatus.InProgress && (
                    <DropdownMenuItem onClick={() => setConsulting(a)}>
                      <ClipboardPlus /> Complete consultation
                    </DropdownMenuItem>
                  )}
                  {(a.status === AppointmentStatus.Confirmed ||
                    a.status === AppointmentStatus.InProgress) && (
                    <DropdownMenuItem
                      onClick={() => {
                        setAppointmentStatus(a.id, AppointmentStatus.NoShow)
                        toast.info(`${a.id} marked as no-show.`)
                      }}
                    >
                      <CircleSlash /> Mark no-show
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => {
                      setEditing(a)
                      setFormOpen(true)
                    }}
                  >
                    <Pencil /> Edit
                  </DropdownMenuItem>
                  {(a.status === AppointmentStatus.Pending ||
                    a.status === AppointmentStatus.Confirmed) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => {
                          setAppointmentStatus(a.id, AppointmentStatus.Cancelled)
                          toast.info(`${a.id} cancelled.`)
                        }}
                      >
                        <XCircle /> Cancel booking
                      </DropdownMenuItem>
                    </>
                  )}
                  {(a.status === AppointmentStatus.Cancelled ||
                    a.status === AppointmentStatus.NoShow) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => {
                          deleteAppointment(a.id)
                          toast.success(`${a.id} deleted.`)
                        }}
                      >
                        <Trash2 /> Delete
                      </DropdownMenuItem>
                    </>
                  )}
                  {a.medicalRecordId && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() =>
                          toast.info(`Medical record ${a.medicalRecordId} is linked — view it in Medical Records.`)
                        }
                      >
                        <Eye /> View medical record
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [patientById, doctorById, medicalRecords, setAppointmentStatus, deleteAppointment],
  )

  const statusTabs: ('All' | AppointmentStatus)[] = [
    'All',
    AppointmentStatus.Pending,
    AppointmentStatus.Confirmed,
    AppointmentStatus.InProgress,
    AppointmentStatus.Completed,
    AppointmentStatus.Cancelled,
    AppointmentStatus.NoShow,
  ]

  const counts = useMemo(() => {
    const map = new Map<string, number>([['All', appointments.length]])
    for (const a of appointments) map.set(a.status, (map.get(a.status) ?? 0) + 1)
    return map
  }, [appointments])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        description="Book, confirm, and run the full consultation lifecycle."
      >
        <Button
          onClick={() => {
            setEditing(undefined)
            setFormOpen(true)
          }}
        >
          <CalendarPlus /> Book appointment
        </Button>
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
              statusFilter === tab
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
            )}
          >
            {tab} <span className="opacity-60">({counts.get(tab) ?? 0})</span>
          </button>
        ))}
      </div>

      <Card className="gap-0 border-0 py-0 shadow-none">
        <DataTable
          columns={columns}
          data={filtered}
          getRowId={(a) => a.id}
          searchPlaceholder="Search patient, doctor or reason…"
          globalFilter={(a, term) =>
            fullName(patientById, a.patientId).toLowerCase().includes(term) ||
            fullName(doctorById, a.doctorId).toLowerCase().includes(term) ||
            a.reasonForVisit.toLowerCase().includes(term) ||
            a.id.toLowerCase().includes(term)
          }
          emptyMessage="No appointments match this filter."
        />
      </Card>

      <AppointmentFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(undefined)
        }}
        editing={editing}
      />

      <ConsultationDialog
        appointment={consulting}
        open={consulting !== null}
        onOpenChange={(open) => {
          if (!open) setConsulting(null)
        }}
      />
    </div>
  )
}
