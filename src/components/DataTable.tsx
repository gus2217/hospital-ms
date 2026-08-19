import { useMemo, useState } from 'react'
import {
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnDef,
  type PaginationState,
  type RowData,
  type SortingState,
} from '@tanstack/react-table'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  SearchIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * TanStack Table v9 feature registry — sorting + client-side pagination.
 * Shared by every page table via `AppColumnDef`.
 */
export const features = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
})

export type AppColumnDef<TData extends RowData, TValue = unknown> = ColumnDef<
  typeof features,
  TData,
  TValue
>

interface DataTableProps<TData extends RowData> {
  columns: AppColumnDef<TData>[]
  data: TData[]
  getRowId: (row: TData) => string
  /** Optional global search. Receives the row and the lower-cased term. */
  globalFilter?: (row: TData, term: string) => boolean
  searchPlaceholder?: string
  toolbar?: React.ReactNode
  pageSize?: number
  onRowClick?: (row: TData) => void
  emptyMessage?: string
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  getRowId,
  globalFilter,
  searchPlaceholder = 'Search…',
  toolbar,
  pageSize = 8,
  onRowClick,
  emptyMessage = 'No records found.',
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize })
  const [search, setSearch] = useState('')

  const filteredData = useMemo(() => {
    if (!globalFilter || !search.trim()) return data
    const term = search.trim().toLowerCase()
    return data.filter((row) => globalFilter(row, term))
  }, [data, search, globalFilter])

  const table = useTable({
    features,
    columns,
    data: filteredData,
    getRowId,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
  })

  const pageIndex = table.state.pagination.pageIndex
  const pageCount = table.getPageCount()
  const totalRows = filteredData.length
  const from = totalRows === 0 ? 0 : pageIndex * pageSize + 1
  const to = Math.min(totalRows, (pageIndex + 1) * pageSize)

  return (
    <div className="space-y-4">
      {(globalFilter || toolbar) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {globalFilter ? (
            <div className="relative w-full sm:max-w-xs">
              <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPagination((p) => ({ ...p, pageIndex: 0 }))
                }}
                placeholder={searchPlaceholder}
                className="pl-9"
              />
            </div>
          ) : (
            <div />
          )}
          {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/40 hover:bg-muted/40">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sortDir = header.column.getIsSorted()
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                          className={cn(
                            'flex items-center gap-1.5 uppercase tracking-wide text-[11px]',
                            canSort && 'cursor-pointer hover:text-foreground',
                          )}
                        >
                          <table.FlexRender header={header} />
                          {canSort &&
                            (sortDir === 'asc' ? (
                              <ArrowUp className="size-3.5" />
                            ) : sortDir === 'desc' ? (
                              <ArrowDown className="size-3.5" />
                            ) : (
                              <ArrowUpDown className="size-3.5 opacity-40" />
                            ))}
                        </button>
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-12 text-center">
                  <p className="text-muted-foreground text-sm">{emptyMessage}</p>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={onRowClick ? 'cursor-pointer' : undefined}
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Showing <span className="font-medium text-foreground">{from}</span>–
            <span className="font-medium text-foreground">{to}</span> of{' '}
            <span className="font-medium text-foreground">{totalRows}</span>
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeftIcon />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeftIcon />
            </Button>
            <span className="text-muted-foreground px-2 text-xs">
              Page {pageIndex + 1} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRightIcon />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.setPageIndex(pageCount - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRightIcon />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
