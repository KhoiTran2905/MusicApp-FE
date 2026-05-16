import { useEffect, useState } from 'react'

import { adminApi, apiUtils } from '@/lib/api'

export default function UsersAdmin() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await adminApi.getUsers({ size: 50 })
      setUsers(apiUtils.extractList(data))
    } catch (err) {
      setError(err.message || 'Không tải được danh sách người dùng')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleBan(user) {
    const reason = prompt('Lý do khóa tài khoản (tùy chọn):') || ''
    try {
      await adminApi.banUser(user.id || user._id, { reason })
      await load()
    } catch (err) {
      setError(err.message || 'Khóa tài khoản thất bại')
    }
  }

  async function handleUnban(user) {
    try {
      await adminApi.unbanUser(user.id || user._id)
      await load()
    } catch (err) {
      setError(err.message || 'Mở khóa thất bại')
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Quản lý Người dùng</h1>
      </div>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        {loading ? (
          <p className="text-sm text-slate-500">Đang tải danh sách người dùng...</p>
        ) : (
          <div className="space-y-2">
            {users.length === 0 && <p className="text-sm text-slate-500">Không có người dùng.</p>}
            {users.map((u) => (
              <div key={u.id || u._id} className="flex items-center justify-between gap-4 border-b py-2">
                <div>
                  <div className="font-medium">{u.username || u.name || u.email}</div>
                  <div className="text-xs text-slate-500">{u.email} • {u.role || 'User'}</div>
                </div>
                <div className="flex items-center gap-2">
                  {u.banned ? (
                    <button onClick={() => handleUnban(u)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-sm">
                      Mở khóa
                    </button>
                  ) : (
                    <button onClick={() => handleBan(u)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-sm text-red-600">
                      Khóa
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </section>
    </div>
  )
}
