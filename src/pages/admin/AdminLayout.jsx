import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Layers3, LogOut, ShieldBan, UserCog } from 'lucide-react'

import { authApi, clearAuthTokens } from '@/lib/api'

export default function AdminLayout() {
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await authApi.logout()
    } catch {
      // Ignore and clear local tokens.
    } finally {
      clearAuthTokens()
      navigate('/login')
    }
  }

  const navClass = ({ isActive }) =>
    [
      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition',
      isActive ? 'bg-red-600 text-white' : 'text-slate-700 hover:bg-red-50',
    ].join(' ')

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <div>
            <p className="text-xs uppercase tracking-wider text-red-500">Admin Workspace</p>
            <h1 className="text-xl font-bold text-slate-900">MusicFlow Admin</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/music" className="text-sm font-medium text-slate-600 hover:text-red-600">
              Ve trang User
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" />
              Dang xuat
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[240px_minmax(0,1fr)] md:px-6">
        <aside className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Appsibar Admin</h2>
          <nav className="flex flex-col gap-2">
            <NavLink to="/admin/artists" className={navClass}>
              <Layers3 className="h-4 w-4" />
              Quan ly Artist
            </NavLink>
            <NavLink to="/admin/albums" className={navClass}>
              <Layers3 className="h-4 w-4" />
              Quan ly Album
            </NavLink>
            <NavLink to="/admin/songs" className={navClass}>
              <Layers3 className="h-4 w-4" />
              Quan ly Song
            </NavLink>
            <NavLink to="/admin/accounts" className={navClass}>
              <ShieldBan className="h-4 w-4" />
              Quan ly tai khoan
            </NavLink>
            <NavLink to="/admin/admins" className={navClass}>
              <UserCog className="h-4 w-4" />
              Quan ly admin
            </NavLink>
          </nav>
        </aside>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
