import { useMemo, useState } from 'react'
import type { AppColumnDef } from '@/components/DataTable'
import { Eye, MoreHorizontal, Pencil, Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable } from '@/components/DataTable'
import { PageHeader, StatusBadge } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useHospitalStore } from '@/store/hospitalStore'
import type { Patient } from '@/types'
import { formatCurrency, formatDate, hashHue, initials } from '@/lib/format'
import {
  fullName,
  invoicesForPatient,
  recordsForPatient,
  useEntityMaps,
} from '@/lib/useEntities'
import { appointmentStatusStyle, invoiceStatusStyle } from '@/lib/status'
import { AppointmentStatus } from '@/types'

interface PatientDraft {
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  dateOfBirth: string
  emergencyContact: string
  insurancePolicyNumber: string
}

const emptyDraft: PatientDraft = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  dateOfBirth: '',
  emergencyContact: '',
  insurancePolicyNumber: '',
}

function ageFrom(dob: string): number {
  if (!dob) return 0
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (365.25 * 86_400_000))
}

function PatientFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: Patient
}) {
  const addPatient = useHospitalStore((s) => s.addPatient)
  const updatePatient = useHospitalStore((s) => s.updatePatient)

  const [draft, setDraft] = useState<PatientDraft>(
    editing
      ? {
          firstName: editing.firstName,
          lastName: editing.lastName,
          email: editing.email,
          phoneNumber: editing.phoneNumber ?? '',
          dateOfBirth: editing.dateOfBirth,
          emergencyContact: editing.emergencyContact,
          insurancePolicyNumber: editing.insurancePolicyNumber ?? '',
        }
      : emptyDraft,
  )

  const valid = draft.firstName.trim() && draft.lastName.trim() && draft.email.trim()

  function handleSave() {
    if (!valid) return
    if (editing) {
      updatePatient(editing.id, {
        ...draft,
        phoneNumber: draft.phoneNumber || undefined,
        insurancePolicyNumber: draft.insurancePolicyNumber || undefined,
      })
      toast.success(`Patient ${editing.id} updated.`)
    } else {
      const p = addPatient({
        ...draft,
        phoneNumber: draft.phoneNumber || undefined,
        insurancePolicyNumber: draft.insurancePolicyNumber || undefined,
      })
      toast.success(`Patient ${p.id} registered.`)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.id}` : 'Register new patient'}</DialogTitle>
          <DialogDescription>Patient demographics and contact details.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>First name</Label>
            <Input
              value={draft.firstName}
              onChange={(e) => setDraft((d) => ({ ...d, firstName: e.target.value }))}
              placeholder="Amina"
            />
          </div>
          <div className="grid gap-2">
            <Label>Last name</Label>
            <Input
              value={draft.lastName}
              onChange={(e) => setDraft((d) => ({ ...d, lastName: e.target.value }))}
              placeholder="Wanjiru"
            />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={draft.email}
              onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
              placeholder="patient@example.com"
            />
          </div>
          <div className="grid gap-2">
            <Label>Phone</Label>
            <Input
              value={draft.phoneNumber}
              onChange={(e) => setDraft((d) => ({ ...d, phoneNumber: e.target.value }))}
              placeholder="+2547…"
            />
          </div>
          <div className="grid gap-2">
            <Label>Date of birth</Label>
            <Input
              type="date"
              value={draft.dateOfBirth}
              onChange={(e) => setDraft((d) => ({ ...d, dateOfBirth: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Emergency contact</Label>
            <Input
              value={draft.emergencyContact}
              onChange={(e) => setDraft((d) => ({ ...d, emergencyContact: e.target.value }))}
              placeholder="+2547…"
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Insurance policy number</Label>
            <Input
              value={draft.insurancePolicyNumber}
              onChange={(e) =>
                setDraft((d) => ({ ...d, insurancePolicyNumber: e.target.value }))
              }
              placeholder="NHIF-000000"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!valid}>
            {editing ? 'Save changes' : 'Register patient'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PatientDetailDialog({
  patient,
  open,
  onOpenChange,
}: {
  patient: Patient | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { appointments, medicalRecords, invoices, doctorById } = useEntityMaps()

  if (!patient) return null

  const records = recordsForPatient(medicalRecords, patient.id)
  const patientInvoices = invoicesForPatient(invoices, patient.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar className="size-12">
              <AvatarFallback
                className="text-sm"
                style={{
                  backgroundColor: `hsl(${hashHue(patient.id)} 70% 92%)`,
                  color: `hsl(${hashHue(patient.id)} 60% 30%)`,
                }}
              >
                {initials(patient.firstName, patient.lastName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-xl">
                {patient.firstName} {patient.lastName}
              </DialogTitle>
              <DialogDescription>
                {patient.id} · {ageFrom(patient.dateOfBirth)} yrs ·{' '}
                {formatDate(patient.dateOfBirth)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid max-h-[55vh] gap-5 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Email</p>
              <p className="font-medium">{patient.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Phone</p>
              <p className="font-medium">{patient.phoneNumber ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Emergency contact</p>
              <p className="font-medium">{patient.emergencyContact ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Insurance</p>
              {patient.insurancePolicyNumber ? (
                <Badge variant="info">{patient.insurancePolicyNumber}</Badge>
              ) : (
                <p className="font-medium">Self-pay</p>
              )}
            </div>
          </div>

          <Separator />

          <div>
            <p className="mb-2 text-sm font-semibold">Medical history ({records.length})</p>
            {records.length === 0 ? (
              <p className="text-muted-foreground text-sm">No medical records yet.</p>
            ) : (
              <div className="space-y-2">
                {records.map((r) => (
                  <div key={r.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{r.diagnosis}</p>
                      <Badge variant="slate">v{r.version}</Badge>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {fullName(doctorById, r.doctorId)} · {formatDate(r.recordedAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">Billing ({patientInvoices.length})</p>
            {patientInvoices.length === 0 ? (
              <p className="text-muted-foreground text-sm">No invoices yet.</p>
            ) : (
              <div className="space-y-2">
                {patientInvoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <div>
                      <p className="font-mono text-xs font-semibold">{inv.id}</p>
                      <p className="text-muted-foreground text-xs">{formatDate(inv.issuedDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(inv.totalAmount)}</p>
                      <StatusBadge
                        label={inv.status}
                        variant={invoiceStatusStyle[inv.status].variant}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">Upcoming appointments</p>
            {appointments
              .filter(
                (a) =>
                  a.patientId === patient.id &&
                  a.status !== AppointmentStatus.Cancelled &&
                  a.status !== AppointmentStatus.Completed &&
                  a.status !== AppointmentStatus.NoShow,
              )
              .slice(0, 3)
              .map((a) => (
                <div key={a.id} className="mb-2 flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-medium">{fullName(doctorById, a.doctorId)}</p>
                    <p className="text-muted-foreground text-xs">{formatDate(a.scheduledStart)}</p>
                  </div>
                  <StatusBadge
                    label={a.status}
                    variant={appointmentStatusStyle[a.status].variant}
                    dot={appointmentStatusStyle[a.status].dot}
                  />
                </div>
              ))}
            {appointments.filter((a) => a.patientId === patient.id).length === 0 && (
              <p className="text-muted-foreground text-sm">No appointments on record.</p>
            )}
          </div>
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

export default function Patients() {
  const patients = useHospitalStore((s) => s.patients)
  const deletePatient = useHospitalStore((s) => s.deletePatient)
  const appointments = useHospitalStore((s) => s.appointments)
  const invoices = useHospitalStore((s) => s.invoices)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Patient | undefined>(undefined)
  const [viewing, setViewing] = useState<Patient | null>(null)

  const columns = useMemo<AppColumnDef<Patient>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-teal-700">{row.original.id}</span>
        ),
      },
      {
        accessorKey: 'firstName',
        header: 'Patient',
        cell: ({ row }) => {
          const p = row.original
          return (
            <div className="flex items-center gap-3">
              <Avatar className="size-8">
                <AvatarFallback
                  className="text-[10px]"
                  style={{
                    backgroundColor: `hsl(${hashHue(p.id)} 70% 92%)`,
                    color: `hsl(${hashHue(p.id)} 60% 30%)`,
                  }}
                >
                  {initials(p.firstName, p.lastName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {p.firstName} {p.lastName}
                </p>
                <p className="text-muted-foreground text-xs">{p.email}</p>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'phoneNumber',
        header: 'Phone',
        cell: ({ row }) => row.original.phoneNumber ?? '—',
      },
      {
        accessorKey: 'dateOfBirth',
        header: 'Age',
        cell: ({ row }) => (
          <div>
            <p>{ageFrom(row.original.dateOfBirth)} yrs</p>
            <p className="text-muted-foreground text-xs">{formatDate(row.original.dateOfBirth)}</p>
          </div>
        ),
      },
      {
        accessorKey: 'insurancePolicyNumber',
        header: 'Insurance',
        cell: ({ row }) =>
          row.original.insurancePolicyNumber ? (
            <Badge variant="info">{row.original.insurancePolicyNumber}</Badge>
          ) : (
            <Badge variant="slate">Self-pay</Badge>
          ),
      },
      {
        id: 'appointments',
        header: 'Visits',
        cell: ({ row }) => {
          const count = appointments.filter((a) => a.patientId === row.original.id).length
          return <Badge variant="secondary">{count} appointment{count === 1 ? '' : 's'}</Badge>
        },
      },
      {
        id: 'outstanding',
        header: 'Outstanding',
        cell: ({ row }) => {
          const total = invoices
            .filter((i) => i.patientId === row.original.id)
            .reduce((sum, i) => sum + (i.totalAmount - i.amountPaid), 0)
          return total > 0 ? (
            <span className="font-semibold text-red-600">{formatCurrency(total)}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setViewing(row.original)}>
                  <Eye /> View profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setEditing(row.original)
                    setFormOpen(true)
                  }}
                >
                  <Pencil /> Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    deletePatient(row.original.id)
                    toast.success(`${row.original.firstName} ${row.original.lastName} removed.`)
                  }}
                >
                  <Trash2 /> Delete patient
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [appointments, invoices, deletePatient],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        description="Patient registry with full demographic, insurance and visit data."
      >
        <Button
          onClick={() => {
            setEditing(undefined)
            setFormOpen(true)
          }}
        >
          <UserPlus /> Register patient
        </Button>
      </PageHeader>

      <Card className="gap-0 border-0 py-0 shadow-none">
        <DataTable
          columns={columns}
          data={patients}
          getRowId={(p) => p.id}
          searchPlaceholder="Search name, email, phone or ID…"
          globalFilter={(p, term) =>
            `${p.firstName} ${p.lastName}`.toLowerCase().includes(term) ||
            p.email.toLowerCase().includes(term) ||
            (p.phoneNumber ?? '').toLowerCase().includes(term) ||
            p.id.toLowerCase().includes(term) ||
            (p.insurancePolicyNumber ?? '').toLowerCase().includes(term)
          }
          onRowClick={(p) => setViewing(p)}
          emptyMessage="No patients found."
        />
      </Card>

      <PatientFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(undefined)
        }}
        editing={editing}
      />

      <PatientDetailDialog patient={viewing} open={viewing !== null} onOpenChange={() => setViewing(null)} />
    </div>
  )
}
