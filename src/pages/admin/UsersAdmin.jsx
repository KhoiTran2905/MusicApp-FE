import { useCallback, useEffect, useState } from 'react'

import { adminApi, apiUtils, authApi } from '@/lib/api'

function getId(item) {
  return item?.id || item?._id
}

function normalizeValue(value) {
  return String(value ?? '').trim().toLowerCase()
}

function isSameUser(left, right) {
  const leftId = normalizeValue(getId(left))
  const rightId = normalizeValue(getId(right))
  if (leftId && rightId && leftId === rightId) return true

  const leftEmail = normalizeValue(left?.email)
  const rightEmail = normalizeValue(right?.email)
  if (leftEmail && rightEmail && leftEmail === rightEmail) return true

  const leftUsername = normalizeValue(left?.username || left?.name)
  const rightUsername = normalizeValue(right?.username || right?.name)
  return Boolean(leftUsername && rightUsername && leftUsername === rightUsername)
}

function isUserBanned(user) {
  if (typeof user?.banned === 'boolean') return user.banned
  if (typeof user?.isBanned === 'boolean') return user.isBanned
  if (typeof user?.blocked === 'boolean') return user.blocked
  if (typeof user?.isBlocked === 'boolean') return user.isBlocked
  if (typeof user?.disabled === 'boolean') return user.disabled
  if (typeof user?.isDisabled === 'boolean') return user.isDisabled
  if (typeof user?.active === 'boolean') return !user.active
  if (typeof user?.enabled === 'boolean') return !user.enabled
  if (typeof user?.isActive === 'boolean') return !user.isActive

  const status = normalizeValue(user?.status || user?.accountStatus || user?.state)
  if (!status) return false

  const bannedStatuses = ['ban', 'banned', 'blocked', 'block', 'inactive', 'disabled', 'disable', 'deactivated', 'locked', 'suspended']
  const activeStatuses = ['active', 'enabled', 'verified', 'normal', 'ok']

  if (bannedStatuses.some((value) => status.includes(value))) return true
  if (activeStatuses.some((value) => status === value || status.includes(value))) return false

  return false
}

export default function UsersAdmin() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentUser, setCurrentUser] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await adminApi.getUsers({ size: 50 })
      setUsers(apiUtils.extractList(data))
    } catch (err) {
      setError(err.message || 'Khong tai duoc danh sach nguoi dung')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      load()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [load])

  useEffect(() => {
    let isMounted = true

    async function loadCurrentUser() {
      try {
        const profile = await authApi.me()
        if (isMounted) {
          setCurrentUser(profile)
        }
      } catch {
        if (isMounted) {
          setCurrentUser(null)
        }
      }
    }

    loadCurrentUser()

    return () => {
      isMounted = false
    }
  }, [])

  async function handleBan(user) {
    if (isSameUser(user, currentUser)) {
      setError('Khong the khoa tai khoan dang dang nhap')
      return
    }

    const reason = prompt('Ly do khoa tai khoan (tuy chon):') || ''
    try {
      await adminApi.banUser(getId(user), { reason })
      await load()
    } catch (err) {
      setError(err.message || 'Khoa tai khoan that bai')
    }
  }

  async function handleUnban(user) {
    if (isSameUser(user, currentUser)) {
      setError('Khong the mo khoa tai khoan dang dang nhap')
      return
    }

    try {
      await adminApi.unbanUser(getId(user))
      await load()
    } catch (err) {
      setError(err.message || 'Mo khoa that bai')
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Quan ly nguoi dung</h1>
      </div>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        {loading ? (
          <p className="text-sm text-slate-500">Dang tai danh sach nguoi dung...</p>
        ) : (
          <div className="space-y-2">
            {users.length === 0 && <p className="text-sm text-slate-500">Khong co nguoi dung.</p>}
            {users.map((u) => {
              const banned = isUserBanned(u)
              const isCurrentUser = isSameUser(u, currentUser)

              return (
                <div key={getId(u)} className="flex items-center justify-between gap-4 border-b py-2">
                  <div>
                    <div className="font-medium">{u.username || u.name || u.email}</div>
                    <div className="text-xs text-slate-500">{u.email} - {u.role || 'User'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isCurrentUser && (
                      banned ? (
                        <button onClick={() => handleUnban(u)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-sm">
                          Mo khoa
                        </button>
                      ) : (
                        <button onClick={() => handleBan(u)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-sm text-red-600">
                          Khoa
                        </button>
                      )
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </section>
    </div>
  )
}
