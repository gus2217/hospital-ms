import { useEffect, type ReactNode } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { hasPermission } from '@/lib/permissions'
import type { Permission } from '@/types'

/** Blocks unauthenticated access and redirects to /login, remembering where the user came from. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const currentUser = useAuthStore((s) => s.currentUser)
  const location = useLocation()

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  return <>{children}</>
}

/** Blocks access unless the current user holds the required permission. */
export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission
  children: ReactNode
}) {
  const currentUser = useAuthStore((s) => s.currentUser)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (currentUser && !hasPermission(currentUser.role, permission)) {
      toast.error('You do not have permission to view that page.')
      navigate('/dashboard', { replace: true })
    }
  }, [currentUser, permission, navigate])

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  if (!hasPermission(currentUser.role, permission)) return null
  return <>{children}</>
}
