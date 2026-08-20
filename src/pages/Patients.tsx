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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useHospitalStore } from '@/store/hospitalStore'
import type { Patient, PatientGender, PatientIdType } from '@/types'
import { formatCurrency, formatDate, hashHue, initials } from '@/lib/format'
import {
  fullName,
  invoicesForPatient,
  recordsForPatient,
  useEntityMaps,
} from '@/lib/useEntities'
import { appointmentStatusStyle, invoiceStatusStyle } from '@/lib/status'
import { AppointmentStatus } from '@/types'

const ID_TYPES: PatientIdType[] = ['ID', 'Passport', 'BirthCertificate', 'Other']
const GENDERS: PatientGender[] = ['Male', 'Female', 'Other']

interface PatientDraft {
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  dateOfBirth: string
  gender: PatientGender
  emergencyContact: string
  insurancePolicyNumber: string
  idType: PatientIdType
  idNumber: string
  shaLicenseNumber: string
  nextOfKinName: string
  nextOfKinPhone: string
  nextOfKinRelationship: string
  allergies: string
  chronicIllnesses: string
  disability: string
  consentToTreat: boolean
  consentToShare: boolean
}

const emptyDraft: PatientDraft = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  dateOfBirth: '',
  gender: 'Female',
  emergencyContact: '',
  insurancePolicyNumber: '',
  idType: 'ID',
  idNumber: '',
  shaLicenseNumber: '',
  nextOfKinName: '',
  nextOfKinPhone: '',
  nextOfKinRelationship: '',
  allergies: '',
  chronicIllnesses: '',
  disability: '',
  consentToTreat: false,
  consentToShare: false,
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
  const patients = useHospitalStore((s) => s.patients)

  const [draft, setDraft] = useState<PatientDraft>(
    editing
      ? {
          firstName: editing.firstName,
          lastName: editing.lastName,
          email: editing.email,
          phoneNumber: editing.phoneNumber ?? '',
          dateOfBirth: editing.dateOfBirth,
          gender: editing.gender,
          emergencyContact: editing.emergencyContact,
          insurancePolicyNumber: editing.insurancePolicyNumber ?? '',
          idType: editing.idType,
          idNumber: editing.idNumber,
          shaLicenseNumber: editing.shaLicenseNumber ?? '',
          nextOfKinName: editing.nextOfKinName,
          nextOfKinPhone: editing.nextOfKinPhone,
          nextOfKinRelationship: editing.nextOfKinRelationship,
          allergies: editing.allergies ?? '',
          chronicIllnesses: (editing.chronicIllnesses ?? []).join(', '),
          disability: editing.disability ?? '',
          consentToTreat: editing.consentToTreat,
          consentToShare: editing.consentToShare,
        }
      : emptyDraft,
  )

  const valid =
    draft.firstName.trim() &&
    draft.lastName.trim() &&
    draft.email.trim() &&
    draft.dateOfBirth &&
    draft.gender &&
    draft.idNumber.trim() &&
    draft.nextOfKinName.trim() &&
    draft.nextOfKinPhone.trim() &&
    draft.consentToTreat

  function handleSave() {
    if (!valid) return

    // SRS — duplicate detection: same national ID or phone number already on file.
    const dup = patients.find(
      (p) =>
        p.id !== editing?.id &&
        (p.idNumber.toLowerCase() === draft.idNumber.trim().toLowerCase() ||
          (p.phoneNumber &&
            draft.phoneNumber.trim() &&
            p.phoneNumber.replace(/\D/g, '') === draft.phoneNumber.replace(/\D/g, ''))),
    )
    if (dup) {
      toast.error(
        `Duplicate patient detected — this ID/phone already belongs to ${dup.firstName} ${dup.lastName} (${dup.patientNumber}).`,
      )
      return
    }
    const payload = {
      ...draft,
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      email: draft.email.trim(),
      idNumber: draft.idNumber.trim(),
      phoneNumber: draft.phoneNumber.trim() || undefined,
      insurancePolicyNumber: draft.insurancePolicyNumber.trim() || undefined,
      shaLicenseNumber: draft.shaLicenseNumber.trim() || undefined,
      nextOfKinName: draft.nextOfKinName.trim(),
      nextOfKinPhone: draft.nextOfKinPhone.trim(),
      nextOfKinRelationship: draft.nextOfKinRelationship.trim() || 'Other',
      allergies: draft.allergies.trim() || undefined,
      chronicIllnesses:
        draft.chronicIllnesses
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean) || undefined,
      disability: draft.disability.trim() || undefined,
    }
    if (editing) {
      updatePatient(editing.id, payload)
      toast.success(`Patient ${editing.id} updated.`)
    } else {
      const p = addPatient(payload)
      toast.success(
        `Patient ${p.patientNumber} registered — ${p.firstName} ${p.lastName}.`,
      )
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.id}` : 'Register new patient'}</DialogTitle>
          <DialogDescription>
            St. Francis Health Services — full demographic, identification, next-of-kin and
            consent record (SRS compliant).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          {/* Demographics */}
          <div className="space-y-3">
            <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              Demographics
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>First name *</Label>
                <Input
                  value={draft.firstName}
                  onChange={(e) => setDraft((d) => ({ ...d, firstName: e.target.value }))}
                  placeholder="Amina"
                />
              </div>
              <div className="grid gap-2">
                <Label>Last name *</Label>
                <Input
                  value={draft.lastName}
                  onChange={(e) => setDraft((d) => ({ ...d, lastName: e.target.value }))}
                  placeholder="Wanjiru"
                />
              </div>
              <div className="grid gap-2">
                <Label>Date of birth *</Label>
                <Input
                  type="date"
                  value={draft.dateOfBirth}
                  onChange={(e) => setDraft((d) => ({ ...d, dateOfBirth: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Gender *</Label>
                <Select
                  value={draft.gender}
                  onValueChange={(v) => setDraft((d) => ({ ...d, gender: v as PatientGender }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Phone</Label>
                <Input
                  value={draft.phoneNumber}
                  onChange={(e) => setDraft((d) => ({ ...d, phoneNumber: e.target.value }))}
                  placeholder="+2547…"
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={draft.email}
                  onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                  placeholder="patient@example.com"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Identification & cover */}
          <div className="space-y-3">
            <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              Identification & cover
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>ID type *</Label>
                <Select
                  value={draft.idType}
                  onValueChange={(v) => setDraft((d) => ({ ...d, idType: v as PatientIdType }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ID_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t === 'BirthCertificate' ? 'Birth Certificate' : t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>ID number *</Label>
                <Input
                  value={draft.idNumber}
                  onChange={(e) => setDraft((d) => ({ ...d, idNumber: e.target.value }))}
                  placeholder="33445566"
                />
              </div>
              <div className="grid gap-2">
                <Label>SHA / NHIF licence</Label>
                <Input
                  value={draft.shaLicenseNumber}
                  onChange={(e) => setDraft((d) => ({ ...d, shaLicenseNumber: e.target.value }))}
                  placeholder="SHA-00000000"
                />
              </div>
              <div className="grid gap-2">
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
          </div>

          <Separator />

          {/* Next of kin */}
          <div className="space-y-3">
            <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              Next of kin
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Full name *</Label>
                <Input
                  value={draft.nextOfKinName}
                  onChange={(e) => setDraft((d) => ({ ...d, nextOfKinName: e.target.value }))}
                  placeholder="John Wanjiru"
                />
              </div>
              <div className="grid gap-2">
                <Label>Phone *</Label>
                <Input
                  value={draft.nextOfKinPhone}
                  onChange={(e) => setDraft((d) => ({ ...d, nextOfKinPhone: e.target.value }))}
                  placeholder="+2547…"
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label>Relationship</Label>
                <Input
                  value={draft.nextOfKinRelationship}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, nextOfKinRelationship: e.target.value }))
                  }
                  placeholder="Spouse, parent, sibling…"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Medical profile */}
          <div className="space-y-3">
            <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              Medical profile
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Allergies</Label>
                <Input
                  value={draft.allergies}
                  onChange={(e) => setDraft((d) => ({ ...d, allergies: e.target.value }))}
                  placeholder="e.g. Penicillin"
                />
              </div>
              <div className="grid gap-2">
                <Label>Chronic illnesses</Label>
                <Input
                  value={draft.chronicIllnesses}
                  onChange={(e) => setDraft((d) => ({ ...d, chronicIllnesses: e.target.value }))}
                  placeholder="Comma-separated, e.g. Asthma, Hypertension"
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label>Disability</Label>
                <Input
                  value={draft.disability}
                  onChange={(e) => setDraft((d) => ({ ...d, disability: e.target.value }))}
                  placeholder="e.g. Mobility impairment (leave blank if none)"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Consents */}
          <div className="space-y-3">
            <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              Consent
            </p>
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="consent-treat"
                  checked={draft.consentToTreat}
                  onCheckedChange={(v) => setDraft((d) => ({ ...d, consentToTreat: Boolean(v) }))}
                />
                <Label htmlFor="consent-treat" className="leading-snug">
                  I consent to medical examination and treatment at this facility. *
                </Label>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="consent-share"
                  checked={draft.consentToShare}
                  onCheckedChange={(v) => setDraft((d) => ({ ...d, consentToShare: Boolean(v) }))}
                />
                <Label htmlFor="consent-share" className="leading-snug">
                  I consent to sharing my health information with SHA / authorised insurers for
                  claims processing.
                </Label>
              </div>
            </div>
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
                {patient.patientNumber} · {patient.id} · {ageFrom(patient.dateOfBirth)} yrs ·{' '}
                {patient.gender} · {formatDate(patient.dateOfBirth)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid max-h-[55vh] gap-5 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Identification</p>
              <p className="font-medium">
                {patient.idType} · {patient.idNumber}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">SHA / NHIF</p>
              {patient.shaLicenseNumber ? (
                <Badge variant="info">{patient.shaLicenseNumber}</Badge>
              ) : (
                <p className="font-medium">—</p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Phone</p>
              <p className="font-medium">{patient.phoneNumber ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Insurance</p>
              {patient.insurancePolicyNumber ? (
                <Badge variant="info">{patient.insurancePolicyNumber}</Badge>
              ) : (
                <p className="font-medium">Self-pay</p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Email</p>
              <p className="font-medium">{patient.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Emergency contact</p>
              <p className="font-medium">{patient.emergencyContact ?? '—'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground text-xs">Next of kin</p>
              <p className="font-medium">
                {patient.nextOfKinName} · {patient.nextOfKinRelationship} ·{' '}
                {patient.nextOfKinPhone}
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Allergies</p>
              {patient.allergies ? (
                <Badge variant="destructive">{patient.allergies}</Badge>
              ) : (
                <p className="font-medium">None recorded</p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Chronic illnesses</p>
              {patient.chronicIllnesses && patient.chronicIllnesses.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {patient.chronicIllnesses.map((c) => (
                    <Badge key={c} variant="warning">
                      {c}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="font-medium">None recorded</p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Disability</p>
              <p className="font-medium">{patient.disability ?? 'None recorded'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Consent</p>
              <div className="flex flex-wrap gap-1">
                <Badge variant={patient.consentToTreat ? 'success' : 'destructive'}>
                  {patient.consentToTreat ? 'Treatment ✓' : 'No treatment'}
                </Badge>
                <Badge variant={patient.consentToShare ? 'success' : 'slate'}>
                  {patient.consentToShare ? 'Share info ✓' : 'No sharing'}
                </Badge>
              </div>
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
        accessorKey: 'patientNumber',
        header: 'Patient No.',
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-teal-700">
            {row.original.patientNumber}
          </span>
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
                <p className="text-muted-foreground text-xs">{p.id}</p>
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
        header: 'Age / Gender',
        cell: ({ row }) => (
          <div>
            <p>{ageFrom(row.original.dateOfBirth)} yrs · {row.original.gender}</p>
            <p className="text-muted-foreground text-xs">{formatDate(row.original.dateOfBirth)}</p>
          </div>
        ),
      },
      {
        accessorKey: 'insurancePolicyNumber',
        header: 'Cover',
        cell: ({ row }) =>
          row.original.shaLicenseNumber ? (
            <Badge variant="info">{row.original.shaLicenseNumber}</Badge>
          ) : row.original.insurancePolicyNumber ? (
            <Badge variant="secondary">{row.original.insurancePolicyNumber}</Badge>
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
        description="St. Francis patient registry — demographics, identification, cover and consent."
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
          searchPlaceholder="Search name, patient no., phone, ID or cover…"
          globalFilter={(p, term) =>
            `${p.firstName} ${p.lastName}`.toLowerCase().includes(term) ||
            p.email.toLowerCase().includes(term) ||
            (p.phoneNumber ?? '').toLowerCase().includes(term) ||
            p.patientNumber.toLowerCase().includes(term) ||
            p.idNumber.toLowerCase().includes(term) ||
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
