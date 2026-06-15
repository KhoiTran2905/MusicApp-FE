/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import { Edit, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { albumsApi, apiUtils, artistsApi } from '@/lib/api'

const PAGE_SIZE = 10

function getId(item) {
  return item?.id || item?._id
}

function getTotalPages(data, itemsLength) {
  return Math.max(1, data?.totalPages ?? data?.page?.totalPages ?? Math.ceil((data?.totalElements ?? itemsLength) / PAGE_SIZE))
}

const emptyForm = { artistId: '', name: '', releaseDate: '', coverUrl: '' }

export default function AdminAlbums() {
  const [artists, setArtists] = useState([])
  const [albums, setAlbums] = useState([])
  const [pageData, setPageData] = useState({ totalPages: 1, totalElements: 0 })
  const [page, setPage] = useState(0)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [editingAlbum, setEditingAlbum] = useState(null)
  const [editForm, setEditForm] = useState(emptyForm)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query.trim())
      setPage(0)
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [query])

  useEffect(() => {
    async function loadArtists() {
      try {
        const data = await artistsApi.getArtists({ page: 0, size: 200 })
        setArtists(apiUtils.extractList(data))
      } catch (err) {
        toast.error(err.message || 'Khong tai duoc danh sach nghe si.')
      }
    }

    loadArtists()
  }, [])

  async function loadAlbums() {
    setLoading(true)
    setError('')
    try {
      const data = await albumsApi.getAlbums({ page, size: PAGE_SIZE, q: debouncedQuery })
      const items = apiUtils.extractList(data)
      setAlbums(items)
      setPageData({
        totalPages: getTotalPages(data, items.length),
        totalElements: data?.totalElements ?? data?.page?.totalElements ?? items.length,
      })
    } catch (err) {
      const message = err.message || 'Khong tai duoc danh sach album.'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAlbums()
  }, [page, debouncedQuery])

  async function submitAlbum(e) {
    e.preventDefault()
    if (!form.artistId || !form.name.trim()) return
    setSaving(true)
    setError('')
    try {
      await albumsApi.createAlbum({
        artistId: form.artistId,
        name: form.name.trim(),
        releaseDate: form.releaseDate || null,
        coverUrl: form.coverUrl?.trim() || null,
      })
      toast.success('Them album thanh cong.')
      setForm(emptyForm)
      setShowForm(false)
      setPage(0)
      await loadAlbums()
    } catch (err) {
      const message = err.message || 'Them album that bai.'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  function openEdit(album) {
    setEditingAlbum(album)
    setEditForm({
      artistId: getId(album?.artist) || album?.artistId || '',
      name: album?.name || '',
      releaseDate: album?.releaseDate || '',
      coverUrl: album?.coverUrl || '',
    })
  }

  async function submitEdit(e) {
    e.preventDefault()
    if (!editingAlbum || !editForm.artistId || !editForm.name.trim()) return
    setSaving(true)
    setError('')
    try {
      await albumsApi.updateAlbum(getId(editingAlbum), {
        artistId: editForm.artistId,
        name: editForm.name.trim(),
        releaseDate: editForm.releaseDate || null,
        coverUrl: editForm.coverUrl?.trim() || null,
      })
      toast.success('Cap nhat album thanh cong.')
      setEditingAlbum(null)
      await loadAlbums()
    } catch (err) {
      const message = err.message || 'Cap nhat album that bai.'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(album) {
    const albumId = getId(album)
    if (!confirm(`Xoa album "${album?.name}"?`)) return
    setDeletingId(albumId)
    setError('')
    try {
      await albumsApi.deleteAlbum(albumId)
      toast.success('Da xoa album.')
      await loadAlbums()
    } catch (err) {
      const message = err.message || 'Xoa album that bai.'
      setError(message)
      toast.error(message)
    } finally {
      setDeletingId('')
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
        <h2 className="text-xl font-bold text-slate-900">Albums</h2>
        <button onClick={() => setShowForm((value) => !value)} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
          <Plus className="h-4 w-4" /> Them album
        </button>
      </div>

      {showForm && (
        <form onSubmit={submitAlbum} className="grid gap-3 rounded-xl border border-red-200 bg-red-50 p-4 md:grid-cols-4">
          <select value={form.artistId} onChange={(e) => setForm((value) => ({ ...value, artistId: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm" required>
            <option value="">Chon nghe si *</option>
            {artists.map((artist) => <option key={getId(artist)} value={getId(artist)}>{artist?.name}</option>)}
          </select>
          <input value={form.name} onChange={(e) => setForm((value) => ({ ...value, name: e.target.value }))} placeholder="Ten album *" className="rounded-lg border px-3 py-2 text-sm" required />
          <input type="date" value={form.releaseDate} onChange={(e) => setForm((value) => ({ ...value, releaseDate: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm" />
          <input value={form.coverUrl} onChange={(e) => setForm((value) => ({ ...value, coverUrl: e.target.value }))} placeholder="Cover URL" className="rounded-lg border px-3 py-2 text-sm" />
          <div className="flex gap-2 md:col-span-4">
            <button type="submit" disabled={saving} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-70">{saving ? 'Dang them...' : 'Luu album'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-4 py-2 text-sm">Huy</button>
          </div>
        </form>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tim album..." className="w-full rounded-lg border px-9 py-2 text-sm" />
      </div>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        {loading ? <p className="text-sm text-slate-500">Dang tai...</p> : (
          <div className="space-y-2">
            {albums.length === 0 && <p className="text-sm text-slate-500">Khong co album phu hop.</p>}
            {albums.map((album) => {
              const albumId = getId(album)
              return (
                <div key={albumId} className="flex items-center justify-between rounded-xl border bg-white px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{album?.name || 'Khong ten'}</p>
                    <p className="text-xs text-slate-500">{album?.artist?.name || 'Unknown artist'} - {album?.releaseDate || 'No date'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(album)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1 text-xs text-slate-700 hover:bg-slate-50">
                      <Edit className="h-3 w-3" /> Edit
                    </button>
                    <button onClick={() => handleDelete(album)} disabled={deletingId === albumId} className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60">
                      <Trash2 className="h-3 w-3" /> {deletingId === albumId ? 'Dang xoa...' : 'Xoa'}
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

      {editingAlbum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form onSubmit={submitEdit} className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Edit album</h3>
            <div className="mt-4 space-y-3">
              <select value={editForm.artistId} onChange={(e) => setEditForm((value) => ({ ...value, artistId: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" required>
                <option value="">Chon nghe si *</option>
                {artists.map((artist) => <option key={getId(artist)} value={getId(artist)}>{artist?.name}</option>)}
              </select>
              <input value={editForm.name} onChange={(e) => setEditForm((value) => ({ ...value, name: e.target.value }))} placeholder="Name" className="w-full rounded-lg border px-3 py-2 text-sm" required />
              <input type="date" value={editForm.releaseDate} onChange={(e) => setEditForm((value) => ({ ...value, releaseDate: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
              <input value={editForm.coverUrl} onChange={(e) => setEditForm((value) => ({ ...value, coverUrl: e.target.value }))} placeholder="Cover URL" className="w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditingAlbum(null)} className="rounded-lg border px-4 py-2 text-sm">Huy</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-70">{saving ? 'Dang luu...' : 'Luu'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
