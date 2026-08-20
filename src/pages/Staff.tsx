import { useMemo, useState } from 'react'
import {
  Award,
  Briefcase,
  CalendarClock,
  Check,
  Minus,
  Plus,
  Star,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useHospitalStore } from '@/store/hospitalStore'
import { ROLE_LABELS } from '@/lib/roles'
import { UserRole } from '@/types'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const SHIFT_COLORS: Record<string, string> = {
  Day: 'bg-sky-50 text-sky-700 border-sky-200',
  Night: 'bg-violet-50 text-violet-700 border-violet-200',
  Off: 'bg-muted text-muted-foreground border-transparent',
}

function DirectoryTab() {
  const staff = useHospitalStore((s) => s.staff)
  const doctors = useHospitalStore((s) => s.doctors)
  const people = useMemo(() => [...staff, ...doctors], [staff, doctors])

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead>Staff member</TableHead>
            <TableHead>Employee ID</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Hire date</TableHead>
            <TableHead>Contact</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {people.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <p className="font-medium">
                  {p.firstName} {p.lastName}
                </p>
                <p className="text-muted-foreground text-xs">{p.email}</p>
              </TableCell>
              <TableCell className="font-mono text-xs">{p.employeeId ?? '—'}</TableCell>
              <TableCell>{p.department ?? '—'}</TableCell>
              <TableCell>
                <Badge variant="secondary">{ROLE_LABELS[p.role] ?? p.role}</Badge>
              </TableCell>
              <TableCell>{p.hireDate ? formatDate(p.hireDate) : '—'}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{p.phoneNumber ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function LeaveTab() {
  const staffRecords = useHospitalStore((s) => s.staffRecords)
  const staff = useHospitalStore((s) => s.staff)
  const doctors = useHospitalStore((s) => s.doctors)
  const updateStaffRecord = useHospitalStore((s) => s.updateStaffRecord)

  const peopleById = useMemo(() => {
    const map = new Map<string, { firstName: string; lastName: string; role: UserRole }>()
    for (const p of [...staff, ...doctors]) map.set(p.id, p)
    return map
  }, [staff, doctors])

  function adjust(id: string, delta: number) {
    const record = staffRecords.find((r) => r.id === id)
    if (!record) return
    const next = Math.max(0, record.leaveBalance + delta)
    updateStaffRecord(id, { leaveBalance: next })
    toast.success(
      `${peopleById.get(id)?.firstName} ${peopleById.get(id)?.lastName} leave balance → ${next} days.`,
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead>Staff member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Leave balance (days)</TableHead>
            <TableHead className="text-right">Adjust</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staffRecords.map((r) => {
            const person = peopleById.get(r.id)
            if (!person) return null
            return (
              <TableRow key={r.id}>
                <TableCell>
                  <p className="font-medium">
                    {person.firstName} {person.lastName}
                  </p>
                  <p className="text-muted-foreground text-xs">{r.id}</p>
                </TableCell>
                <TableCell>{ROLE_LABELS[person.role] ?? person.role}</TableCell>
                <TableCell>
                  <Badge variant={r.leaveBalance < 10 ? 'warning' : 'success'}>
                    {r.leaveBalance} days
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1.5">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-7"
                      onClick={() => adjust(r.id, -1)}
                    >
                      <Minus />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-7"
                      onClick={() => adjust(r.id, 1)}
                    >
                      <Plus />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function PerformanceTab() {
  const staffRecords = useHospitalStore((s) => s.staffRecords)
  const staff = useHospitalStore((s) => s.staff)
  const doctors = useHospitalStore((s) => s.doctors)
  const updateStaffRecord = useHospitalStore((s) => s.updateStaffRecord)

  const peopleById = useMemo(() => {
    const map = new Map<string, { firstName: string; lastName: string; role: UserRole }>()
    for (const p of [...staff, ...doctors]) map.set(p.id, p)
    return map
  }, [staff, doctors])

  const [ratings, setRatings] = useState<Record<string, string>>({})

  function saveRating(id: string) {
    const value = Number(ratings[id])
    if (Number.isNaN(value) || value < 1 || value > 5) {
      toast.error('Rating must be between 1 and 5.')
      return
    }
    updateStaffRecord(id, { performanceRating: Math.round(value * 10) / 10 })
    toast.success(`${peopleById.get(id)?.firstName}'s appraisal saved (${value.toFixed(1)}/5).`)
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead>Staff member</TableHead>
            <TableHead>Certifications</TableHead>
            <TableHead>Current rating</TableHead>
            <TableHead>New appraisal</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staffRecords.map((r) => {
            const person = peopleById.get(r.id)
            if (!person) return null
            return (
              <TableRow key={r.id}>
                <TableCell>
                  <p className="font-medium">
                    {person.firstName} {person.lastName}
                  </p>
                  <p className="text-muted-foreground text-xs">{r.id}</p>
                </TableCell>
                <TableCell>
                  <div className="flex max-w-64 flex-wrap gap-1">
                    {r.certifications.length === 0 && (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                    {r.certifications.map((c) => (
                      <Badge key={c} variant="secondary" className="text-[10px]">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1 font-medium">
                    {r.performanceRating ? (
                      <>
                        <Star className="size-4 fill-amber-400 text-amber-400" />
                        {r.performanceRating.toFixed(1)}
                      </>
                    ) : (
                      'Not rated'
                    )}
                  </span>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    step={0.1}
                    placeholder="1 – 5"
                    className="w-24"
                    value={ratings[r.id] ?? ''}
                    onChange={(e) => setRatings((m) => ({ ...m, [r.id]: e.target.value }))}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => saveRating(r.id)}>
                    <Check /> Save
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function ShiftsTab() {
  const staffRecords = useHospitalStore((s) => s.staffRecords)
  const staff = useHospitalStore((s) => s.staff)
  const doctors = useHospitalStore((s) => s.doctors)

  const peopleById = useMemo(() => {
    const map = new Map<string, { firstName: string; lastName: string }>()
    for (const p of [...staff, ...doctors]) map.set(p.id, p)
    return map
  }, [staff, doctors])

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead>Staff member</TableHead>
            {days.map((d) => (
              <TableHead key={d} className="text-center">
                {d}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {staffRecords.map((r) => {
            const person = peopleById.get(r.id)
            if (!person) return null
            const schedule = new Map(r.shiftSchedule.map((s) => [s.day, s.shift]))
            return (
              <TableRow key={r.id}>
                <TableCell>
                  <p className="font-medium">
                    {person.firstName} {person.lastName}
                  </p>
                  <p className="text-muted-foreground text-xs">{r.id}</p>
                </TableCell>
                {days.map((d) => {
                  const shift = schedule.get(d) ?? 'Off'
                  return (
                    <TableCell key={d} className="text-center">
                      <span
                        className={cn(
                          'inline-block rounded-full border px-2.5 py-1 text-[11px] font-medium',
                          SHIFT_COLORS[shift] ?? SHIFT_COLORS.Off,
                        )}
                      >
                        {shift}
                      </span>
                    </TableCell>
                  )
                })}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export default function Staff() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Management"
        description="Directory, leave balances, performance appraisals and shift schedules."
      />

      <Tabs defaultValue="directory">
        <TabsList>
          <TabsTrigger value="directory">
            <Briefcase /> Directory
          </TabsTrigger>
          <TabsTrigger value="leave">
            <CalendarClock /> Leave
          </TabsTrigger>
          <TabsTrigger value="performance">
            <Award /> Performance
          </TabsTrigger>
          <TabsTrigger value="shifts">
            <Star /> Shifts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="pt-4">
          <Card className="gap-0 border-0 py-0 shadow-none">
            <DirectoryTab />
          </Card>
        </TabsContent>

        <TabsContent value="leave" className="pt-4">
          <Card className="gap-0 border-0 py-0 shadow-none">
            <LeaveTab />
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="pt-4">
          <Card className="gap-0 border-0 py-0 shadow-none">
            <PerformanceTab />
          </Card>
        </TabsContent>

        <TabsContent value="shifts" className="pt-4">
          <Card className="gap-0 border-0 py-0 shadow-none">
            <ShiftsTab />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
