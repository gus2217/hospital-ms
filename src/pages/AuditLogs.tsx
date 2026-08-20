import { useMemo, useState } from 'react'
import { Download, Printer, ShieldAlert, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuditStore } from '@/store/auditStore'
import { useHospitalStore } from '@/store/hospitalStore'
import { ROLE_LABELS } from '@/lib/roles'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const ACTIONS = [
  'LOGIN',
  'FAILED_LOGIN',
  'CREATE_PATIENT',
  'CREATE_MEDICAL_RECORD',
  'ORDER_LAB_TEST',
  'UPDATE_LAB_RESULT',
  'DISPENSE_PRESCRIPTION',
  'RECORD_PAYMENT',
  'RESTOCK_DRUG',
  'ADD_DRUG',
  'UPDATE_DRUG',
  'DELETE_DRUG',
  'ADMIT_PATIENT',
  'DISCHARGE_PATIENT',
  'UPDATE_NURSING_NOTES',
]

function isOffHours(iso: string): boolean {
  const h = new Date(iso).getHours()
  return h < 6 || h >= 22
}

export default function AuditLogs() {
  const auditLogs = useAuditStore((s) => s.auditLogs)
  const staff = useHospitalStore((s) => s.staff)
  const doctors = useHospitalStore((s) => s.doctors)

  const [userFilter, setUserFilter] = useState('all')
  const [entityFilter, setEntityFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [search, setSearch] = useState('')
  const [suspiciousOnly, setSuspiciousOnly] = useState(false)

  const people = useMemo(() => [...staff, ...doctors], [staff, doctors])
  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people])

  const entityTypes = useMemo(
    () => Array.from(new Set(auditLogs.map((l) => l.entityType))).sort(),
    [auditLogs],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return auditLogs.filter((log) => {
      if (userFilter !== 'all' && log.userId !== userFilter) return false
      if (entityFilter !== 'all' && log.entityType !== entityFilter) return false
      if (actionFilter !== 'all' && log.action !== actionFilter) return false
      if (fromDate && new Date(log.timestamp) < new Date(fromDate)) return false
      if (toDate && new Date(log.timestamp) > new Date(toDate + 'T23:59:59')) return false
      if (suspiciousOnly && !log.flagged && !isOffHours(log.timestamp)) return false
      if (term) {
        const user = peopleById.get(log.userId)
        const haystack = [
          log.id,
          log.action,
          log.entityType,
          log.entityId,
          log.changes ?? '',
          log.ipAddress ?? '',
          user ? `${user.firstName} ${user.lastName}` : log.userId,
        ]
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(term)) return false
      }
      return true
    })
  }, [auditLogs, userFilter, entityFilter, actionFilter, fromDate, toDate, suspiciousOnly, search, peopleById])

  const suspiciousCount = useMemo(
    () => auditLogs.filter((l) => l.flagged || isOffHours(l.timestamp)).length,
    [auditLogs],
  )

  function exportCsv() {
    const header = ['ID', 'Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'Changes', 'IP Address', 'Flagged']
    const rows = filtered.map((l) => {
      const user = peopleById.get(l.userId)
      return [
        l.id,
        new Date(l.timestamp).toISOString(),
        user ? `${user.firstName} ${user.lastName} (${l.userId})` : l.userId,
        l.action,
        l.entityType,
        l.entityId,
        (l.changes ?? '').replace(/"/g, '""'),
        l.ipAddress ?? '',
        l.flagged || isOffHours(l.timestamp) ? 'YES' : '',
      ]
    })
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${c}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${rows.length} audit log entries to CSV.`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Full trace of system activity with suspicious-activity flagging."
      >
        <Badge
          variant={suspiciousCount > 0 ? 'destructive' : 'success'}
          className="gap-1.5 px-3 py-1.5"
        >
          <ShieldAlert className="size-3.5" />
          {suspiciousCount} flagged {suspiciousCount === 1 ? 'event' : 'events'}
        </Badge>
        <Button variant="outline" onClick={exportCsv}>
          <Download /> Export CSV
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer /> Print / PDF
        </Button>
      </PageHeader>

      {/* Filters */}
      <Card className="gap-4 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-2">
            <Label>User</Label>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {people.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} · {ROLE_LABELS[p.role]}
                  </SelectItem>
                ))}
                <SelectItem value="unknown">Unknown / system</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Entity</Label>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entities</SelectItem>
                {entityTypes.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Action</Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Search</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ID, user, changes, IP…"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="grid gap-2">
            <Label>From</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>To</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <Button
            variant={suspiciousOnly ? 'default' : 'outline'}
            onClick={() => setSuspiciousOnly((v) => !v)}
            className="gap-2"
          >
            <ShieldAlert className="size-4" />
            Suspicious only
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setUserFilter('all')
              setEntityFilter('all')
              setActionFilter('all')
              setFromDate('')
              setToDate('')
              setSearch('')
              setSuspiciousOnly(false)
            }}
          >
            Clear filters
          </Button>
          <p className="text-muted-foreground ml-auto text-sm">
            {filtered.length} of {auditLogs.length} entries
          </p>
        </div>
      </Card>

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
                <TableHead>Source</TableHead>
                <TableHead>Flag</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <p className="text-muted-foreground text-sm">No audit entries match the filters.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((log) => {
                  const user = peopleById.get(log.userId)
                  const suspicious = log.flagged || isOffHours(log.timestamp)
                  return (
                    <TableRow key={log.id} className={cn(suspicious && 'bg-red-50/60')}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatDateTime(log.timestamp)}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">
                          {user ? `${user.firstName} ${user.lastName}` : log.userId}
                        </p>
                        <p className="text-muted-foreground font-mono text-[10px]">{log.userId}</p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.action === 'FAILED_LOGIN'
                              ? 'destructive'
                              : log.action === 'LOGIN'
                                ? 'info'
                                : 'secondary'
                          }
                          className="font-mono text-[10px]"
                        >
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs font-medium">{log.entityType}</p>
                        <p className="text-muted-foreground font-mono text-[10px]">{log.entityId}</p>
                      </TableCell>
                      <TableCell className="max-w-56">
                        <p className="truncate text-xs" title={log.changes}>
                          {log.changes ?? '—'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="font-mono text-[10px]">{log.ipAddress}</p>
                        <p className="text-muted-foreground max-w-40 truncate text-[10px]">
                          {log.userAgent}
                        </p>
                      </TableCell>
                      <TableCell>
                        {suspicious ? (
                          <Badge variant="destructive" className="gap-1">
                            <ShieldAlert className="size-3" />
                            {log.flagged ? 'Flagged' : 'Off-hours'}
                          </Badge>
                        ) : (
                          <Badge variant="success" className="gap-1">
                            <ShieldCheck className="size-3" /> OK
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
