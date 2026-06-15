/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import { Edit, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { albumsApi, apiUtils, artistsApi, songsApi } from '@/lib/api'

const PAGE_SIZE = 10

function getId(item) {
  return item?.id || item?._id
}

function getArtistId(album) {
  return getId(album?.artist) || album?.artistId
}

function getTotalPages(data, itemsLength) {
  return Math.max(1, data?.totalPages ?? data?.page?.totalPages ?? Math.ceil((data?.totalElements ?? itemsLength) / PAGE_SIZE))
}

const emptyCreateForm = { artistId: '', albumId: '', title: '', duration: 180, fileSound: null, fileImage: null }
const emptyEditForm = { artistId: '', albumId: '', title: '' }

export default function AdminSongs() {
  const [artists, setArtists] = useState([])
  const [albums, setAlbums] = useState([])
  const [songs, setSongs] = useState([])
  const [pageData, setPageData] = useState({ totalPages: 1, totalElements: 0 })
  const [page, setPage] = useState(0)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyCreateForm)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [editingSong, setEditingSong] = useState(null)
  const [editForm, setEditForm] = useState(emptyEditForm)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query.trim())
      setPage(0)
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [query])

  useEffect(() => {
    async function loadOptions() {
      try {
        const [artistsData, albumsData] = await Promise.all([
          artistsApi.getArtists({ page: 0, size: 200 }),
          albumsApi.getAlbums({ page: 0, size: 400 }),
        ])
        setArtists(apiUtils.extractList(artistsData))
        setAlbums(apiUtils.extractList(albumsData))
      } catch (err) {
        toast.error(err.message || 'Khong tai duoc du lieu dropdown.')
      }
    }

    loadOptions()
  }, [])

  async function loadSongs() {
    setLoading(true)
    setError('')
    try {
      const data = await songsApi.getSongs({ page, size: PAGE_SIZE, q: debouncedQuery })
      const items = apiUtils.extractList(data)
      setSongs(items)
      setPageData({
        totalPages: getTotalPages(data, items.length),
        totalElements: data?.totalElements ?? data?.page?.totalElements ?? items.length,
      })
    } catch (err) {
      const message = err.message || 'Khong tai duoc danh sach bai hat.'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSongs()
  }, [page, debouncedQuery])

  const filteredAlbums = albums.filter((album) => getArtistId(album) === form.artistId)
  const filteredEditAlbums = albums.filter((album) => getArtistId(album) === editForm.artistId)

  async function submitSong(e) {
    e.preventDefault()
    if (!form.artistId || !form.title.trim() || !form.fileSound) return
    setSaving(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('fileSound', form.fileSound)
      if (form.fileImage) fd.append('fileImage', form.fileImage)
      fd.append('title', form.title.trim())
      fd.append('duration', String(Number(form.duration) || 180))
      fd.append('artistId', form.artistId)
      if (form.albumId) fd.append('albumId', form.albumId)
      await songsApi.uploadSong(fd)
      toast.success('Them bai hat thanh cong.')
      setForm(emptyCreateForm)
      setShowForm(false)
      setPage(0)
      await loadSongs()
    } catch (err) {
      const message = err.message || 'Them bai hat that bai.'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  function openEdit(song) {
    setEditingSong(song)
    setEditForm({
      artistId: getId(song?.artist) || song?.artistId || '',
      albumId: getId(song?.album) || song?.albumId || '',
      title: song?.title || '',
    })
  }

  async function submitEdit(e) {
    e.preventDefault()
    if (!editingSong || !editForm.artistId || !editForm.title.trim()) return
    setSaving(true)
    setError('')
    try {
      await songsApi.updateSong(getId(editingSong), {
        title: editForm.title.trim(),
        artistId: editForm.artistId,
        albumId: editForm.albumId || null,
      })
      toast.success('Cap nhat bai hat thanh cong.')
      setEditingSong(null)
      await loadSongs()
    } catch (err) {
      const message = err.message || 'Cap nhat bai hat that bai.'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(song) {
    const songId = getId(song)
    if (!confirm(`Xoa bai hat "${song?.title}"?`)) return
    setDeletingId(songId)
    setError('')
    try {
      await songsApi.deleteSong(songId)
      toast.success('Da xoa bai hat.')
      await loadSongs()
    } catch (err) {
      const message = err.message || 'Xoa bai hat that bai.'
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
        <h2 className="text-xl font-bold text-slate-900">Bai hat</h2>
        <button onClick={() => setShowForm((value) => !value)} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
          <Plus className="h-4 w-4" /> Them bai hat
        </button>
      </div>

      {showForm && (
        <form onSubmit={submitSong} className="grid gap-3 rounded-xl border border-red-200 bg-red-50 p-4 md:grid-cols-3">
          <select value={form.artistId} onChange={(e) => setForm((value) => ({ ...value, artistId: e.target.value, albumId: '' }))} className="rounded-lg border px-3 py-2 text-sm" required>
            <option value="">Chon nghe si *</option>
            {artists.map((artist) => <option key={getId(artist)} value={getId(artist)}>{artist?.name}</option>)}
          </select>
          <select value={form.albumId} onChange={(e) => setForm((value) => ({ ...value, albumId: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm">
            <option value="">Chon album (tuy chon)</option>
            {filteredAlbums.map((album) => <option key={getId(album)} value={getId(album)}>{album?.name}</option>)}
          </select>
          <input value={form.title} onChange={(e) => setForm((value) => ({ ...value, title: e.target.value }))} placeholder="Ten bai hat *" className="rounded-lg border px-3 py-2 text-sm" required />
          <div>
            <p className="text-xs text-slate-500">File am thanh *</p>
            <input type="file" accept="audio/*" onChange={(e) => setForm((value) => ({ ...value, fileSound: e.target.files?.[0] || null }))} className="w-full rounded-lg border px-3 py-2 text-sm" required />
          </div>
          <div>
            <p className="text-xs text-slate-500">File anh (tuy chon)</p>
            <input type="file" accept="image/*" onChange={(e) => setForm((value) => ({ ...value, fileImage: e.target.files?.[0] || null }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2 md:col-span-3">
            <button type="submit" disabled={saving} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-70">{saving ? 'Dang them...' : 'Luu bai hat'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-4 py-2 text-sm">Huy</button>
          </div>
        </form>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tim bai hat..." className="w-full rounded-lg border px-9 py-2 text-sm" />
      </div>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        {loading ? <p className="text-sm text-slate-500">Dang tai...</p> : (
          <div className="space-y-2">
            {songs.length === 0 && <p className="text-sm text-slate-500">Khong co bai hat phu hop.</p>}
            {songs.map((song) => {
              const songId = getId(song)
              return (
                <div key={songId} className="flex items-center justify-between rounded-xl border bg-white px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{song?.title || 'Khong ten'}</p>
                    <p className="text-xs text-slate-500">{song?.artist?.name || 'Unknown artist'} - {song?.album?.name || 'No album'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(song)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1 text-xs text-slate-700 hover:bg-slate-50">
                      <Edit className="h-3 w-3" /> Edit
                    </button>
                    <button onClick={() => handleDelete(song)} disabled={deletingId === songId} className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60">
                      <Trash2 className="h-3 w-3" /> {deletingId === songId ? 'Dang xoa...' : 'Xoa'}
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

      {editingSong && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form onSubmit={submitEdit} className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Edit song</h3>
            <div className="mt-4 space-y-3">
              <input value={editForm.title} onChange={(e) => setEditForm((value) => ({ ...value, title: e.target.value }))} placeholder="Title" className="w-full rounded-lg border px-3 py-2 text-sm" required />
              <select value={editForm.artistId} onChange={(e) => setEditForm((value) => ({ ...value, artistId: e.target.value, albumId: '' }))} className="w-full rounded-lg border px-3 py-2 text-sm" required>
                <option value="">Chon nghe si *</option>
                {artists.map((artist) => <option key={getId(artist)} value={getId(artist)}>{artist?.name}</option>)}
              </select>
              <select value={editForm.albumId} onChange={(e) => setEditForm((value) => ({ ...value, albumId: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm">
                <option value="">Chon album (tuy chon)</option>
                {filteredEditAlbums.map((album) => <option key={getId(album)} value={getId(album)}>{album?.name}</option>)}
              </select>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditingSong(null)} className="rounded-lg border px-4 py-2 text-sm">Huy</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-70">{saving ? 'Dang luu...' : 'Luu'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
