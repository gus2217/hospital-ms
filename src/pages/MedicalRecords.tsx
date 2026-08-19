import { useMemo, useState } from 'react'
import type { AppColumnDef } from '@/components/DataTable'
import { ClipboardList, Eye, History, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
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
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { useHospitalStore } from '@/store/hospitalStore'
import type { MedicalRecord } from '@/types'
import { formatDateTime } from '@/lib/format'
import { fullName, useEntityMaps } from '@/lib/useEntities'

function RecordDetailDialog({
  record,
  open,
  onOpenChange,
}: {
  record: MedicalRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { patientById, doctorById, prescriptions, drugById } = useEntityMaps()

  if (!record) return null
  const rx = prescriptions.filter((p) => p.medicalRecordId === record.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{record.id}</DialogTitle>
            <Badge variant="secondary">
              <History /> v{record.version}
            </Badge>
          </div>
          <DialogDescription>
            {fullName(patientById, record.patientId)} · {fullName(doctorById, record.doctorId)} ·{' '}
            {formatDateTime(record.recordedAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[55vh] gap-4 overflow-y-auto pr-1 text-sm">
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
            <p className="text-foreground/90 whitespace-pre-wrap">{record.treatmentPlan}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wide">
              Clinical notes
            </p>
            <p className="text-foreground/90 whitespace-pre-wrap">{record.clinicalNotes}</p>
          </div>

          {rx.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
                  Prescriptions
                </p>
                {rx.map((p) => (
                  <div key={p.id} className="mb-2 rounded-lg border p-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold">{p.id}</span>
                      <Badge variant={p.status === 'Dispensed' ? 'success' : p.status === 'Cancelled' ? 'slate' : 'warning'}>
                        {p.status}
                      </Badge>
                    </div>
                    <ul className="space-y-1 text-xs">
                      {p.items.map((item) => (
                        <li key={item.id} className="text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {drugById.get(item.drugId)?.name ?? item.drugId}
                          </span>{' '}
                          × {item.quantity} — {item.dosageInstructions}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
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

function RecordEditDialog({
  record,
  open,
  onOpenChange,
}: {
  record: MedicalRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const updateMedicalRecord = useHospitalStore((s) => s.updateMedicalRecord)
  const { patientById } = useEntityMaps()

  const [diagnosis, setDiagnosis] = useState(record?.diagnosis ?? '')
  const [treatmentPlan, setTreatmentPlan] = useState(record?.treatmentPlan ?? '')
  const [clinicalNotes, setClinicalNotes] = useState(record?.clinicalNotes ?? '')

  const valid = diagnosis.trim() && treatmentPlan.trim() && clinicalNotes.trim()

  function handleSave() {
    if (!record || !valid) return
    updateMedicalRecord(record.id, {
      diagnosis: diagnosis.trim(),
      treatmentPlan: treatmentPlan.trim(),
      clinicalNotes: clinicalNotes.trim(),
    })
    toast.success(`${record.id} updated — version incremented to v${record.version + 1}.`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Amend medical record</DialogTitle>
          <DialogDescription>
            {record ? `${record.id} · ${fullName(patientById, record.patientId)}` : ''} — saving
            creates a new version.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Diagnosis</Label>
            <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Treatment plan</Label>
            <Textarea value={treatmentPlan} onChange={(e) => setTreatmentPlan(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Clinical notes</Label>
            <Textarea value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!valid}>
            Save new version
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function MedicalRecords() {
  const medicalRecords = useHospitalStore((s) => s.medicalRecords)
  const deleteMedicalRecord = useHospitalStore((s) => s.deleteMedicalRecord)
  const { patientById, doctorById, appointmentById } = useEntityMaps()

  const [viewing, setViewing] = useState<MedicalRecord | null>(null)
  const [editing, setEditing] = useState<MedicalRecord | null>(null)

  const columns = useMemo<AppColumnDef<MedicalRecord>[]>(
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
        accessorKey: 'appointmentId',
        header: 'Appointment',
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.appointmentId}</span>
        ),
      },
      {
        accessorKey: 'diagnosis',
        header: 'Diagnosis',
        cell: ({ row }) => (
          <span className="block max-w-56 truncate font-medium">{row.original.diagnosis}</span>
        ),
      },
      {
        accessorKey: 'recordedAt',
        header: 'Recorded',
        sortFn: 'datetime',
        cell: ({ row }) => (
          <div>
            <p>{formatDateTime(row.original.recordedAt)}</p>
            <p className="text-muted-foreground text-xs">{row.original.appointmentId}</p>
          </div>
        ),
      },
      {
        accessorKey: 'version',
        header: 'Version',
        cell: ({ row }) => <Badge variant="secondary">v{row.original.version}</Badge>,
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
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => setViewing(row.original)}>
                  <Eye /> View record
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditing(row.original)}>
                  <Pencil /> Amend (new version)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    deleteMedicalRecord(row.original.id)
                    toast.success(`${row.original.id} deleted.`)
                  }}
                >
                  <Trash2 /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [patientById, doctorById, appointmentById, deleteMedicalRecord],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medical Records"
        description="Versioned consultation records created when appointments are completed."
      >
        <Button variant="outline" disabled>
          <ClipboardList /> New record via completed consultation
        </Button>
      </PageHeader>

      <Card className="gap-0 border-0 py-0 shadow-none">
        <DataTable
          columns={columns}
          data={medicalRecords}
          getRowId={(r) => r.id}
          searchPlaceholder="Search patient, doctor, diagnosis…"
          globalFilter={(r, term) =>
            fullName(patientById, r.patientId).toLowerCase().includes(term) ||
            fullName(doctorById, r.doctorId).toLowerCase().includes(term) ||
            r.diagnosis.toLowerCase().includes(term) ||
            r.id.toLowerCase().includes(term)
          }
          onRowClick={(r) => setViewing(r)}
          emptyMessage="No medical records yet. Complete a consultation to create one."
        />
      </Card>

      <RecordDetailDialog record={viewing} open={viewing !== null} onOpenChange={() => setViewing(null)} />
      <RecordEditDialog record={editing} open={editing !== null} onOpenChange={() => setEditing(null)} />
    </div>
  )
}
