import { useMemo, useState } from 'react'
import type { AppColumnDef } from '@/components/DataTable'
import {
  AlertTriangle,
  Banknote,
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
import { prescriptionStatusStyle, paymentMethodLabel } from '@/lib/status'
import {
  PrescriptionStatus,
  type Drug,
  type Prescription,
} from '@/types'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { fullName, useEntityMaps } from '@/lib/useEntities'

const PAYMENT_METHODS = ['Cash', 'Credit Card', 'M-Pesa', 'Insurance', 'Bank']

const DEFAULT_EXPIRY = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10)

// ======================= Drug inventory =======================

interface DrugDraft {
  name: string
  genericName: string
  manufacturer: string
  unitPrice: number
  stockQuantity: number
  reorderPoint: number
  category: string
  batchNumber: string
  expiryDate: string
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
          reorderPoint: editing.reorderPoint,
          category: editing.category,
          batchNumber: editing.batchNumber,
          expiryDate: editing.expiryDate.slice(0, 10),
        }
      : {
          name: '',
          genericName: '',
          manufacturer: '',
          unitPrice: 0,
          stockQuantity: 0,
          reorderPoint: 10,
          category: '',
          batchNumber: '',
          expiryDate: DEFAULT_EXPIRY,
        },
  )

  const valid =
    draft.name.trim() &&
    draft.genericName.trim() &&
    draft.category.trim() &&
    draft.batchNumber.trim() &&
    draft.expiryDate &&
    draft.unitPrice > 0

  function handleSave() {
    if (!valid) return
    const payload = {
      ...draft,
      name: draft.name.trim(),
      genericName: draft.genericName.trim(),
      manufacturer: draft.manufacturer.trim() || 'Unknown',
      category: draft.category.trim(),
      batchNumber: draft.batchNumber.trim(),
      unitPrice: Number(draft.unitPrice),
      reorderPoint: Number(draft.reorderPoint),
      expiryDate: new Date(draft.expiryDate).toISOString(),
    }
    if (editing) {
      updateDrug(editing.id, payload)
      toast.success(`${editing.id} updated.`)
    } else {
      const d = addDrug(payload)
      toast.success(`${d.name} added to inventory.`)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.id}` : 'Add drug to inventory'}</DialogTitle>
          <DialogDescription>Drug details, batch info, pricing and stock levels.</DialogDescription>
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
          <div className="grid gap-2">
            <Label>Category</Label>
            <Input
              value={draft.category}
              onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
              placeholder="e.g. Antibiotics"
            />
          </div>
          <div className="grid gap-2">
            <Label>Batch number</Label>
            <Input
              value={draft.batchNumber}
              onChange={(e) => setDraft((d) => ({ ...d, batchNumber: e.target.value }))}
              placeholder="e.g. BAT-AMX-2601"
            />
          </div>
          <div className="grid gap-2">
            <Label>Expiry date</Label>
            <Input
              type="date"
              value={draft.expiryDate}
              onChange={(e) => setDraft((d) => ({ ...d, expiryDate: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
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
            <Label>Reorder point</Label>
            <Input
              type="number"
              min={0}
              value={draft.reorderPoint}
              onChange={(e) => setDraft((d) => ({ ...d, reorderPoint: Number(e.target.value) }))}
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
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => <Badge variant="secondary">{row.original.category}</Badge>,
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
          const low = d.stockQuantity <= d.reorderPoint
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
        accessorKey: 'expiryDate',
        header: 'Expiry',
        cell: ({ row }) => {
          const days = Math.ceil(
            (new Date(row.original.expiryDate).getTime() - Date.now()) / 86_400_000,
          )
          return (
            <Badge variant={days <= 60 ? 'destructive' : days <= 90 ? 'warning' : 'secondary'}>
              {days <= 0 ? 'Expired' : `${days}d`}
            </Badge>
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
          {drugs.filter((d) => d.stockQuantity <= d.reorderPoint).length} drugs need reordering
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
        searchPlaceholder="Search drug name, generic, category or manufacturer…"
        globalFilter={(d, term) =>
          `${d.name} ${d.genericName} ${d.category} ${d.manufacturer}`
            .toLowerCase()
            .includes(term) || d.id.toLowerCase().includes(term)
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

/**
 * Dispense + collect payment in one step: deducts stock, creates the invoice,
 * and records the payment (full or partial) against the patient's account.
 */
function DispensePaymentDialog({
  prescription,
  open,
  onOpenChange,
}: {
  prescription: Prescription | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const currentUser = useAuthStore((s) => s.currentUser)
  const dispensePrescription = useHospitalStore((s) => s.dispensePrescription)
  const recordPayment = useHospitalStore((s) => s.recordPayment)
  const { drugById, recordById, patientById } = useEntityMaps()

  const [method, setMethod] = useState('M-Pesa')
  const [busy, setBusy] = useState(false)
  // The dialog is keyed by prescription id, so this initializer runs fresh per prescription.
  const [amount, setAmount] = useState(() => {
    if (!prescription) return 0
    const subtotal = prescription.items.reduce(
      (sum, item) => sum + (drugById.get(item.drugId)?.unitPrice ?? 0) * item.quantity,
      0,
    )
    return Math.round(subtotal * 1.16 * 100) / 100
  })

  const totals = useMemo(() => {
    if (!prescription) return { subtotal: 0, tax: 0, total: 0 }
    const subtotal = prescription.items.reduce(
      (sum, item) => sum + (drugById.get(item.drugId)?.unitPrice ?? 0) * item.quantity,
      0,
    )
    const tax = Math.round(subtotal * 0.16 * 100) / 100
    return { subtotal, tax, total: Math.round((subtotal + tax) * 100) / 100 }
  }, [prescription, drugById])

  if (!prescription) return null
  const rx: Prescription = prescription

  const record = recordById.get(rx.medicalRecordId)
  const patientName = record ? fullName(patientById, record.patientId) : '—'
  const balance = totals.total - amount

  function handleConfirm() {
    if (amount <= 0 || amount > totals.total) {
      toast.error('Enter a valid amount (up to the invoice total).')
      return
    }
    setBusy(true)

    // 1) Dispense (deducts stock + creates the invoice) if still ordered.
    if (rx.status === PrescriptionStatus.Ordered) {
      dispensePrescription(rx.id, currentUser?.id ?? 'STF-002')
    }

    // 2) Locate the invoice created from this prescription.
    const invoice = useHospitalStore
      .getState()
      .invoices.find((i) => i.items.some((it) => it.sourceReferenceId === rx.id))

    if (!invoice) {
      setBusy(false)
      toast.error('Could not locate the generated invoice.')
      return
    }

    // 3) Record the payment (full or partial).
    recordPayment(invoice.id, amount, method)
    setBusy(false)
    toast.success(
      `${rx.id} dispensed — ${formatCurrency(amount)} collected via ${paymentMethodLabel(method)}.`,
    )
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dispense & collect payment</DialogTitle>
          <DialogDescription>
            {prescription.id} · {patientName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border">
            {prescription.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between border-b px-3 py-2 text-sm last:border-b-0"
              >
                <span className="font-medium">
                  {drugById.get(item.drugId)?.name ?? item.drugId} × {item.quantity}
                </span>
                <span className="text-muted-foreground">
                  {formatCurrency((drugById.get(item.drugId)?.unitPrice ?? 0) * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-1.5 text-sm">
            <div className="text-muted-foreground flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="text-muted-foreground flex justify-between">
              <span>Tax (16% VAT)</span>
              <span>{formatCurrency(totals.tax)}</span>
            </div>
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span>{formatCurrency(totals.total)}</span>
            </div>
          </div>

          <Separator />

          <div className="grid gap-2">
            <Label htmlFor="dpx-method">Payment method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger id="dpx-method" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dpx-amount">Amount received (KES)</Label>
            <Input
              id="dpx-amount"
              type="number"
              min={1}
              max={totals.total}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <p className="text-muted-foreground text-xs">
              {balance > 0
                ? `Partial payment — balance ${formatCurrency(balance)} remains on the invoice.`
                : 'Full payment — invoice will be marked Paid.'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={busy || amount <= 0}>
            <Banknote /> Dispense & collect {formatCurrency(amount)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PrescriptionsTab() {
  const prescriptions = useHospitalStore((s) => s.prescriptions)
  const cancelPrescription = useHospitalStore((s) => s.cancelPrescription)
  const deletePrescription = useHospitalStore((s) => s.deletePrescription)
  const { recordById, patientById, drugById } = useEntityMaps()

  const [viewing, setViewing] = useState<Prescription | null>(null)
  const [paying, setPaying] = useState<Prescription | null>(null)

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
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => setViewing(rx)}>
                    <Eye /> View items
                  </DropdownMenuItem>
                  {rx.status === PrescriptionStatus.Ordered && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setPaying(rx)}>
                        <Banknote /> Dispense & collect payment
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
    [recordById, patientById, drugById, cancelPrescription, deletePrescription],
  )

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge variant="info" className="gap-1.5 px-3 py-1.5">
          <Boxes className="size-3.5" />
          {prescriptions.filter((p) => p.status === 'Ordered').length} awaiting dispensing
        </Badge>
        <p className="text-muted-foreground ml-auto text-xs">
          Dispensing deducts stock, issues the invoice and records the payment in one step.
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

      <DispensePaymentDialog
        key={paying?.id ?? 'none'}
        prescription={paying}
        open={paying !== null}
        onOpenChange={() => setPaying(null)}
      />
    </>
  )
}

export default function Pharmacy() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pharmacy"
        description="Drug inventory, batch & expiry tracking, and one-step dispense + payment."
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
