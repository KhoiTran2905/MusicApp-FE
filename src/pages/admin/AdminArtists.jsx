/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import { Edit, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'

import { apiUtils, artistsApi } from '@/lib/api'

const PAGE_SIZE = 10

function getId(item) {
  return item?.id || item?._id
}

function getTotalPages(data, itemsLength) {
  return Math.max(1, data?.totalPages ?? data?.page?.totalPages ?? Math.ceil((data?.totalElements ?? itemsLength) / PAGE_SIZE))
}

const emptyForm = { name: '', bio: '', avatarUrl: '' }

export default function AdminArtists() {
  const [artists, setArtists] = useState([])
  const [pageData, setPageData] = useState({ totalPages: 1, totalElements: 0 })
  const [page, setPage] = useState(0)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingArtist, setEditingArtist] = useState(null)
  const [editForm, setEditForm] = useState(emptyForm)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query.trim())
      setPage(0)
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [query])

  async function loadArtists() {
    setLoading(true)
    setError('')
    try {
      const data = await artistsApi.getArtists({ page, size: PAGE_SIZE, q: debouncedQuery })
      const items = apiUtils.extractList(data)
      setArtists(items)
      setPageData({
        totalPages: getTotalPages(data, items.length),
        totalElements: data?.totalElements ?? data?.page?.totalElements ?? items.length,
      })
    } catch (err) {
      const message = err.message || 'Khong tai duoc danh sach nghe si.'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadArtists()
  }, [page, debouncedQuery])

  async function submitArtist(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    setError('')
    try {
      await artistsApi.createArtist({
        name: form.name.trim(),
        bio: form.bio?.trim() || null,
        avatarUrl: form.avatarUrl?.trim() || null,
      })
      toast.success('Them nghe si thanh cong.')
      setForm(emptyForm)
      setShowForm(false)
      setPage(0)
      await loadArtists()
    } catch (err) {
      const message = err.message || 'Them nghe si that bai.'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  function openEdit(artist) {
    setEditingArtist(artist)
    setEditForm({
      name: artist?.name || '',
      bio: artist?.bio || '',
      avatarUrl: artist?.avatarUrl || '',
    })
  }

  async function submitEdit(e) {
    e.preventDefault()
    if (!editingArtist || !editForm.name.trim()) return
    setSaving(true)
    setError('')
    try {
      await artistsApi.updateArtist(getId(editingArtist), {
        name: editForm.name.trim(),
        bio: editForm.bio?.trim() || null,
        avatarUrl: editForm.avatarUrl?.trim() || null,
      })
      toast.success('Cap nhat nghe si thanh cong.')
      setEditingArtist(null)
      await loadArtists()
    } catch (err) {
      const message = err.message || 'Cap nhat nghe si that bai.'
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900">Nghe si</h2>
        <button onClick={() => setShowForm((value) => !value)} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
          <Plus className="h-4 w-4" /> Them nghe si
        </button>
      </div>

      {showForm && (
        <form onSubmit={submitArtist} className="grid gap-3 rounded-xl border border-red-200 bg-red-50 p-4 md:grid-cols-3">
          <input value={form.name} onChange={(e) => setForm((value) => ({ ...value, name: e.target.value }))} placeholder="Ten nghe si *" className="rounded-lg border px-3 py-2 text-sm" required />
          <input value={form.bio} onChange={(e) => setForm((value) => ({ ...value, bio: e.target.value }))} placeholder="Tieu su" className="rounded-lg border px-3 py-2 text-sm" />
          <input value={form.avatarUrl} onChange={(e) => setForm((value) => ({ ...value, avatarUrl: e.target.value }))} placeholder="Avatar URL" className="rounded-lg border px-3 py-2 text-sm" />
          <div className="flex gap-2 md:col-span-3">
            <button type="submit" disabled={saving} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-70">{saving ? 'Dang them...' : 'Luu nghe si'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-4 py-2 text-sm">Huy</button>
          </div>
        </form>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tim nghe si..." className="w-full rounded-lg border px-9 py-2 text-sm" />
      </div>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        {loading ? <p className="text-sm text-slate-500">Dang tai...</p> : (
          <div className="space-y-2">
            {artists.length === 0 && <p className="text-sm text-slate-500">Khong co nghe si phu hop.</p>}
            {artists.map((artist) => (
              <div key={getId(artist)} className="flex items-center justify-between rounded-xl border bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{artist?.name || 'Khong ten'}</p>
                  <p className="line-clamp-1 text-xs text-slate-500">{artist?.bio || 'Chua co tieu su'}</p>
                </div>
                <button onClick={() => openEdit(artist)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1 text-xs text-slate-700 hover:bg-slate-50">
                  <Edit className="h-3 w-3" /> Edit
                </button>
              </div>
            ))}
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

      {editingArtist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form onSubmit={submitEdit} className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Edit artist</h3>
            <div className="mt-4 space-y-3">
              <input value={editForm.name} onChange={(e) => setEditForm((value) => ({ ...value, name: e.target.value }))} placeholder="Name" className="w-full rounded-lg border px-3 py-2 text-sm" required />
              <textarea value={editForm.bio} onChange={(e) => setEditForm((value) => ({ ...value, bio: e.target.value }))} placeholder="Bio" className="min-h-24 w-full rounded-lg border px-3 py-2 text-sm" />
              <input value={editForm.avatarUrl} onChange={(e) => setEditForm((value) => ({ ...value, avatarUrl: e.target.value }))} placeholder="Avatar URL" className="w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditingArtist(null)} className="rounded-lg border px-4 py-2 text-sm">Huy</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-70">{saving ? 'Dang luu...' : 'Luu'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
