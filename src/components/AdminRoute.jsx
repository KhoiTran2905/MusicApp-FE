import { Navigate, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'

import { authApi, getAccessToken } from '@/lib/api'

export default function AdminRoute() {
  const token = getAccessToken()
  const [allowed, setAllowed] = useState(null)

  useEffect(() => {
    let mounted = true

    if (!token) {
      setAllowed(false)
      return
    }

    // Fetch current user profile and check role
    ;(async () => {
      try {
        const me = await authApi.me()
        if (!mounted) return

        // Support either `role` string or `roles` array
        const roleStr = (me && me.role) || ''
        const rolesArr = Array.isArray(me?.roles) ? me.roles : []

        const isAdmin = String(roleStr).toLowerCase().includes('admin') || rolesArr.some(r => String(r).toLowerCase().includes('admin'))

        setAllowed(Boolean(isAdmin))
      } catch (err) {
        if (!mounted) return
        setAllowed(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [token])

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (allowed === null) {
    return <div className="p-4">Đang kiểm tra quyền...</div>
  }

  if (!allowed) {
    return <div className="p-4 text-red-600">Bạn không có quyền truy cập trang quản trị.</div>
  }

  return <Outlet />
}
