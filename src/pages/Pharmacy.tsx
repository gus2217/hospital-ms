import { useMemo, useState } from 'react'
import type { AppColumnDef } from '@/components/DataTable'
import {
  AlertTriangle,
  Boxes,
  Eye,
  MoreHorizontal,
  PackagePlus,
  Pencil,
  Pill,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { DataTable } from '@/components/DataTable'
import { PageHeader, StatusBadge } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { useHospitalStore } from '@/store/hospitalStore'
import { prescriptionStatusStyle } from '@/lib/status'
import {
  PrescriptionStatus,
  type Drug,
  type Prescription,
} from '@/types'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { fullName, useEntityMaps } from '@/lib/useEntities'

// ======================= Drug inventory =======================

interface DrugDraft {
  name: string
  genericName: string
  manufacturer: string
  unitPrice: number
  stockQuantity: number
  reorderLevel: number
}

function DrugFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: Drug
}) {
  const addDrug = useHospitalStore((s) => s.addDrug)
  const updateDrug = useHospitalStore((s) => s.updateDrug)

  const [draft, setDraft] = useState<DrugDraft>(
    editing
      ? {
          name: editing.name,
          genericName: editing.genericName,
          manufacturer: editing.manufacturer,
          unitPrice: editing.unitPrice,
          stockQuantity: editing.stockQuantity,
          reorderLevel: editing.reorderLevel,
        }
      : {
          name: '',
          genericName: '',
          manufacturer: '',
          unitPrice: 0,
          stockQuantity: 0,
          reorderLevel: 10,
        },
  )

  const valid = draft.name.trim() && draft.genericName.trim() && draft.unitPrice > 0

  function handleSave() {
    if (!valid) return
    if (editing) {
      updateDrug(editing.id, { ...draft, unitPrice: Number(draft.unitPrice) })
      toast.success(`${editing.id} updated.`)
    } else {
      const d = addDrug({ ...draft, unitPrice: Number(draft.unitPrice) })
      toast.success(`${d.name} added to inventory.`)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.id}` : 'Add drug to inventory'}</DialogTitle>
          <DialogDescription>Drug details, pricing and stock levels.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Brand name</Label>
            <Input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Generic name</Label>
            <Input
              value={draft.genericName}
              onChange={(e) => setDraft((d) => ({ ...d, genericName: e.target.value }))}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Manufacturer</Label>
            <Input
              value={draft.manufacturer}
              onChange={(e) => setDraft((d) => ({ ...d, manufacturer: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Unit price (KES)</Label>
            <Input
              type="number"
              min={0}
              value={draft.unitPrice}
              onChange={(e) => setDraft((d) => ({ ...d, unitPrice: Number(e.target.value) }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Reorder level</Label>
            <Input
              type="number"
              min={0}
              value={draft.reorderLevel}
              onChange={(e) => setDraft((d) => ({ ...d, reorderLevel: Number(e.target.value) }))}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Stock quantity</Label>
            <Input
              type="number"
              min={0}
              value={draft.stockQuantity}
              onChange={(e) => setDraft((d) => ({ ...d, stockQuantity: Number(e.target.value) }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!valid}>
            {editing ? 'Save changes' : 'Add drug'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DrugInventory() {
  const drugs = useHospitalStore((s) => s.drugs)
  const deleteDrug = useHospitalStore((s) => s.deleteDrug)
  const restockDrug = useHospitalStore((s) => s.restockDrug)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Drug | undefined>(undefined)

  const columns = useMemo<AppColumnDef<Drug>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-teal-700">{row.original.id}</span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Drug',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-muted-foreground text-xs">{row.original.genericName}</p>
          </div>
        ),
      },
      {
        accessorKey: 'manufacturer',
        header: 'Manufacturer',
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.manufacturer}</span>,
      },
      {
        accessorKey: 'unitPrice',
        header: 'Unit price',
        cell: ({ row }) => <span className="font-medium">{formatCurrency(row.original.unitPrice)}</span>,
      },
      {
        accessorKey: 'stockQuantity',
        header: 'Stock',
        cell: ({ row }) => {
          const d = row.original
          const low = d.stockQuantity <= d.reorderLevel
          return (
            <div className="flex items-center gap-2">
              <span className={`font-semibold ${low ? 'text-amber-600' : ''}`}>
                {d.stockQuantity}
              </span>
              {low && (
                <Badge variant={d.stockQuantity === 0 ? 'destructive' : 'warning'}>
                  {d.stockQuantity === 0 ? 'Out of stock' : 'Low'}
                </Badge>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'reorderLevel',
        header: 'Reorder at',
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.reorderLevel}</span>,
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
                <DropdownMenuItem
                  onClick={() => {
                    restockDrug(row.original.id, 100)
                    toast.success(`${row.original.name} restocked (+100 units).`)
                  }}
                >
                  <PackagePlus /> Restock +100
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
                    deleteDrug(row.original.id)
                    toast.success(`${row.original.name} removed from inventory.`)
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
    [restockDrug, deleteDrug],
  )

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge variant="warning" className="gap-1.5 px-3 py-1.5">
          <AlertTriangle className="size-3.5" />
          {drugs.filter((d) => d.stockQuantity <= d.reorderLevel).length} drugs need reordering
        </Badge>
        <div className="ml-auto">
          <Button
            onClick={() => {
              setEditing(undefined)
              setFormOpen(true)
            }}
          >
            <Plus /> Add drug
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={drugs}
        getRowId={(d) => d.id}
        searchPlaceholder="Search drug name, generic or manufacturer…"
        globalFilter={(d, term) =>
          `${d.name} ${d.genericName} ${d.manufacturer}`.toLowerCase().includes(term) ||
          d.id.toLowerCase().includes(term)
        }
        emptyMessage="No drugs in inventory."
      />

      <DrugFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(undefined)
        }}
        editing={editing}
      />
    </>
  )
}

// ======================= Prescriptions =======================

function PrescriptionViewDialog({
  prescription,
  open,
  onOpenChange,
}: {
  prescription: Prescription | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { recordById, patientById, doctorById, drugById } = useEntityMaps()
  if (!prescription) return null

  const record = recordById.get(prescription.medicalRecordId)
  const patientName = record ? fullName(patientById, record.patientId) : '—'
  const doctorName = record ? fullName(doctorById, record.doctorId) : '—'

  const total = prescription.items.reduce((sum, item) => {
    return sum + (drugById.get(item.drugId)?.unitPrice ?? 0) * item.quantity
  }, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{prescription.id}</DialogTitle>
          <DialogDescription>
            {patientName} · Dr. {doctorName} · issued {formatDateTime(prescription.issuedAt)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
            <span className="text-sm font-medium">Status</span>
            <StatusBadge
              label={prescription.status}
              variant={prescriptionStatusStyle[prescription.status].variant}
              dot={prescriptionStatusStyle[prescription.status].dot}
            />
          </div>
          {prescription.items.map((item) => (
            <div key={item.id} className="flex items-start justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-semibold">
                  {drugById.get(item.drugId)?.name ?? item.drugId}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {item.dosageInstructions}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="font-medium">× {item.quantity}</p>
                <p className="text-muted-foreground text-xs">
                  {formatCurrency((drugById.get(item.drugId)?.unitPrice ?? 0) * item.quantity)}
                </p>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between border-t pt-3 text-sm">
            <span className="text-muted-foreground">Estimated total</span>
            <span className="text-lg font-bold">{formatCurrency(total)}</span>
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

function PrescriptionsTab() {
  const prescriptions = useHospitalStore((s) => s.prescriptions)
  const dispensePrescription = useHospitalStore((s) => s.dispensePrescription)
  const cancelPrescription = useHospitalStore((s) => s.cancelPrescription)
  const deletePrescription = useHospitalStore((s) => s.deletePrescription)
  const staff = useHospitalStore((s) => s.staff)
  const { recordById, patientById, drugById } = useEntityMaps()

  const [viewing, setViewing] = useState<Prescription | null>(null)

  const pharmacistId = staff.find((s) => s.role === 'Pharmacist')?.id ?? 'STF-002'

  const columns = useMemo<AppColumnDef<Prescription>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-teal-700">{row.original.id}</span>
        ),
      },
      {
        accessorKey: 'medicalRecordId',
        header: 'Patient',
        cell: ({ row }) => {
          const record = recordById.get(row.original.medicalRecordId)
          return (
            <div>
              <p className="font-medium">
                {record ? fullName(patientById, record.patientId) : '—'}
              </p>
              <p className="text-muted-foreground text-xs">{row.original.medicalRecordId}</p>
            </div>
          )
        },
      },
      {
        id: 'items',
        header: 'Items',
        cell: ({ row }) => (
          <div className="space-y-0.5">
            {row.original.items.map((item) => (
              <p key={item.id} className="text-xs">
                <span className="font-medium">{drugById.get(item.drugId)?.name ?? item.drugId}</span>{' '}
                × {item.quantity}
              </p>
            ))}
          </div>
        ),
      },
      {
        accessorKey: 'issuedAt',
        header: 'Issued',
        sortFn: 'datetime',
        cell: ({ row }) => (
          <div>
            <p>{formatDateTime(row.original.issuedAt)}</p>
            {row.original.dispensedAt && (
              <p className="text-muted-foreground text-xs">
                Dispensed {formatDateTime(row.original.dispensedAt)}
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <StatusBadge
            label={row.original.status}
            variant={prescriptionStatusStyle[row.original.status].variant}
            dot={prescriptionStatusStyle[row.original.status].dot}
          />
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const rx = row.original
          return (
            <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => setViewing(rx)}>
                    <Eye /> View items
                  </DropdownMenuItem>
                  {rx.status === PrescriptionStatus.Ordered && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          dispensePrescription(rx.id, pharmacistId)
                          toast.success(
                            `${rx.id} dispensed — stock deducted and invoice issued for billing.`,
                          )
                        }}
                      >
                        <Pill /> Dispense & bill patient
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => {
                          cancelPrescription(rx.id)
                          toast.info(`${rx.id} cancelled.`)
                        }}
                      >
                        <Trash2 /> Cancel prescription
                      </DropdownMenuItem>
                    </>
                  )}
                  {(rx.status === PrescriptionStatus.Dispensed ||
                    rx.status === PrescriptionStatus.Cancelled) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => {
                          deletePrescription(rx.id)
                          toast.success(`${rx.id} deleted.`)
                        }}
                      >
                        <Trash2 /> Delete
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
    [recordById, patientById, drugById, dispensePrescription, cancelPrescription, deletePrescription, pharmacistId],
  )

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge variant="info" className="gap-1.5 px-3 py-1.5">
          <Boxes className="size-3.5" />
          {prescriptions.filter((p) => p.status === 'Ordered').length} awaiting dispensing
        </Badge>
        <p className="text-muted-foreground ml-auto text-xs">
          Dispensing deducts stock and automatically creates a billing invoice.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={prescriptions}
        getRowId={(p) => p.id}
        searchPlaceholder="Search prescription ID or patient…"
        globalFilter={(p, term) => {
          const record = recordById.get(p.medicalRecordId)
          const patient = record ? fullName(patientById, record.patientId) : ''
          return (
            p.id.toLowerCase().includes(term) ||
            patient.toLowerCase().includes(term) ||
            p.items.some((i) => (drugById.get(i.drugId)?.name ?? '').toLowerCase().includes(term))
          )
        }}
        emptyMessage="No prescriptions yet."
      />

      <PrescriptionViewDialog
        prescription={viewing}
        open={viewing !== null}
        onOpenChange={() => setViewing(null)}
      />
    </>
  )
}

export default function Pharmacy() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pharmacy"
        description="Drug inventory, reorder alerts, and prescription dispensing."
      />

      <Tabs defaultValue="inventory">
        <TabsList>
          <TabsTrigger value="inventory">
            <Boxes /> Drug inventory
          </TabsTrigger>
          <TabsTrigger value="prescriptions">
            <Pill /> Prescriptions
          </TabsTrigger>
        </TabsList>
        <TabsContent value="inventory" className="pt-4">
          <Card className="gap-0 border-0 py-0 shadow-none">
            <DrugInventory />
          </Card>
        </TabsContent>
        <TabsContent value="prescriptions" className="pt-4">
          <Card className="gap-0 border-0 py-0 shadow-none">
            <PrescriptionsTab />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
