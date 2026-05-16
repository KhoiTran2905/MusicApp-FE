import { useEffect, useState } from 'react'

import { adminApi, apiUtils } from '@/lib/api'

function isUserBanned(user) {
  if (typeof user?.banned === 'boolean') return user.banned
  if (typeof user?.isBanned === 'boolean') return user.isBanned
  if (typeof user?.status === 'string') return user.status.toLowerCase().includes('ban')
  return false
}

export default function AdminAccounts() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  async function loadUsers() {
    setLoading(true)
    setError('')

    try {
      const data = await adminApi.getUsers({ page: 0, size: 200 })
      setUsers(apiUtils.extractList(data))
    } catch (err) {
      setError(err.message || 'Không tải được danh sách tài khoản')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  async function handleBan(user) {
    const reason = prompt('Lý do ban tài khoản (tùy chọn):') || ''

    try {
      await adminApi.banUser(user.id || user._id, { reason })
      await loadUsers()
    } catch (err) {
      setError(err.message || 'Ban tài khoản thất bại')
    }
  }

  async function handleUnban(user) {
    try {
      await adminApi.unbanUser(user.id || user._id)
      await loadUsers()
    } catch (err) {
      setError(err.message || 'Mở ban thất bại')
    }
  }

  const keyword = search.trim().toLowerCase()
  const visibleUsers = users.filter((user) => {
    if (!keyword) return true

    const name = String(user?.username || user?.name || '').toLowerCase()
    const email = String(user?.email || '').toLowerCase()
    return name.includes(keyword) || email.includes(keyword)
  })

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Quản lý tài khoản</h2>
        <p className="mt-1 text-sm text-slate-500">Ban tài khoản hoặc mở ban cho tài khoản người dùng</p>

        <div className="mt-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc email..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
          />
        </div>
      </section>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        {loading ? (
          <p className="text-sm text-slate-500">Đang tải danh sách tài khoản...</p>
        ) : (
          <div className="space-y-2">
            {visibleUsers.length === 0 && <p className="text-sm text-slate-500">Không có tài khoản phù hợp.</p>}

            {visibleUsers.map((user) => {
              const banned = isUserBanned(user)
              return (
                <div
                  key={user.id || user._id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{user.username || user.name || 'No name'}</p>
                    <p className="text-xs text-slate-500">{user.email || 'No email'}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={[
                        'rounded-full px-2 py-1 text-xs font-medium',
                        banned ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700',
                      ].join(' ')}
                    >
                      {banned ? 'Đã ban' : 'Đang hoạt động'}
                    </span>

                    {banned ? (
                      <button
                        onClick={() => handleUnban(user)}
                        className="rounded-lg border px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        Mở ban
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBan(user)}
                        className="rounded-lg border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                      >
                        Ban tài khoản
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>
    </div>
  )
}
