import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  Boxes,
  CalendarClock,
  Eye,
  FlaskConical,
  ScrollText,
  TrendingUp,
} from 'lucide-react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { useHospitalStore } from '@/store/hospitalStore'
import { useAuditStore } from '@/store/auditStore'
import { prescriptionStatusStyle } from '@/lib/status'
import type { Prescription } from '@/types'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { fullName, useEntityMaps } from '@/lib/useEntities'

const PHARMACY_AUDIT_ACTIONS = [
  'DISPENSE_PRESCRIPTION',
  'RESTOCK_DRUG',
  'ADD_DRUG',
  'UPDATE_DRUG',
  'DELETE_DRUG',
  'RECORD_PAYMENT',
]

function daysAgo(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000))
}

function expiryBucket(iso: string): '30d' | '60d' | '90d' | 'later' {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
  if (days <= 30) return '30d'
  if (days <= 60) return '60d'
  if (days <= 90) return '90d'
  return 'later'
}

// ======================= Revenue =======================

function RevenueTab() {
  const payments = useHospitalStore((s) => s.payments)
  const invoices = useHospitalStore((s) => s.invoices)
  const prescriptions = useHospitalStore((s) => s.prescriptions)
  const { drugById } = useEntityMaps()

  const stats = useMemo(() => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setHours(0, 0, 0, 0)
    startOfWeek.setDate(now.getDate() - now.getDay())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const isPharmacyPayment = (invoiceId: string) =>
      invoices
        .find((i) => i.id === invoiceId)
        ?.items.some((it) => it.sourceType === 'Prescription')

    const byDate = (iso: string) => new Date(iso) >= startOfWeek

    return {
      today: payments
        .filter((p) => isPharmacyPayment(p.invoiceId) && new Date(p.paymentDate).toDateString() === now.toDateString())
        .reduce((s, p) => s + p.amount, 0),
      week: payments
        .filter((p) => isPharmacyPayment(p.invoiceId) && byDate(p.paymentDate))
        .reduce((s, p) => s + p.amount, 0),
      month: payments
        .filter((p) => isPharmacyPayment(p.invoiceId) && new Date(p.paymentDate) >= startOfMonth)
        .reduce((s, p) => s + p.amount, 0),
    }
  }, [payments, invoices])

  const topSelling = useMemo(() => {
    const map = new Map<string, { qty: number; revenue: number }>()
    for (const rx of prescriptions) {
      for (const item of rx.items) {
        const drug = drugById.get(item.drugId)
        const entry = map.get(item.drugId) ?? { qty: 0, revenue: 0 }
        entry.qty += item.quantity
        entry.revenue += (drug?.unitPrice ?? 0) * item.quantity
        map.set(item.drugId, entry)
      }
    }
    return Array.from(map.entries())
      .map(([drugId, v]) => ({ drugId, drug: drugById.get(drugId), ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6)
  }, [prescriptions, drugById])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(
          [
            ['Today', stats.today],
            ['This week', stats.week],
            ['This month', stats.month],
          ] as const
        ).map(([label, value]) => (
          <Card key={label} className="gap-2 py-4">
            <CardContent className="px-5">
              <p className="text-muted-foreground text-sm">{label}</p>
              <p className="mt-1 text-2xl font-bold">{formatCurrency(value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="text-emerald-600 size-4" />
            Top-selling drugs (by dispensed revenue)
          </CardTitle>
          <CardDescription>All-time dispensing volume</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Drug</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Units dispensed</TableHead>
                <TableHead>Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topSelling.map((t) => (
                <TableRow key={t.drugId}>
                  <TableCell>
                    <p className="font-medium">{t.drug?.name ?? t.drugId}</p>
                    <p className="text-muted-foreground text-xs">{t.drug?.genericName}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{t.drug?.category ?? '—'}</Badge>
                  </TableCell>
                  <TableCell>{t.qty}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(t.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// ======================= Traceability =======================

function PaymentTrailDialog({
  prescription,
  open,
  onOpenChange,
}: {
  prescription: Prescription | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { recordById, patientById, drugById } = useEntityMaps()
  const invoices = useHospitalStore((s) => s.invoices)
  const payments = useHospitalStore((s) => s.payments)
  const auditLogs = useAuditStore((s) => s.auditLogs)
  const staff = useHospitalStore((s) => s.staff)
  const doctors = useHospitalStore((s) => s.doctors)

  const peopleById = useMemo(() => {
    const map = new Map<string, { firstName: string; lastName: string }>()
    for (const p of [...staff, ...doctors]) map.set(p.id, p)
    return map
  }, [staff, doctors])

  if (!prescription) return null

  const record = recordById.get(prescription.medicalRecordId)
  const invoice = invoices.find((i) => i.items.some((it) => it.sourceReferenceId === prescription.id))
  const trail = payments
    .filter((p) => invoice && p.invoiceId === invoice.id)
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())

  const dispensedBy = peopleById.get(prescription.pharmacistId ?? '')
  const paidByUsers = invoice
    ? auditLogs
        .filter((l) => l.action === 'RECORD_PAYMENT' && l.entityId === invoice.id)
        .map((l) => peopleById.get(l.userId))
    : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Payment trail — {prescription.id}</DialogTitle>
          <DialogDescription>
            {fullName(patientById, record?.patientId)} · {prescription.items.length} item(s)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="rounded-lg border">
            {prescription.items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between border-b px-3 py-2 text-xs last:border-b-0"
              >
                <span className="font-medium">
                  {drugById.get(item.drugId)?.name ?? item.drugId} × {item.quantity}
                </span>
                <span className="text-muted-foreground">
                  {formatCurrency((drugById.get(item.drugId)?.unitPrice ?? 0) * item.quantity)}
                </span>
              </div>
            ))}
            <div className="flex justify-between bg-muted/40 px-3 py-2 font-semibold">
              <span>Linked invoice</span>
              <span className="font-mono">{invoice?.id ?? '—'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-muted-foreground text-xs">Dispensed by</p>
              <p className="mt-0.5 font-medium">
                {dispensedBy ? `${dispensedBy.firstName} ${dispensedBy.lastName}` : '—'}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-muted-foreground text-xs">Paid by</p>
              <p className="mt-0.5 font-medium">
                {paidByUsers.length > 0
                  ? paidByUsers.map((u) => (u ? `${u.firstName} ${u.lastName}` : 'system')).join(', ')
                  : '—'}
              </p>
            </div>
          </div>

          {trail.length > 0 ? (
            <div>
              <p className="text-muted-foreground mb-1.5 text-xs font-semibold uppercase tracking-wide">
                Payments
              </p>
              {trail.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs"
                >
                  <span>
                    <span className="font-medium">{p.paymentMethod}</span>
                    <span className="text-muted-foreground ml-2 font-mono">{p.transactionId}</span>
                    <span className="text-muted-foreground block">{formatDateTime(p.paymentDate)}</span>
                  </span>
                  <span className="font-semibold">{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No payments recorded for this prescription.</p>
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

function TraceabilityTab() {
  const prescriptions = useHospitalStore((s) => s.prescriptions)
  const invoices = useHospitalStore((s) => s.invoices)
  const payments = useHospitalStore((s) => s.payments)
  const staff = useHospitalStore((s) => s.staff)
  const doctors = useHospitalStore((s) => s.doctors)
  const auditLogs = useAuditStore((s) => s.auditLogs)
  const { recordById, patientById, drugById } = useEntityMaps()

  const [viewing, setViewing] = useState<Prescription | null>(null)

  const peopleById = useMemo(() => {
    const map = new Map<string, { firstName: string; lastName: string }>()
    for (const p of [...staff, ...doctors]) map.set(p.id, p)
    return map
  }, [staff, doctors])

  const rows = useMemo(
    () =>
      prescriptions.map((rx) => {
        const record = recordById.get(rx.medicalRecordId)
        const invoice = invoices.find((i) =>
          i.items.some((it) => it.sourceReferenceId === rx.id),
        )
        const total = rx.items.reduce(
          (s, i) => s + (drugById.get(i.drugId)?.unitPrice ?? 0) * i.quantity,
          0,
        )
        const invoiceTotal = invoice ? invoice.totalAmount : Math.round(total * 1.16 * 100) / 100
        const rxPayments = invoice
          ? payments.filter((p) => p.invoiceId === invoice.id)
          : []
        const paymentMethod = rxPayments[0]?.paymentMethod ?? '—'
        const paymentDate = rxPayments[0]?.paymentDate
        const paidBy = invoice
          ? auditLogs.find((l) => l.action === 'RECORD_PAYMENT' && l.entityId === invoice.id)?.userId
          : undefined
        return {
          rx,
          record,
          invoice,
          total: invoiceTotal,
          paymentMethod,
          paymentDate,
          dispensedBy: peopleById.get(rx.pharmacistId ?? ''),
          paidBy: paidBy ? peopleById.get(paidBy) : undefined,
        }
      }),
    [prescriptions, recordById, invoices, payments, drugById, auditLogs, peopleById],
  )

  return (
    <Card className="gap-0 border-0 py-0 shadow-none">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Prescription</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Drugs</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Dispensed by</TableHead>
              <TableHead>Paid by</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ rx, record, total, paymentMethod, paymentDate, dispensedBy, paidBy }) => (
              <TableRow key={rx.id}>
                <TableCell className="font-mono text-xs font-semibold text-teal-700">
                  {rx.id}
                </TableCell>
                <TableCell>
                  <p className="text-sm font-medium">
                    {fullName(patientById, record?.patientId)}
                  </p>
                  <p className="text-muted-foreground text-xs">{record?.patientId}</p>
                </TableCell>
                <TableCell>
                  <p className="max-w-40 truncate text-xs">
                    {rx.items
                      .map((i) => `${drugById.get(i.drugId)?.name ?? i.drugId} ×${i.quantity}`)
                      .join(', ')}
                  </p>
                </TableCell>
                <TableCell className="font-semibold">{formatCurrency(total)}</TableCell>
                <TableCell>
                  <StatusBadge
                    label={rx.status}
                    variant={prescriptionStatusStyle[rx.status].variant}
                    dot={prescriptionStatusStyle[rx.status].dot}
                  />
                </TableCell>
                <TableCell>
                  {paymentMethod !== '—' ? (
                    <div>
                      <p className="text-xs font-medium">{paymentMethod}</p>
                      {paymentDate && (
                        <p className="text-muted-foreground text-[11px]">
                          {formatDate(paymentDate)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {dispensedBy ? `${dispensedBy.firstName} ${dispensedBy.lastName}` : '—'}
                </TableCell>
                <TableCell className="text-xs">
                  {paidBy ? `${paidBy.firstName} ${paidBy.lastName}` : '—'}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => setViewing(rx)}>
                    <Eye />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PaymentTrailDialog
        prescription={viewing}
        open={viewing !== null}
        onOpenChange={() => setViewing(null)}
      />
    </Card>
  )
}

// ======================= Reconciliation =======================

function ReconciliationTab() {
  const invoices = useHospitalStore((s) => s.invoices)
  const payments = useHospitalStore((s) => s.payments)

  const summary = useMemo(() => {
    const methodSums = new Map<string, number>()
    for (const p of payments) {
      methodSums.set(p.paymentMethod, (methodSums.get(p.paymentMethod) ?? 0) + p.amount)
    }

    const pharmacyInvoices = invoices.filter((i) =>
      i.items.some((it) => it.sourceType === 'Prescription'),
    )
    const open = pharmacyInvoices.filter((i) => i.totalAmount - i.amountPaid > 0)
    const aging = { '0-30d': 0, '31-60d': 0, '60d+': 0 }
    for (const inv of open) {
      const age = daysAgo(inv.issuedDate)
      if (age <= 30) aging['0-30d'] += inv.totalAmount - inv.amountPaid
      else if (age <= 60) aging['31-60d'] += inv.totalAmount - inv.amountPaid
      else aging['60d+'] += inv.totalAmount - inv.amountPaid
    }

    const insuranceInvoices = invoices.filter((i) =>
      payments.some((p) => p.invoiceId === i.id && p.paymentMethod === 'Insurance'),
    )
    const insuranceClaimed = insuranceInvoices.reduce((s, i) => s + i.amountPaid, 0)

    return { methodSums, open, aging, insuranceCount: insuranceInvoices.length, insuranceClaimed }
  }, [invoices, payments])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="text-amber-600 size-4" />
              Aging — unpaid prescription invoices
            </CardTitle>
            <CardDescription>Outstanding balances by age bucket</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(
              [
                ['0–30 days', summary.aging['0-30d']],
                ['31–60 days', summary.aging['31-60d']],
                ['60+ days', summary.aging['60d+']],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm"
              >
                <span className="text-muted-foreground">{label}</span>
                <span className={value > 0 ? 'font-semibold text-red-600' : 'font-semibold'}>
                  {formatCurrency(value)}
                </span>
              </div>
            ))}
            <Separator />
            <div className="flex items-center justify-between text-sm font-bold">
              <span>Total outstanding</span>
              <span>
                {formatCurrency(
                  summary.open.reduce((s, i) => s + (i.totalAmount - i.amountPaid), 0),
                )}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Banknote className="text-emerald-600 size-4" />
              Payment method reconciliation
            </CardTitle>
            <CardDescription>Collected amounts by method (all invoices)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from(summary.methodSums.entries()).map(([method, amount]) => (
              <div
                key={method}
                className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm"
              >
                <span className="text-muted-foreground">{method}</span>
                <span className="font-semibold">{formatCurrency(amount)}</span>
              </div>
            ))}
            <Separator />
            <div className="flex items-center justify-between text-sm font-bold">
              <span>Total collected</span>
              <span>
                {formatCurrency(
                  Array.from(summary.methodSums.values()).reduce((a, b) => a + b, 0),
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Insurance claims (tracking)</CardTitle>
          <CardDescription>
            Prescription invoices settled via Insurance — claims follow-up placeholder
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5 text-sm">
            <span className="text-muted-foreground">Claims on file</span>
            <span className="font-semibold">{summary.insuranceCount}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5 text-sm">
            <span className="text-muted-foreground">Amount covered by insurers</span>
            <span className="font-semibold">{formatCurrency(summary.insuranceClaimed)}</span>
          </div>
          <p className="text-muted-foreground text-xs">
            Integration with NHIF/private insurers is planned — claims are tracked locally for now.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ======================= Inventory valuation =======================

function InventoryTab() {
  const drugs = useHospitalStore((s) => s.drugs)
  const prescriptions = useHospitalStore((s) => s.prescriptions)

  const valuation = useMemo(() => {
    const stockValue = drugs.reduce((s, d) => s + d.unitPrice * d.stockQuantity, 0)
    const dispensedQty = prescriptions.reduce(
      (s, rx) => s + rx.items.reduce((q, i) => q + i.quantity, 0),
      0,
    )
    const totalStock = drugs.reduce((s, d) => s + d.stockQuantity, 0)
    const lowStock = drugs.filter((d) => d.stockQuantity <= d.reorderPoint)
    const expiryBuckets = {
      '30d': drugs.filter((d) => expiryBucket(d.expiryDate) === '30d'),
      '60d': drugs.filter((d) => expiryBucket(d.expiryDate) === '60d'),
      '90d': drugs.filter((d) => expiryBucket(d.expiryDate) === '90d'),
    }
    return {
      stockValue,
      turnover: totalStock > 0 ? (dispensedQty / totalStock).toFixed(2) : '0',
      lowStock,
      expiryBuckets,
    }
  }, [drugs, prescriptions])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="gap-2 py-4">
          <CardContent className="px-5">
            <p className="text-muted-foreground text-sm">Current stock value</p>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(valuation.stockValue)}</p>
          </CardContent>
        </Card>
        <Card className="gap-2 py-4">
          <CardContent className="px-5">
            <p className="text-muted-foreground text-sm">Turnover rate</p>
            <p className="mt-1 text-2xl font-bold">{valuation.turnover}×</p>
            <p className="text-muted-foreground text-xs">units dispensed / units held</p>
          </CardContent>
        </Card>
        <Card className="gap-2 py-4">
          <CardContent className="px-5">
            <p className="text-muted-foreground text-sm">Low stock items</p>
            <p className="mt-1 text-2xl font-bold">{valuation.lowStock.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {(
          [
            ['Expiring ≤ 30 days', valuation.expiryBuckets['30d'], 'destructive'],
            ['Expiring 31–60 days', valuation.expiryBuckets['60d'], 'warning'],
            ['Expiring 61–90 days', valuation.expiryBuckets['90d'], 'info'],
          ] as const
        ).map(([label, items, variant]) => (
          <Card key={label} className="gap-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <FlaskConical className="size-4" />
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {items.length === 0 ? (
                <p className="text-muted-foreground py-4 text-center text-xs">None 🎉</p>
              ) : (
                items.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{d.name}</span>
                    <Badge variant={variant as 'destructive' | 'warning' | 'info'}>
                      {formatDate(d.expiryDate)}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="text-amber-600 size-4" />
            Low stock alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Drug</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Reorder point</TableHead>
                <TableHead>Expiry</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {valuation.lowStock.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>
                    <Badge variant={d.stockQuantity === 0 ? 'destructive' : 'warning'}>
                      {d.stockQuantity === 0 ? 'Out of stock' : `${d.stockQuantity} left`}
                    </Badge>
                  </TableCell>
                  <TableCell>{d.reorderPoint}</TableCell>
                  <TableCell>{formatDate(d.expiryDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// ======================= Audit trail =======================

function AuditTrailTab() {
  const auditLogs = useAuditStore((s) => s.auditLogs)
  const staff = useHospitalStore((s) => s.staff)
  const doctors = useHospitalStore((s) => s.doctors)

  const peopleById = useMemo(() => {
    const map = new Map<string, { firstName: string; lastName: string }>()
    for (const p of [...staff, ...doctors]) map.set(p.id, p)
    return map
  }, [staff, doctors])

  const entries = useMemo(
    () =>
      auditLogs
        .filter((l) => PHARMACY_AUDIT_ACTIONS.includes(l.action))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 40),
    [auditLogs],
  )

  return (
    <Card className="gap-0 border-0 py-0 shadow-none">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Changes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((l) => {
              const user = peopleById.get(l.userId)
              return (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatDateTime(l.timestamp)}
                  </TableCell>
                  <TableCell>
                    <p className="text-xs font-medium">
                      {user ? `${user.firstName} ${user.lastName}` : l.userId}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {l.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{l.entityId}</TableCell>
                  <TableCell className="max-w-64">
                    <p className="truncate text-xs" title={l.changes}>
                      {l.changes ?? '—'}
                    </p>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}

export default function PharmacyTracking() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pharmacy Tracking"
        description="Revenue, prescription-to-payment traceability, reconciliation, valuation and audit."
      >
        <Badge variant="outline" className="px-3 py-1">
          Admin module
        </Badge>
      </PageHeader>

      <Tabs defaultValue="revenue">
        <TabsList className="flex-wrap">
          <TabsTrigger value="revenue">
            <TrendingUp /> Revenue
          </TabsTrigger>
          <TabsTrigger value="traceability">
            <ArrowUpRight /> Traceability
          </TabsTrigger>
          <TabsTrigger value="reconciliation">
            <Banknote /> Reconciliation
          </TabsTrigger>
          <TabsTrigger value="inventory">
            <Boxes /> Inventory
          </TabsTrigger>
          <TabsTrigger value="audit">
            <ScrollText /> Audit trail
          </TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="pt-4">
          <RevenueTab />
        </TabsContent>
        <TabsContent value="traceability" className="pt-4">
          <TraceabilityTab />
        </TabsContent>
        <TabsContent value="reconciliation" className="pt-4">
          <ReconciliationTab />
        </TabsContent>
        <TabsContent value="inventory" className="pt-4">
          <InventoryTab />
        </TabsContent>
        <TabsContent value="audit" className="pt-4">
          <AuditTrailTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
