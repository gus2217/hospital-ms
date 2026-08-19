import { useMemo, useState } from 'react'
import type { AppColumnDef } from '@/components/DataTable'
import { MoreHorizontal, Pencil, Stethoscope, Trash2 } from 'lucide-react'
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useHospitalStore } from '@/store/hospitalStore'
import type { Doctor } from '@/types'
import { hashHue, initials } from '@/lib/format'
import { useEntityMaps } from '@/lib/useEntities'

interface DoctorDraft {
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  specialization: string
  licenseNumber: string
}

const SPECIALIZATIONS = [
  'Cardiology',
  'General Medicine',
  'Pediatrics',
  'Dermatology',
  'Neurology',
  'Orthopedics',
  'Gynecology',
  'ENT',
]

function DoctorFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: Doctor
}) {
  const addDoctor = useHospitalStore((s) => s.addDoctor)
  const updateDoctor = useHospitalStore((s) => s.updateDoctor)

  const [draft, setDraft] = useState<DoctorDraft>(
    editing
      ? {
          firstName: editing.firstName,
          lastName: editing.lastName,
          email: editing.email,
          phoneNumber: editing.phoneNumber ?? '',
          specialization: editing.specialization,
          licenseNumber: editing.licenseNumber,
        }
      : {
          firstName: '',
          lastName: '',
          email: '',
          phoneNumber: '',
          specialization: '',
          licenseNumber: '',
        },
  )

  const valid =
    draft.firstName.trim() &&
    draft.lastName.trim() &&
    draft.email.trim() &&
    draft.specialization &&
    draft.licenseNumber.trim()

  function handleSave() {
    if (!valid) return
    if (editing) {
      updateDoctor(editing.id, { ...draft, phoneNumber: draft.phoneNumber || undefined })
      toast.success(`Doctor ${editing.id} updated.`)
    } else {
      const d = addDoctor({ ...draft, phoneNumber: draft.phoneNumber || undefined })
      toast.success(`Dr. ${d.firstName} ${d.lastName} added to the roster.`)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.id}` : 'Add doctor'}</DialogTitle>
          <DialogDescription>Doctor credentials and specialization.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>First name</Label>
            <Input
              value={draft.firstName}
              onChange={(e) => setDraft((d) => ({ ...d, firstName: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Last name</Label>
            <Input
              value={draft.lastName}
              onChange={(e) => setDraft((d) => ({ ...d, lastName: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={draft.email}
              onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Phone</Label>
            <Input
              value={draft.phoneNumber}
              onChange={(e) => setDraft((d) => ({ ...d, phoneNumber: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Specialization</Label>
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none"
              value={draft.specialization}
              onChange={(e) => setDraft((d) => ({ ...d, specialization: e.target.value }))}
            >
              <option value="">Select specialization</option>
              {SPECIALIZATIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label>License number</Label>
            <Input
              value={draft.licenseNumber}
              onChange={(e) => setDraft((d) => ({ ...d, licenseNumber: e.target.value }))}
              placeholder="KMPDC-0000"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!valid}>
            {editing ? 'Save changes' : 'Add doctor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function Doctors() {
  const doctors = useHospitalStore((s) => s.doctors)
  const deleteDoctor = useHospitalStore((s) => s.deleteDoctor)
  const { appointments } = useEntityMaps()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Doctor | undefined>(undefined)

  const columns = useMemo<AppColumnDef<Doctor>[]>(
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
        header: 'Doctor',
        cell: ({ row }) => {
          const d = row.original
          return (
            <div className="flex items-center gap-3">
              <Avatar className="size-8">
                <AvatarFallback
                  className="text-[10px]"
                  style={{
                    backgroundColor: `hsl(${hashHue(d.id)} 70% 92%)`,
                    color: `hsl(${hashHue(d.id)} 60% 30%)`,
                  }}
                >
                  {initials(d.firstName, d.lastName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  Dr. {d.firstName} {d.lastName}
                </p>
                <p className="text-muted-foreground text-xs">{d.email}</p>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'specialization',
        header: 'Specialization',
        cell: ({ row }) => <Badge variant="secondary">{row.original.specialization}</Badge>,
      },
      {
        accessorKey: 'licenseNumber',
        header: 'License',
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.licenseNumber}</span>
        ),
      },
      {
        accessorKey: 'phoneNumber',
        header: 'Phone',
        cell: ({ row }) => row.original.phoneNumber ?? '—',
      },
      {
        id: 'load',
        header: 'Appointments',
        cell: ({ row }) => {
          const count = appointments.filter((a) => a.doctorId === row.original.id).length
          const active = appointments.filter(
            (a) =>
              a.doctorId === row.original.id &&
              a.status !== 'Completed' &&
              a.status !== 'Cancelled' &&
              a.status !== 'NoShow',
          ).length
          return (
            <div>
              <p className="font-medium">{count} total</p>
              <p className="text-muted-foreground text-xs">{active} upcoming</p>
            </div>
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
              <DropdownMenuContent align="end" className="w-44">
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
                    deleteDoctor(row.original.id)
                    toast.success(`${row.original.id} removed; their appointments were cancelled.`)
                  }}
                >
                  <Trash2 /> Remove doctor
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [appointments, deleteDoctor],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctors"
        description="Medical staff roster with specializations and licensing."
      >
        <Button
          onClick={() => {
            setEditing(undefined)
            setFormOpen(true)
          }}
        >
          <Stethoscope /> Add doctor
        </Button>
      </PageHeader>

      <Card className="gap-0 border-0 py-0 shadow-none">
        <DataTable
          columns={columns}
          data={doctors}
          getRowId={(d) => d.id}
          searchPlaceholder="Search name, specialization, license…"
          globalFilter={(d, term) =>
            `${d.firstName} ${d.lastName}`.toLowerCase().includes(term) ||
            d.specialization.toLowerCase().includes(term) ||
            d.licenseNumber.toLowerCase().includes(term) ||
            d.id.toLowerCase().includes(term)
          }
          emptyMessage="No doctors found."
        />
      </Card>

      <DoctorFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(undefined)
        }}
        editing={editing}
      />
    </div>
  )
}
