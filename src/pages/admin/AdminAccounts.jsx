/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import { ArrowDownUp, Edit, Search } from 'lucide-react'
import { toast } from 'sonner'

import { adminApi, apiUtils, authApi } from '@/lib/api'

const PAGE_SIZE = 10

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

function getTotalPages(data, itemsLength, size) {
  return Math.max(1, data?.totalPages ?? data?.page?.totalPages ?? Math.ceil((data?.totalElements ?? itemsLength) / size))
}

export default function AdminAccounts() {
  const [users, setUsers] = useState([])
  const [pageData, setPageData] = useState({ totalPages: 1, totalElements: 0 })
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState('username,asc')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingUser, setEditingUser] = useState(null)
  const [editForm, setEditForm] = useState({ username: '', email: '', role: 'USER' })
  const [saving, setSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(0)
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [search])

  async function loadUsers() {
    setLoading(true)
    setError('')

    try {
      const data = await adminApi.getUsers({ page, size: PAGE_SIZE, sort, q: debouncedSearch })
      const items = apiUtils.extractList(data)
      setUsers(items)
      setPageData({
        totalPages: getTotalPages(data, items.length, PAGE_SIZE),
        totalElements: data?.totalElements ?? data?.page?.totalElements ?? items.length,
      })
    } catch (err) {
      const message = err.message || 'Khong tai duoc danh sach tai khoan.'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [page, sort, debouncedSearch])

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

  function changeSort(field) {
    setPage(0)
    setSort((currentSort) => {
      const [currentField, currentDirection] = currentSort.split(',')
      const nextDirection = currentField === field && currentDirection === 'asc' ? 'desc' : 'asc'
      return `${field},${nextDirection}`
    })
  }

  function openEdit(user) {
    setEditingUser(user)
    setEditForm({
      username: user?.username || user?.name || '',
      email: user?.email || '',
      role: user?.role || 'USER',
    })
  }

  async function submitEdit(e) {
    e.preventDefault()
    if (!editingUser) return

    setSaving(true)
    setError('')
    try {
      await adminApi.updateUser(getId(editingUser), {
        username: editForm.username.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
      })
      toast.success('Cap nhat tai khoan thanh cong.')
      setEditingUser(null)
      await loadUsers()
    } catch (err) {
      const message = err.message || 'Cap nhat tai khoan that bai.'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleBan(user) {
    if (isSameUser(user, currentUser)) {
      toast.error('Khong the ban tai khoan dang dang nhap.')
      return
    }

    const reason = prompt('Ly do ban tai khoan (tuy chon):') || ''

    try {
      await adminApi.banUser(getId(user), { reason })
      toast.success('Da ban tai khoan.')
      await loadUsers()
    } catch (err) {
      const message = err.message || 'Ban tai khoan that bai.'
      setError(message)
      toast.error(message)
    }
  }

  async function handleUnban(user) {
    if (isSameUser(user, currentUser)) {
      toast.error('Khong the mo ban tai khoan dang dang nhap.')
      return
    }

    try {
      await adminApi.unbanUser(getId(user))
      toast.success('Da mo ban tai khoan.')
      await loadUsers()
    } catch (err) {
      const message = err.message || 'Mo ban that bai.'
      setError(message)
      toast.error(message)
    }
  }

  const pageNumbers = useMemo(() => {
    const totalPages = pageData.totalPages
    const start = Math.max(0, page - 2)
    const end = Math.min(totalPages, start + 5)
    return Array.from({ length: end - start }, (_, index) => start + index)
  }, [page, pageData.totalPages])

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Quan ly tai khoan</h2>
            <p className="mt-1 text-sm text-slate-500">Tim kiem, sap xep, chinh sua va ban tai khoan nguoi dung.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tim theo ten hoac email..."
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        {loading ? (
          <p className="text-sm text-slate-500">Dang tai danh sach tai khoan...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-slate-500">
                <tr>
                  {[
                    ['username', 'Username'],
                    ['email', 'Email'],
                    ['role', 'Role'],
                    ['status', 'Trang thai'],
                  ].map(([field, label]) => (
                    <th key={field} className="px-3 py-3">
                      <button type="button" onClick={() => changeSort(field)} className="inline-flex items-center gap-1 font-semibold">
                        {label}
                        <ArrowDownUp className="h-3 w-3" />
                      </button>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right">Hanh dong</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-3 py-6 text-center text-slate-500">Khong co tai khoan phu hop.</td>
                  </tr>
                )}
                {users.map((user) => {
                  const banned = isUserBanned(user)
                  const isCurrentUser = isSameUser(user, currentUser)
                  return (
                    <tr key={getId(user)} className="border-b last:border-0">
                      <td className="px-3 py-3 font-medium text-slate-900">{user.username || user.name || 'No name'}</td>
                      <td className="px-3 py-3 text-slate-600">{user.email || 'No email'}</td>
                      <td className="px-3 py-3 text-slate-600">{user.role || 'USER'}</td>
                      <td className="px-3 py-3">
                        <span className={['rounded-full px-2 py-1 text-xs font-medium', banned ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'].join(' ')}>
                          {banned ? 'Da ban' : 'Hoat dong'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEdit(user)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1 text-xs text-slate-700 hover:bg-slate-50">
                            <Edit className="h-3 w-3" />
                            Edit
                          </button>
                          {!isCurrentUser && (
                            banned ? (
                              <button onClick={() => handleUnban(user)} className="rounded-lg border px-3 py-1 text-xs text-slate-700 hover:bg-slate-50">
                                Mo ban
                              </button>
                            ) : (
                              <button onClick={() => handleBan(user)} className="rounded-lg border border-red-300 px-3 py-1 text-xs text-red-600 hover:bg-red-50">
                                Ban
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-slate-500">Tong: {pageData.totalElements}</span>
          <div className="flex items-center gap-2">
            <button disabled={page === 0 || loading} onClick={() => setPage((value) => Math.max(0, value - 1))} className="rounded-lg border px-3 py-1 disabled:opacity-50">
              Prev
            </button>
            {pageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                onClick={() => setPage(pageNumber)}
                className={['rounded-lg border px-3 py-1', pageNumber === page ? 'border-red-600 bg-red-600 text-white' : 'hover:bg-slate-50'].join(' ')}
              >
                {pageNumber + 1}
              </button>
            ))}
            <button disabled={page + 1 >= pageData.totalPages || loading} onClick={() => setPage((value) => value + 1)} className="rounded-lg border px-3 py-1 disabled:opacity-50">
              Next
            </button>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form onSubmit={submitEdit} className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Edit user</h3>
            <div className="mt-4 space-y-3">
              <input value={editForm.username} onChange={(e) => setEditForm((form) => ({ ...form, username: e.target.value }))} placeholder="Username" className="w-full rounded-lg border px-3 py-2 text-sm" required />
              <input type="email" value={editForm.email} onChange={(e) => setEditForm((form) => ({ ...form, email: e.target.value }))} placeholder="Email" className="w-full rounded-lg border px-3 py-2 text-sm" required />
              <select value={editForm.role} onChange={(e) => setEditForm((form) => ({ ...form, role: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm">
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditingUser(null)} className="rounded-lg border px-4 py-2 text-sm">Huy</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-70">
                {saving ? 'Dang luu...' : 'Luu'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
