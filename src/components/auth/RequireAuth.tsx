import { useEffect, type ReactNode } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import type { UserRole } from '@/types'

/** Blocks unauthenticated access and redirects to /login, remembering where the user came from. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const currentUser = useAuthStore((s) => s.currentUser)
  const location = useLocation()

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  return <>{children}</>
}

/** Blocks access unless the current user holds one of the allowed roles. */
export function RequireRole({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const currentUser = useAuthStore((s) => s.currentUser)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (currentUser && !roles.includes(currentUser.role)) {
      toast.error('You do not have permission to view that page.')
      navigate('/dashboard', { replace: true })
    }
  }, [currentUser, roles, navigate])

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  if (!roles.includes(currentUser.role)) return null
  return <>{children}</>
}
