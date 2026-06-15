/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import { KeyRound, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { adminApi, apiUtils } from '@/lib/api'

const PAGE_SIZE = 10
const emptyCreateForm = { username: '', email: '', password: '' }

function getId(item) {
  return item?.id || item?._id
}

function getTotalPages(data, itemsLength) {
  return Math.max(1, data?.totalPages ?? data?.page?.totalPages ?? Math.ceil((data?.totalElements ?? itemsLength) / PAGE_SIZE))
}

export default function AdminAdmins() {
  const [admins, setAdmins] = useState([])
  const [pageData, setPageData] = useState({ totalPages: 1, totalElements: 0 })
  const [page, setPage] = useState(0)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyCreateForm)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [passwordAdmin, setPasswordAdmin] = useState(null)
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' })

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query.trim())
      setPage(0)
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [query])

  async function loadAdmins() {
    setLoading(true)
    setError('')
    try {
      const data = await adminApi.getAdmins({ page, size: PAGE_SIZE, q: debouncedQuery })
      const items = apiUtils.extractList(data)
      setAdmins(items)
      setPageData({
        totalPages: getTotalPages(data, items.length),
        totalElements: data?.totalElements ?? data?.page?.totalElements ?? items.length,
      })
    } catch (err) {
      const message = err.message || 'Khong tai duoc danh sach admin.'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAdmins()
  }, [page, debouncedQuery])

  async function submitAdmin(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await adminApi.createAdmin({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      })
      toast.success('Them admin thanh cong.')
      setForm(emptyCreateForm)
      setShowForm(false)
      setPage(0)
      await loadAdmins()
    } catch (err) {
      const message = err.message || 'Them admin that bai.'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(admin) {
    const adminId = getId(admin)
    if (!confirm(`Xoa admin "${admin?.username || admin?.email}"?`)) return
    setDeletingId(adminId)
    setError('')
    try {
      await adminApi.deleteAdmin(adminId)
      toast.success('Da xoa admin.')
      await loadAdmins()
    } catch (err) {
      const message = err.message || 'Xoa admin that bai.'
      setError(message)
      toast.error(message)
    } finally {
      setDeletingId('')
    }
  }

  function openPasswordModal(admin) {
    setPasswordAdmin(admin)
    setPasswordForm({ password: '', confirmPassword: '' })
  }

  async function submitPassword(e) {
    e.preventDefault()
    if (!passwordAdmin) return
    if (passwordForm.password !== passwordForm.confirmPassword) {
      const message = 'Mat khau xac nhan khong khop.'
      setError(message)
      toast.error(message)
      return
    }

    setSaving(true)
    setError('')
    try {
      await adminApi.updateAdminPassword(getId(passwordAdmin), {
        password: passwordForm.password,
        newPassword: passwordForm.password,
        confirmPassword: passwordForm.confirmPassword,
        confirmNewPassword: passwordForm.confirmPassword,
      })
      toast.success('Doi mat khau admin thanh cong.')
      setPasswordAdmin(null)
    } catch (err) {
      const message = err.message || 'Doi mat khau admin that bai.'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const pageNumbers = useMemo(() => {
    const start = Math.max(0, page - 2)
    const end = Math.min(pageData.totalPages, start + 5)
    return Array.from({ length: end - start }, (_, index) => start + index)
  }, [page, pageData.totalPages])

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Quan ly admin</h2>
            <p className="mt-1 text-sm text-slate-500">Danh sach, tao moi, xoa va doi mat khau tai khoan admin.</p>
          </div>
          <button onClick={() => setShowForm((value) => !value)} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
            <Plus className="h-4 w-4" /> Them admin
          </button>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tim admin..." className="w-full rounded-lg border px-9 py-2 text-sm" />
        </div>
      </section>

      {showForm && (
        <form onSubmit={submitAdmin} className="grid gap-3 rounded-xl border border-red-200 bg-red-50 p-4 md:grid-cols-3">
          <input value={form.username} onChange={(e) => setForm((value) => ({ ...value, username: e.target.value }))} placeholder="Username *" className="rounded-lg border px-3 py-2 text-sm" required />
          <input type="email" value={form.email} onChange={(e) => setForm((value) => ({ ...value, email: e.target.value }))} placeholder="Email *" className="rounded-lg border px-3 py-2 text-sm" required />
          <input type="password" value={form.password} onChange={(e) => setForm((value) => ({ ...value, password: e.target.value }))} placeholder="Password *" className="rounded-lg border px-3 py-2 text-sm" required />
          <div className="flex gap-2 md:col-span-3">
            <button type="submit" disabled={saving} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-70">{saving ? 'Dang them...' : 'Luu admin'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-4 py-2 text-sm">Huy</button>
          </div>
        </form>
      )}

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        {loading ? <p className="text-sm text-slate-500">Dang tai danh sach admin...</p> : (
          <div className="space-y-2">
            {admins.length === 0 && <p className="text-sm text-slate-500">Khong co admin phu hop.</p>}
            {admins.map((admin) => {
              const adminId = getId(admin)
              return (
                <div key={adminId} className="flex items-center justify-between rounded-xl border bg-white px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{admin?.username || admin?.name || 'No name'}</p>
                    <p className="text-xs text-slate-500">{admin?.email || 'No email'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openPasswordModal(admin)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1 text-xs text-slate-700 hover:bg-slate-50">
                      <KeyRound className="h-3 w-3" /> Password
                    </button>
                    <button onClick={() => handleDelete(admin)} disabled={deletingId === adminId} className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60">
                      <Trash2 className="h-3 w-3" /> {deletingId === adminId ? 'Dang xoa...' : 'Xoa'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-slate-500">Tong: {pageData.totalElements}</span>
          <div className="flex items-center gap-2">
            <button disabled={page === 0 || loading} onClick={() => setPage((value) => Math.max(0, value - 1))} className="rounded-lg border px-3 py-1 disabled:opacity-50">Prev</button>
            {pageNumbers.map((pageNumber) => (
              <button key={pageNumber} onClick={() => setPage(pageNumber)} className={['rounded-lg border px-3 py-1', pageNumber === page ? 'border-red-600 bg-red-600 text-white' : 'hover:bg-slate-50'].join(' ')}>{pageNumber + 1}</button>
            ))}
            <button disabled={page + 1 >= pageData.totalPages || loading} onClick={() => setPage((value) => value + 1)} className="rounded-lg border px-3 py-1 disabled:opacity-50">Next</button>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>

      {passwordAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form onSubmit={submitPassword} className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Doi mat khau admin</h3>
            <p className="mt-1 text-sm text-slate-500">{passwordAdmin?.username || passwordAdmin?.email}</p>
            <div className="mt-4 space-y-3">
              <input type="password" value={passwordForm.password} onChange={(e) => setPasswordForm((value) => ({ ...value, password: e.target.value }))} placeholder="Mat khau moi" className="w-full rounded-lg border px-3 py-2 text-sm" required />
              <input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((value) => ({ ...value, confirmPassword: e.target.value }))} placeholder="Xac nhan mat khau moi" className="w-full rounded-lg border px-3 py-2 text-sm" required />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setPasswordAdmin(null)} className="rounded-lg border px-4 py-2 text-sm">Huy</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-70">{saving ? 'Dang luu...' : 'Luu'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
