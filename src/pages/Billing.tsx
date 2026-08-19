import { useMemo, useState } from 'react'
import type { AppColumnDef } from '@/components/DataTable'
import {
  Banknote,
  Eye,
  FileText,
  MoreHorizontal,
  Receipt,
  Send,
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
import { invoiceStatusStyle, paymentMethodLabel } from '@/lib/status'
import { useHospitalStore } from '@/store/hospitalStore'
import {
  InvoiceStatus,
  type Invoice,
  type Payment,
} from '@/types'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { fullName, useEntityMaps } from '@/lib/useEntities'

const PAYMENT_METHODS = ['M-Pesa', 'Card', 'Cash', 'Insurance', 'Bank']

// ======================= Invoice detail =======================

function InvoiceDetailDialog({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: Invoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { patientById, payments } = useEntityMaps()
  if (!invoice) return null

  const invoicePayments = payments
    .filter((p) => p.invoiceId === invoice.id)
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
  const balance = invoice.totalAmount - invoice.amountPaid

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="font-mono">{invoice.id}</DialogTitle>
            <StatusBadge
              label={invoice.status}
              variant={invoiceStatusStyle[invoice.status].variant}
              dot={invoiceStatusStyle[invoice.status].dot}
            />
          </div>
          <DialogDescription>
            {fullName(patientById, invoice.patientId)} · issued{' '}
            {formatDate(invoice.issuedDate)} · due {formatDate(invoice.dueDate)}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[55vh] overflow-y-auto pr-1">
          <div className="space-y-2">
            {invoice.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm"
              >
                <div>
                  <p className="font-medium">{item.description}</p>
                  <p className="text-muted-foreground text-xs">
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                    {item.sourceReferenceId && (
                      <span className="ml-2 font-mono">ref: {item.sourceReferenceId}</span>
                    )}
                  </p>
                </div>
                <p className="font-semibold">{formatCurrency(item.totalPrice)}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-1.5 text-sm">
            <div className="text-muted-foreground flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(invoice.subTotal)}</span>
            </div>
            <div className="text-muted-foreground flex justify-between">
              <span>Tax (16% VAT)</span>
              <span>{formatCurrency(invoice.tax)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatCurrency(invoice.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-emerald-600">
              <span>Paid</span>
              <span>{formatCurrency(invoice.amountPaid)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-bold">
              <span>Balance</span>
              <span className={balance > 0 ? 'text-red-600' : 'text-emerald-600'}>
                {formatCurrency(balance)}
              </span>
            </div>
          </div>

          {invoicePayments.length > 0 && (
            <div className="mt-4">
              <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
                Payment history
              </p>
              <div className="space-y-1.5">
                {invoicePayments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-xs"
                  >
                    <div>
                      <p className="font-medium">
                        {paymentMethodLabel(p.paymentMethod)}
                        {p.transactionId && (
                          <span className="text-muted-foreground ml-2 font-mono">
                            {p.transactionId}
                          </span>
                        )}
                      </p>
                      <p className="text-muted-foreground">{formatDateTime(p.paymentDate)}</p>
                    </div>
                    <p className="font-semibold">{formatCurrency(p.amount)}</p>
                  </div>
                ))}
              </div>
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

// ======================= Record payment =======================

function PaymentDialog({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: Invoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const recordPayment = useHospitalStore((s) => s.recordPayment)
  const { patientById } = useEntityMaps()

  const balance = invoice ? invoice.totalAmount - invoice.amountPaid : 0
  const [amount, setAmount] = useState<number>(balance)
  const [method, setMethod] = useState<string>('M-Pesa')

  function handlePay() {
    if (!invoice || amount <= 0) return
    recordPayment(invoice.id, amount, method)
    toast.success(
      `${formatCurrency(amount)} received from ${fullName(patientById, invoice.patientId)}.`,
    )
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record payment — {invoice?.id}</DialogTitle>
          <DialogDescription>
            {invoice ? `Outstanding balance: ${formatCurrency(balance)}` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="pay-amount">Amount (KES)</Label>
            <Input
              id="pay-amount"
              type="number"
              min={1}
              max={balance}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Payment method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="w-full">
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
          <div className="flex justify-between rounded-lg bg-muted/60 px-3 py-2.5 text-sm">
            <span className="text-muted-foreground">Will be marked as</span>
            <span className="font-semibold">
              {amount >= balance ? 'Paid in full' : 'Partially paid'}
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handlePay} disabled={!amount || amount <= 0}>
            <Banknote /> Record payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ======================= Invoices tab =======================

function InvoicesTab() {
  const invoices = useHospitalStore((s) => s.invoices)
  const deleteInvoice = useHospitalStore((s) => s.deleteInvoice)
  const issueInvoice = useHospitalStore((s) => s.issueInvoice)
  const { patientById } = useEntityMaps()

  const [viewing, setViewing] = useState<Invoice | null>(null)
  const [paying, setPaying] = useState<Invoice | null>(null)

  const totals = useMemo(
    () => ({
      outstanding: invoices.reduce((sum, i) => sum + (i.totalAmount - i.amountPaid), 0),
      overdue: invoices
        .filter((i) => i.status === InvoiceStatus.Overdue)
        .reduce((sum, i) => sum + (i.totalAmount - i.amountPaid), 0),
    }),
    [invoices],
  )

  const columns = useMemo<AppColumnDef<Invoice>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'Invoice',
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
        accessorKey: 'issuedDate',
        header: 'Issued',
        sortFn: 'datetime',
        cell: ({ row }) => (
          <div>
            <p>{formatDate(row.original.issuedDate)}</p>
            <p className="text-muted-foreground text-xs">due {formatDate(row.original.dueDate)}</p>
          </div>
        ),
      },
      {
        accessorKey: 'totalAmount',
        header: 'Total',
        cell: ({ row }) => <span className="font-semibold">{formatCurrency(row.original.totalAmount)}</span>,
      },
      {
        id: 'balance',
        header: 'Balance',
        cell: ({ row }) => {
          const balance = row.original.totalAmount - row.original.amountPaid
          return balance > 0 ? (
            <span className="font-medium text-red-600">{formatCurrency(balance)}</span>
          ) : (
            <span className="text-emerald-600">Settled</span>
          )
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <StatusBadge
            label={row.original.status}
            variant={invoiceStatusStyle[row.original.status].variant}
            dot={invoiceStatusStyle[row.original.status].dot}
          />
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const inv = row.original
          const balance = inv.totalAmount - inv.amountPaid
          return (
            <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => setViewing(inv)}>
                    <Eye /> View invoice
                  </DropdownMenuItem>
                  {balance > 0 && inv.status !== InvoiceStatus.Draft && (
                    <DropdownMenuItem onClick={() => setPaying(inv)}>
                      <Banknote /> Record payment
                    </DropdownMenuItem>
                  )}
                  {inv.status === InvoiceStatus.Draft && (
                    <DropdownMenuItem
                      onClick={() => {
                        issueInvoice(inv.id)
                        toast.success(`${inv.id} issued to patient.`)
                      }}
                    >
                      <Send /> Issue invoice
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      deleteInvoice(inv.id)
                      toast.success(`${inv.id} deleted.`)
                    }}
                  >
                    <Trash2 /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [patientById, issueInvoice, deleteInvoice],
  )

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3">
        <Badge variant="info" className="gap-1.5 px-3 py-1.5">
          <Receipt className="size-3.5" />
          Outstanding: {formatCurrency(totals.outstanding)}
        </Badge>
        <Badge variant="destructive" className="gap-1.5 px-3 py-1.5">
          Overdue: {formatCurrency(totals.overdue)}
        </Badge>
        <p className="text-muted-foreground ml-auto text-xs">
          Invoices are auto-generated when prescriptions are dispensed.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={invoices}
        getRowId={(i) => i.id}
        searchPlaceholder="Search invoice ID or patient…"
        globalFilter={(i, term) =>
          i.id.toLowerCase().includes(term) ||
          fullName(patientById, i.patientId).toLowerCase().includes(term) ||
          i.status.toLowerCase().includes(term)
        }
        onRowClick={(i) => setViewing(i)}
        emptyMessage="No invoices found."
      />

      <InvoiceDetailDialog invoice={viewing} open={viewing !== null} onOpenChange={() => setViewing(null)} />
      <PaymentDialog invoice={paying} open={paying !== null} onOpenChange={() => setPaying(null)} />
    </>
  )
}

// ======================= Payments tab =======================

function PaymentsTab() {
  const payments = useHospitalStore((s) => s.payments)
  const deletePayment = useHospitalStore((s) => s.deletePayment)
  const { invoiceById, patientById } = useEntityMaps()

  const columns = useMemo<AppColumnDef<Payment>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'Payment',
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-teal-700">{row.original.id}</span>
        ),
      },
      {
        accessorKey: 'invoiceId',
        header: 'Invoice',
        cell: ({ row }) => {
          const inv = invoiceById.get(row.original.invoiceId)
          return (
            <div>
              <span className="font-mono text-xs font-medium">{row.original.invoiceId}</span>
              <p className="text-muted-foreground text-xs">
                {inv ? fullName(patientById, inv.patientId) : '—'}
              </p>
            </div>
          )
        },
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ row }) => <span className="font-semibold">{formatCurrency(row.original.amount)}</span>,
      },
      {
        accessorKey: 'paymentMethod',
        header: 'Method',
        cell: ({ row }) => <Badge variant="secondary">{paymentMethodLabel(row.original.paymentMethod)}</Badge>,
      },
      {
        accessorKey: 'paymentDate',
        header: 'Date',
        sortFn: 'datetime',
        cell: ({ row }) => (
          <div>
            <p>{formatDateTime(row.original.paymentDate)}</p>
            {row.original.transactionId && (
              <p className="text-muted-foreground font-mono text-xs">{row.original.transactionId}</p>
            )}
          </div>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive"
              onClick={() => {
                deletePayment(row.original.id)
                toast.info(`${row.original.id} reversed — invoice balance restored.`)
              }}
            >
              <Trash2 />
            </Button>
          </div>
        ),
      },
    ],
    [invoiceById, patientById, deletePayment],
  )

  const collected = useMemo(() => payments.reduce((s, p) => s + p.amount, 0), [payments])

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge variant="success" className="gap-1.5 px-3 py-1.5">
          <Banknote className="size-3.5" />
          Total collected: {formatCurrency(collected)}
        </Badge>
        <p className="text-muted-foreground ml-auto text-xs">
          Reversing a payment restores the invoice balance.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={payments}
        getRowId={(p) => p.id}
        searchPlaceholder="Search payment, invoice or transaction…"
        globalFilter={(p, term) =>
          p.id.toLowerCase().includes(term) ||
          p.invoiceId.toLowerCase().includes(term) ||
          (p.transactionId ?? '').toLowerCase().includes(term) ||
          p.paymentMethod.toLowerCase().includes(term)
        }
        emptyMessage="No payments recorded yet."
      />
    </>
  )
}

export default function Billing() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Invoices, payments, and the full revenue picture."
      >
        <Button variant="outline" disabled>
          <FileText /> Generate invoice
        </Button>
      </PageHeader>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">
            <Receipt /> Invoices
          </TabsTrigger>
          <TabsTrigger value="payments">
            <Banknote /> Payments
          </TabsTrigger>
        </TabsList>
        <TabsContent value="invoices" className="pt-4">
          <Card className="gap-0 border-0 py-0 shadow-none">
            <InvoicesTab />
          </Card>
        </TabsContent>
        <TabsContent value="payments" className="pt-4">
          <Card className="gap-0 border-0 py-0 shadow-none">
            <PaymentsTab />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
