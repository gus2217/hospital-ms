import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { VariantProps } from 'class-variance-authority'
import type { badgeVariants } from '@/components/ui/badge'

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>

interface StatusBadgeProps {
  label: string
  variant?: BadgeVariant
  dot?: string
}

export function StatusBadge({ label, variant = 'slate', dot }: StatusBadgeProps) {
  return (
    <Badge variant={variant} className="gap-1.5 px-2.5 py-1">
      {dot && <span className={cn('size-1.5 rounded-full', dot)} />}
      {label}
    </Badge>
  )
}

interface PageHeaderProps {
  title: string
  description?: string
  children?: ReactNode
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}
