import { useMemo, useState } from 'react'
import type { AppColumnDef } from '@/components/DataTable'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FlaskConical,
  MoreHorizontal,
  Plus,
  XCircle,
} from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useHospitalStore } from '@/store/hospitalStore'
import { useAuthStore } from '@/store/authStore'
import { usePermission } from '@/lib/permissions'
import { labTestStatusStyle } from '@/lib/status'
import { LabTestStatus, Permission, type LabTest } from '@/types'
import { formatDateTime } from '@/lib/format'
import { fullName, useEntityMaps } from '@/lib/useEntities'

const LAB_CATEGORIES = [
  'Haematology',
  'Chemistry',
  'Microbiology',
  'Pathology',
  'Immunology',
  'Radiology',
]

function OrderTestDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const authUser = useAuthStore((s) => s.currentUser)
  const addLabTest = useHospitalStore((s) => s.addLabTest)
  const { patients } = useEntityMaps()

  const [patientId, setPatientId] = useState('')
  const [testName, setTestName] = useState('')
  const [testCategory, setTestCategory] = useState('Haematology')
  const [notes, setNotes] = useState('')

  const valid = patientId && testName.trim()

  function handleOrder() {
    if (!valid) return
    const isDoctor = useHospitalStore
      .getState()
      .doctors.some((d) => d.id === authUser?.id)
    const doctorId = isDoctor && authUser ? authUser.id : 'DOC-002'
    addLabTest({
      patientId,
      doctorId,
      testName: testName.trim(),
      testCategory,
      notes: notes.trim() || undefined,
    })
    toast.success(`${testName.trim()} ordered for the laboratory.`)
    onOpenChange(false)
    setPatientId('')
    setTestName('')
    setNotes('')
    setTestCategory('Haematology')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Order lab test</DialogTitle>
          <DialogDescription>Queue a test for the laboratory.</DialogDescription>
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
            <Label>Test name</Label>
            <Input
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="e.g. Complete Blood Count"
            />
          </div>
          <div className="grid gap-2">
            <Label>Category</Label>
            <Select value={testCategory} onValueChange={setTestCategory}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LAB_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Clinical context for the lab…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleOrder} disabled={!valid}>
            <Plus /> Order test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ResultDialog({
  test,
  open,
  onOpenChange,
}: {
  test: LabTest | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const updateLabTest = useHospitalStore((s) => s.updateLabTest)
  const [result, setResult] = useState('')
  const [isAbnormal, setIsAbnormal] = useState(false)

  const valid = result.trim()

  function handleSave() {
    if (!test || !valid) return
    updateLabTest(test.id, {
      status: LabTestStatus.Completed,
      result: result.trim(),
      isAbnormal,
    })
    toast.success(`${test.id} completed — result recorded.`)
    onOpenChange(false)
    setResult('')
    setIsAbnormal(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enter result — {test?.id}</DialogTitle>
          <DialogDescription>{test?.testName} · {test?.testCategory}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Result</Label>
            <Textarea
              value={result}
              onChange={(e) => setResult(e.target.value)}
              placeholder="Measured values and interpretation…"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="abnormal"
              checked={isAbnormal}
              onCheckedChange={(v) => setIsAbnormal(Boolean(v))}
            />
            <Label htmlFor="abnormal">Flag as abnormal</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!valid}>
            <CheckCircle2 /> Complete test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function Lab() {
  const labTests = useHospitalStore((s) => s.labTests)
  const updateLabTest = useHospitalStore((s) => s.updateLabTest)
  const staff = useHospitalStore((s) => s.staff)
  const { patientById, doctorById } = useEntityMaps()

  const staffById = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff])

  const canOrder = usePermission(Permission.ORDER_LAB_TEST)
  const canManage = usePermission(Permission.MANAGE_LAB_TESTS)

  const [statusFilter, setStatusFilter] = useState<'All' | LabTestStatus>('All')
  const [orderOpen, setOrderOpen] = useState(false)
  const [viewing, setViewing] = useState<LabTest | null>(null)
  const [resulting, setResulting] = useState<LabTest | null>(null)

  const filtered = useMemo(
    () =>
      statusFilter === 'All'
        ? labTests
        : labTests.filter((t) => t.status === statusFilter),
    [labTests, statusFilter],
  )

  const summary = useMemo(() => {
    const now = new Date().toDateString()
    return {
      pending: labTests.filter((t) => t.status === LabTestStatus.Ordered).length,
      inProgress: labTests.filter((t) => t.status === LabTestStatus.InProgress).length,
      completedToday: labTests.filter(
        (t) => t.status === LabTestStatus.Completed && new Date(t.completedAt ?? '').toDateString() === now,
      ).length,
      abnormal: labTests.filter((t) => t.isAbnormal).length,
    }
  }, [labTests])

  const columns = useMemo<AppColumnDef<LabTest>[]>(
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
        accessorKey: 'testName',
        header: 'Test',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.testName}</p>
            <p className="text-muted-foreground text-xs">{row.original.testCategory}</p>
          </div>
        ),
      },
      {
        accessorKey: 'doctorId',
        header: 'Ordered by',
        cell: ({ row }) => (
          <div>
            <p className="text-sm">{fullName(doctorById, row.original.doctorId)}</p>
            <p className="text-muted-foreground text-xs">
              {formatDateTime(row.original.orderedAt)}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const t = row.original
          return (
            <div className="flex items-center gap-2">
              <StatusBadge
                label={t.status}
                variant={labTestStatusStyle[t.status].variant}
                dot={labTestStatusStyle[t.status].dot}
              />
              {t.isAbnormal && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="size-3" /> Abnormal
                </Badge>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'performedBy',
        header: 'Performed by',
        cell: ({ row }) => {
          const staffId = row.original.performedBy
          const name = staffId ? fullName(staffById, staffId) : '—'
          return <span className="text-muted-foreground text-xs">{name}</span>
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const t = row.original
          return (
            <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => setViewing(t)}>
                    <Eye /> View details
                  </DropdownMenuItem>
                  {canManage && t.status !== LabTestStatus.Completed && t.status !== LabTestStatus.Cancelled && (
                    <>
                      <DropdownMenuSeparator />
                      {t.status === LabTestStatus.Ordered && (
                        <DropdownMenuItem
                          onClick={() => {
                            updateLabTest(t.id, { status: LabTestStatus.InProgress })
                            toast.info(`${t.id} marked in progress.`)
                          }}
                        >
                          <ClipboardCheck /> Start processing
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setResulting(t)}>
                        <CheckCircle2 /> Enter result
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => {
                          updateLabTest(t.id, { status: LabTestStatus.Cancelled })
                          toast.info(`${t.id} cancelled.`)
                        }}
                      >
                        <XCircle /> Cancel test
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
    [patientById, doctorById, staffById, canManage, updateLabTest],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laboratory"
        description="Order tests, process samples and record results."
      >
        {canOrder && (
          <Button onClick={() => setOrderOpen(true)}>
            <Plus /> Order lab test
          </Button>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Card className="gap-2 py-4">
          <div className="flex items-center justify-between px-5">
            <div>
              <p className="text-muted-foreground text-sm">Pending tests</p>
              <p className="mt-1 text-2xl font-bold">{summary.pending}</p>
            </div>
            <FlaskConical className="text-sky-600 size-5" />
          </div>
        </Card>
        <Card className="gap-2 py-4">
          <div className="flex items-center justify-between px-5">
            <div>
              <p className="text-muted-foreground text-sm">In progress</p>
              <p className="mt-1 text-2xl font-bold">{summary.inProgress}</p>
            </div>
            <ClipboardCheck className="text-violet-600 size-5" />
          </div>
        </Card>
        <Card className="gap-2 py-4">
          <div className="flex items-center justify-between px-5">
            <div>
              <p className="text-muted-foreground text-sm">Completed today</p>
              <p className="mt-1 text-2xl font-bold">{summary.completedToday}</p>
            </div>
            <CheckCircle2 className="text-emerald-600 size-5" />
          </div>
        </Card>
        <Card className="gap-2 py-4">
          <div className="flex items-center justify-between px-5">
            <div>
              <p className="text-muted-foreground text-sm">Abnormal results</p>
              <p className="mt-1 text-2xl font-bold">{summary.abnormal}</p>
            </div>
            <AlertTriangle className="text-rose-600 size-5" />
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['All', ...Object.values(LabTestStatus)] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={
              statusFilter === tab
                ? 'cursor-pointer rounded-full border border-primary bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm'
                : 'bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors'
            }
          >
            {tab}
          </button>
        ))}
      </div>

      <Card className="gap-0 border-0 py-0 shadow-none">
        <DataTable
          columns={columns}
          data={filtered}
          getRowId={(t) => t.id}
          searchPlaceholder="Search patient, test or category…"
          globalFilter={(t, term) =>
            fullName(patientById, t.patientId).toLowerCase().includes(term) ||
            t.testName.toLowerCase().includes(term) ||
            t.testCategory.toLowerCase().includes(term) ||
            t.id.toLowerCase().includes(term)
          }
          onRowClick={(t) => setViewing(t)}
          emptyMessage="No lab tests match this filter."
        />
      </Card>

      <OrderTestDialog open={orderOpen} onOpenChange={setOrderOpen} />

      <Dialog open={viewing !== null} onOpenChange={() => setViewing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{viewing?.id}</DialogTitle>
            <DialogDescription>
              {viewing ? `${viewing.testName} · ${viewing.testCategory}` : ''}
            </DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Patient:{' '}
                <span className="font-medium text-foreground">
                  {fullName(patientById, viewing.patientId)}
                </span>
              </p>
              <p className="text-muted-foreground">
                Ordered by:{' '}
                <span className="font-medium text-foreground">
                  {fullName(doctorById, viewing.doctorId)}
                </span>{' '}
                · {formatDateTime(viewing.orderedAt)}
              </p>
              {viewing.result && (
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wide">
                    Result
                  </p>
                  <p className="font-medium">{viewing.result}</p>
                  {viewing.isAbnormal && (
                    <Badge variant="destructive" className="mt-2">
                      <AlertTriangle className="size-3" /> Abnormal
                    </Badge>
                  )}
                </div>
              )}
              {viewing.notes && (
                <p className="text-muted-foreground rounded-lg bg-muted/50 p-3">
                  {viewing.notes}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ResultDialog test={resulting} open={resulting !== null} onOpenChange={() => setResulting(null)} />
    </div>
  )
}
