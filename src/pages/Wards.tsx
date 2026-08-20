import { useMemo, useState } from 'react'
import type { AppColumnDef } from '@/components/DataTable'
import {
  BedDouble,
  DoorOpen,
  LogOut,
  MoreHorizontal,
  NotepadText,
  Plus,
  Stethoscope,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { DataTable } from '@/components/DataTable'
import { PageHeader, StatusBadge } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
import { useHospitalStore } from '@/store/hospitalStore'
import { usePermission } from '@/lib/permissions'
import { admissionStatusStyle } from '@/lib/status'
import { AdmissionStatus, Permission, type Admission } from '@/types'
import { formatDate, formatDateTime } from '@/lib/format'
import { fullName, useEntityMaps } from '@/lib/useEntities'

function AdmitDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const admitPatient = useHospitalStore((s) => s.admitPatient)
  const { patients, wards, doctors } = useEntityMaps()

  const [patientId, setPatientId] = useState('')
  const [wardId, setWardId] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [admittingDoctorId, setAdmittingDoctorId] = useState('')
  const [expectedDischargeDate, setExpectedDischargeDate] = useState('')
  const [notes, setNotes] = useState('')

  const valid = patientId && wardId && diagnosis.trim()

  function handleAdmit() {
    if (!valid) return
    const admission = admitPatient({
      patientId,
      wardId,
      diagnosis: diagnosis.trim(),
      admittingDoctorId: admittingDoctorId || undefined,
      expectedDischargeDate: expectedDischargeDate
        ? new Date(expectedDischargeDate).toISOString()
        : undefined,
      notes: notes.trim() || undefined,
    })
    if (!admission) {
      toast.error('No free bed in the selected ward.')
      return
    }
    toast.success(
      `${patients.find((p) => p.id === patientId)?.firstName ?? ''} ${
        patients.find((p) => p.id === patientId)?.lastName ?? ''
      } admitted to bed ${admission.bedNumber}.`,
    )
    onOpenChange(false)
    setPatientId('')
    setWardId('')
    setDiagnosis('')
    setAdmittingDoctorId('')
    setExpectedDischargeDate('')
    setNotes('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Admit patient</DialogTitle>
          <DialogDescription>Assign a bed and record the admission.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Patient</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger className="w-full">
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
            <Label>Ward</Label>
            <Select value={wardId} onValueChange={setWardId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select ward" />
              </SelectTrigger>
              <SelectContent>
                {wards.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name} ({w.totalBeds} beds)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Diagnosis</Label>
            <Input
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Admission diagnosis"
            />
          </div>
          <div className="grid gap-2">
            <Label>Admitting doctor (optional)</Label>
            <Select value={admittingDoctorId} onValueChange={setAdmittingDoctorId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.firstName} {d.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Expected discharge date</Label>
            <Input
              type="date"
              value={expectedDischargeDate}
              onChange={(e) => setExpectedDischargeDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Care instructions…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdmit} disabled={!valid}>
            <DoorOpen /> Admit patient
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NursingNotesDialog({
  admission,
  open,
  onOpenChange,
}: {
  admission: Admission | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const updateAdmission = useHospitalStore((s) => s.updateAdmission)
  const [notes, setNotes] = useState('')

  function handleSave() {
    if (!admission || !notes.trim()) return
    updateAdmission(admission.id, { notes: notes.trim() })
    toast.success(`${admission.id} nursing notes updated.`)
    onOpenChange(false)
    setNotes('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nursing notes — {admission?.id}</DialogTitle>
          <DialogDescription>Document vitals, observations and care provided.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label>Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. BP 120/80, afebrile, tolerating oral intake…"
            rows={6}
          />
          {admission?.notes && (
            <p className="text-muted-foreground rounded-lg bg-muted/50 p-3 text-xs">
              <span className="font-semibold">Last notes:</span> {admission.notes}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!notes.trim()}>
            <NotepadText /> Save notes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function Wards() {
  const wards = useHospitalStore((s) => s.wards)
  const admissions = useHospitalStore((s) => s.admissions)
  const dischargeAdmission = useHospitalStore((s) => s.dischargeAdmission)
  const staff = useHospitalStore((s) => s.staff)
  const { patientById, doctorById } = useEntityMaps()

  const canManage = usePermission(Permission.MANAGE_ADMISSIONS)
  const canWriteNotes = usePermission(Permission.UPDATE_NURSING_NOTES)

  const [admitOpen, setAdmitOpen] = useState(false)
  const [noting, setNoting] = useState<Admission | null>(null)

  const staffById = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff])

  const occupancy = useMemo(
    () =>
      wards.map((ward) => {
        const active = admissions.filter(
          (a) => a.wardId === ward.id && a.status === AdmissionStatus.Active,
        ).length
        return { ward, active, rate: Math.round((active / ward.totalBeds) * 100) }
      }),
    [wards, admissions],
  )

  const totalBeds = wards.reduce((s, w) => s + w.totalBeds, 0)
  const occupiedBeds = occupancy.reduce((s, o) => s + o.active, 0)
  const overallRate = totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0

  const dischargeAlerts = useMemo(
    () =>
      admissions.filter((a) => {
        if (a.status !== AdmissionStatus.Active || !a.expectedDischargeDate) return false
        const days = Math.ceil(
          (new Date(a.expectedDischargeDate).getTime() - new Date().getTime()) / 86_400_000,
        )
        return days <= 1
      }),
    [admissions],
  )

  const columns = useMemo<AppColumnDef<Admission>[]>(
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
        accessorKey: 'wardId',
        header: 'Ward / Bed',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">
              {wards.find((w) => w.id === row.original.wardId)?.name ?? row.original.wardId}
            </p>
            <p className="text-muted-foreground text-xs">Bed {row.original.bedNumber}</p>
          </div>
        ),
      },
      {
        accessorKey: 'admittedAt',
        header: 'Admitted',
        sortFn: 'datetime',
        cell: ({ row }) => (
          <div>
            <p>{formatDateTime(row.original.admittedAt)}</p>
            {row.original.expectedDischargeDate && (
              <p className="text-muted-foreground text-xs">
                Exp. discharge {formatDate(row.original.expectedDischargeDate)}
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'admittingDoctorId',
        header: 'Doctor',
        cell: ({ row }) => (
          <span className="text-sm">{fullName(doctorById, row.original.admittingDoctorId)}</span>
        ),
      },
      {
        accessorKey: 'diagnosis',
        header: 'Diagnosis',
        cell: ({ row }) => (
          <span className="block max-w-48 truncate">{row.original.diagnosis}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <StatusBadge
            label={row.original.status}
            variant={admissionStatusStyle[row.original.status].variant}
            dot={admissionStatusStyle[row.original.status].dot}
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
                  {canWriteNotes && a.status === AdmissionStatus.Active && (
                    <DropdownMenuItem onClick={() => setNoting(a)}>
                      <NotepadText /> Update nursing notes
                    </DropdownMenuItem>
                  )}
                  {canManage && a.status === AdmissionStatus.Active && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => {
                          dischargeAdmission(a.id)
                          toast.success(`${a.id} discharged — bed released.`)
                        }}
                      >
                        <LogOut /> Discharge patient
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
    [patientById, doctorById, wards, canManage, canWriteNotes, dischargeAdmission],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wards & Admissions"
        description="Bed occupancy, admissions, and inpatient care."
      >
        {canManage && (
          <Button onClick={() => setAdmitOpen(true)}>
            <Plus /> Admit patient
          </Button>
        )}
      </PageHeader>

      {/* Occupancy cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {occupancy.map(({ ward, active, rate }) => (
          <Card key={ward.id} className="gap-2 py-4">
            <CardContent className="flex items-start justify-between px-5">
              <div>
                <p className="text-sm font-semibold">{ward.name}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {active} / {ward.totalBeds} beds occupied
                  {ward.nurseInCharge && (
                    <span className="block">
                      Nurse: {fullName(staffById, ward.nurseInCharge)}
                    </span>
                  )}
                </p>
              </div>
              <Badge variant={rate >= 90 ? 'destructive' : rate >= 70 ? 'warning' : 'success'}>
                {rate}%
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Operational strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="gap-2 py-4">
          <CardContent className="flex items-center gap-3 px-5">
            <BedDouble className="text-sky-600 size-5" />
            <div>
              <p className="text-sm font-semibold">{overallRate}%</p>
              <p className="text-muted-foreground text-xs">
                Overall occupancy ({occupiedBeds}/{totalBeds} beds)
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="gap-2 py-4">
          <CardContent className="flex items-center gap-3 px-5">
            <Users className="text-violet-600 size-5" />
            <div>
              <p className="text-sm font-semibold">{admissions.length} admissions</p>
              <p className="text-muted-foreground text-xs">
                {admissions.filter((a) => a.status === AdmissionStatus.Active).length} active inpatients
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="gap-2 py-4">
          <CardContent className="flex items-center gap-3 px-5">
            <Stethoscope className="text-amber-600 size-5" />
            <div>
              <p className="text-sm font-semibold">{dischargeAlerts.length} discharge alert(s)</p>
              <p className="text-muted-foreground text-xs">
                Expected discharge within 24h
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0 border-0 py-0 shadow-none">
        <DataTable
          columns={columns}
          data={admissions}
          getRowId={(a) => a.id}
          searchPlaceholder="Search patient, ward or diagnosis…"
          globalFilter={(a, term) =>
            fullName(patientById, a.patientId).toLowerCase().includes(term) ||
            a.diagnosis.toLowerCase().includes(term) ||
            a.id.toLowerCase().includes(term) ||
            (wards.find((w) => w.id === a.wardId)?.name ?? '').toLowerCase().includes(term)
          }
          emptyMessage="No admissions recorded."
        />
      </Card>

      <AdmitDialog open={admitOpen} onOpenChange={setAdmitOpen} />
      <NursingNotesDialog
        admission={noting}
        open={noting !== null}
        onOpenChange={() => setNoting(null)}
      />
    </div>
  )
}
