import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Music, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { authApi, getAccessToken } from '@/lib/api'

function AppHeader({ showActions = false }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    setQuery(searchParams.get('q') || '')
  }, [location.search, searchParams])

  useEffect(() => {
    let mounted = true
    const token = getAccessToken()
    if (!token) return

    ;(async () => {
      try {
        const me = await authApi.me()
        if (!mounted) return

        const roleStr = (me && me.role) || ''
        const rolesArr = Array.isArray(me?.roles) ? me.roles : []
        const admin = String(roleStr).toLowerCase().includes('admin') || rolesArr.some(r => String(r).toLowerCase().includes('admin'))
        setIsAdmin(Boolean(admin))
      } catch (err) {
        // ignore
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = query.trim()

    navigate(trimmed ? `/music/search?q=${encodeURIComponent(trimmed)}` : '/music/search')
  }

  return (
    <header className="sticky top-0 z-50 border-b border-red-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full items-center gap-4 px-4 py-3 md:px-6">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <Music className="h-7 w-7 text-red-600" />
          <span className="text-xl font-bold text-red-600">MusicFlow</span>
        </Link>

        <form onSubmit={handleSubmit} className="ml-auto flex w-full max-w-3xl items-center justify-end">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm bài hát, ca sĩ, album..."
              className="h-11 w-full rounded-full border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-red-300 focus:bg-white focus:ring-2 focus:ring-red-100"
            />
          </div>
        </form>
        {isAdmin && (
          <Link to="/admin" className="ml-4 text-sm font-semibold text-red-600 hover:underline">
            Admin
          </Link>
        )}

        {showActions && (
          <div className="hidden shrink-0 items-center gap-3 md:flex">
            <Link to="/login">
              <Button className="border border-red-600 bg-transparent text-red-600 hover:bg-red-50">
                Đăng nhập
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-red-600 text-white hover:bg-red-700">Đăng ký</Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}

export default AppHeader