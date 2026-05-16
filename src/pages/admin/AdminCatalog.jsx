import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'

import { albumsApi, apiUtils, artistsApi, songsApi } from '@/lib/api'

function getId(item) {
  return item?.id || item?._id
}

function toMapByArtist(albums = []) {
  const map = new Map()
  albums.forEach((album) => {
    const artistId = getId(album?.artist)
    if (!artistId) return

    if (!map.has(artistId)) {
      map.set(artistId, [])
    }
    map.get(artistId).push(album)
  })
  return map
}

function toMapByAlbum(songs = []) {
  const map = new Map()
  songs.forEach((song) => {
    const albumId = getId(song?.album)
    if (!albumId) return

    if (!map.has(albumId)) {
      map.set(albumId, [])
    }
    map.get(albumId).push(song)
  })
  return map
}

export default function AdminCatalog() {
  const [artists, setArtists] = useState([])
  const [albums, setAlbums] = useState([])
  const [songs, setSongs] = useState([])
  const [query, setQuery] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [artistForm, setArtistForm] = useState({ name: '', bio: '', avatarUrl: '' })
  const [albumForm, setAlbumForm] = useState({ artistId: '', name: '', releaseDate: '', coverUrl: '' })
  const [songForm, setSongForm] = useState({
    artistId: '',
    albumId: '',
    title: '',
    duration: 180,
    fileSound: null,
    fileImage: null,
  })

  const [showArtistForm, setShowArtistForm] = useState(false)
  const [showAlbumForArtist, setShowAlbumForArtist] = useState('')
  const [showSongForAlbum, setShowSongForAlbum] = useState('')

  const [expandedArtists, setExpandedArtists] = useState({})
  const [expandedAlbums, setExpandedAlbums] = useState({})

  const [savingArtist, setSavingArtist] = useState(false)
  const [savingAlbum, setSavingAlbum] = useState(false)
  const [savingSong, setSavingSong] = useState(false)
  const [deletingSongId, setDeletingSongId] = useState('')
  const [deletingAlbumId, setDeletingAlbumId] = useState('')

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const [artistsData, albumsData, songsData] = await Promise.all([
        artistsApi.getArtists({ page: 0, size: 200 }),
        albumsApi.getAlbums({ page: 0, size: 400 }),
        songsApi.getSongs({ page: 0, size: 800 }),
      ])

      setArtists(apiUtils.extractList(artistsData))
      setAlbums(apiUtils.extractList(albumsData))
      setSongs(apiUtils.extractList(songsData))
    } catch (err) {
      setError(err.message || 'Không tải được dữ liệu catalog')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const albumsByArtist = useMemo(() => toMapByArtist(albums), [albums])
  const songsByAlbum = useMemo(() => toMapByAlbum(songs), [songs])

  const visibleArtists = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return artists

    return artists.filter((artist) => {
      const artistName = String(artist?.name || '').toLowerCase()
      const artistId = getId(artist)
      const artistAlbums = albumsByArtist.get(artistId) || []

      const albumMatched = artistAlbums.some((album) => String(album?.name || '').toLowerCase().includes(keyword))
      const songMatched = artistAlbums.some((album) => {
        const albumId = getId(album)
        const albumSongs = songsByAlbum.get(albumId) || []
        return albumSongs.some((song) => String(song?.title || '').toLowerCase().includes(keyword))
      })

      return artistName.includes(keyword) || albumMatched || songMatched
    })
  }, [artists, query, albumsByArtist, songsByAlbum])

  function toggleArtist(artistId) {
    setExpandedArtists((prev) => ({ ...prev, [artistId]: !prev[artistId] }))
  }

  function toggleAlbum(albumId) {
    setExpandedAlbums((prev) => ({ ...prev, [albumId]: !prev[albumId] }))
  }

  async function submitArtist(e) {
    e.preventDefault()
    if (!artistForm.name.trim()) return

    setSavingArtist(true)
    setError('')

    try {
      await artistsApi.createArtist({
        name: artistForm.name.trim(),
        bio: artistForm.bio?.trim() || null,
        avatarUrl: artistForm.avatarUrl?.trim() || null,
      })
      setArtistForm({ name: '', bio: '', avatarUrl: '' })
      setShowArtistForm(false)
      await loadData()
    } catch (err) {
      setError(err.message || 'Thêm nghệ sĩ thất bại')
    } finally {
      setSavingArtist(false)
    }
  }

  async function submitAlbum(e) {
    e.preventDefault()
    if (!albumForm.artistId || !albumForm.name.trim()) return

    setSavingAlbum(true)
    setError('')

    try {
      await albumsApi.createAlbum({
        artistId: albumForm.artistId,
        name: albumForm.name.trim(),
        releaseDate: albumForm.releaseDate || null,
        coverUrl: albumForm.coverUrl?.trim() || null,
      })
      setAlbumForm({ artistId: '', name: '', releaseDate: '', coverUrl: '' })
      setShowAlbumForArtist('')
      await loadData()
    } catch (err) {
      setError(err.message || 'Thêm album thất bại')
    } finally {
      setSavingAlbum(false)
    }
  }

  async function submitSong(e) {
    e.preventDefault()
    if (!songForm.artistId || !songForm.title.trim() || !songForm.fileSound) return

    setSavingSong(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('fileSound', songForm.fileSound)
      if (songForm.fileImage) {
        formData.append('fileImage', songForm.fileImage)
      }
      formData.append('title', songForm.title.trim())
      formData.append('duration', String(Number(songForm.duration) || 180))
      formData.append('artistId', songForm.artistId)
      if (songForm.albumId) {
        formData.append('albumId', songForm.albumId)
      }

      await songsApi.uploadSong(formData)
      setSongForm({
        artistId: '',
        albumId: '',
        title: '',
        duration: 180,
        fileSound: null,
        fileImage: null,
      })
      setShowSongForAlbum('')
      await loadData()
    } catch (err) {
      setError(err.message || 'Thêm bài hát thất bại')
    } finally {
      setSavingSong(false)
    }
  }

  function openAlbumForm(artist) {
    const artistId = getId(artist)
    setShowAlbumForArtist(artistId)
    setAlbumForm({ artistId, name: '', releaseDate: '', coverUrl: '' })
    setShowSongForAlbum('')
  }

  function openSongForm(artist, album) {
    const artistId = getId(artist)
    const albumId = getId(album)
    setShowSongForAlbum(albumId)
    setSongForm({ artistId, albumId, title: '', duration: 180, fileSound: null, fileImage: null })
    setShowAlbumForArtist('')
  }

  async function handleDeleteSong(song) {
    const songId = getId(song)
    if (!songId) return

    if (!confirm(`Xóa bài hát "${song?.title || 'Không tên'}"?`)) return

    setDeletingSongId(songId)
    setError('')

    try {
      await songsApi.deleteSong(songId)
      await loadData()
    } catch (err) {
      setError(err.message || 'Xóa bài hát thất bại')
    } finally {
      setDeletingSongId('')
    }
  }

  async function handleDeleteAlbum(album, albumSongs = []) {
    const albumId = getId(album)
    if (!albumId) return

    if (!confirm(`Xóa album "${album?.name || 'Không tên'}" và toàn bộ bài hát trong album?`)) return

    setDeletingAlbumId(albumId)
    setError('')

    try {
      for (const song of albumSongs) {
        const songId = getId(song)
        if (!songId) continue
        await songsApi.deleteSong(songId)
      }

      await albumsApi.deleteAlbum(albumId)
      await loadData()
    } catch (err) {
      setError(err.message || 'Xóa album thất bại')
    } finally {
      setDeletingAlbumId('')
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Tra cứu Artist / Album / Songs</h2>
            <p className="text-sm text-slate-500">Giao diện lồng nhau: Artist {'>'} Album {'>'} Song</p>
          </div>
          <button
            onClick={() => setShowArtistForm((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            <Plus className="h-4 w-4" />
            Thêm nghệ sĩ
          </button>
        </div>

        <div className="mt-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tra cứu theo tên nghệ sĩ, album hoặc bài hát..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
          />
        </div>

        {showArtistForm && (
          <form onSubmit={submitArtist} className="mt-4 grid gap-3 rounded-xl border border-red-200 bg-red-50 p-4 md:grid-cols-3">
            <input
              value={artistForm.name}
              onChange={(e) => setArtistForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Tên nghệ sĩ *"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            />
            <input
              value={artistForm.bio}
              onChange={(e) => setArtistForm((prev) => ({ ...prev, bio: e.target.value }))}
              placeholder="Tiểu sử"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              value={artistForm.avatarUrl}
              onChange={(e) => setArtistForm((prev) => ({ ...prev, avatarUrl: e.target.value }))}
              placeholder="Avatar URL"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <div className="md:col-span-3 flex items-center gap-2">
              <button
                type="submit"
                disabled={savingArtist}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-70"
              >
                {savingArtist ? 'Đang thêm...' : 'Lưu nghệ sĩ'}
              </button>
              <button
                type="button"
                onClick={() => setShowArtistForm(false)}
                className="rounded-lg border px-4 py-2 text-sm text-slate-700"
              >
                Hủy
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        {loading ? (
          <p className="text-sm text-slate-500">Đang tải dữ liệu catalog...</p>
        ) : (
          <div className="space-y-3">
            {visibleArtists.length === 0 && <p className="text-sm text-slate-500">Không có dữ liệu phù hợp.</p>}

            {visibleArtists.map((artist) => {
              const artistId = getId(artist)
              const artistAlbums = albumsByArtist.get(artistId) || []
              const isArtistOpen = expandedArtists[artistId] ?? true

              return (
                <div key={artistId} className="rounded-xl border border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-3 py-2">
                    <button
                      onClick={() => toggleArtist(artistId)}
                      className="inline-flex items-center gap-2 text-left text-sm font-semibold text-slate-800"
                    >
                      {isArtistOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      {artist?.name || 'Nghệ sĩ không tên'}
                    </button>
                    <button
                      onClick={() => openAlbumForm(artist)}
                      className="inline-flex items-center gap-1 rounded-lg border px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      <Plus className="h-3 w-3" />
                      Thêm album
                    </button>
                  </div>

                  {isArtistOpen && (
                    <div className="space-y-2 p-3">
                      {showAlbumForArtist === artistId && (
                        <form onSubmit={submitAlbum} className="grid gap-2 rounded-lg border border-red-200 bg-red-50 p-3 md:grid-cols-4">
                          <input
                            value={albumForm.name}
                            onChange={(e) => setAlbumForm((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder="Tên album *"
                            className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
                            required
                          />
                          <input
                            value={albumForm.releaseDate}
                            onChange={(e) => setAlbumForm((prev) => ({ ...prev, releaseDate: e.target.value }))}
                            type="date"
                            className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
                          />
                          <input
                            value={albumForm.coverUrl}
                            onChange={(e) => setAlbumForm((prev) => ({ ...prev, coverUrl: e.target.value }))}
                            placeholder="Cover URL"
                            className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="submit"
                              disabled={savingAlbum}
                              className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-70"
                            >
                              {savingAlbum ? 'Đang thêm...' : 'Lưu album'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowAlbumForArtist('')}
                              className="rounded-lg border px-3 py-2 text-sm"
                            >
                              Hủy
                            </button>
                          </div>
                        </form>
                      )}

                      {artistAlbums.length === 0 && <p className="text-sm text-slate-500">Chưa có album.</p>}

                      {artistAlbums.map((album) => {
                        const albumId = getId(album)
                        const albumSongs = songsByAlbum.get(albumId) || []
                        const isAlbumOpen = expandedAlbums[albumId] ?? true

                        return (
                          <div key={albumId} className="rounded-lg border border-slate-200">
                            <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-3 py-2">
                              <button
                                onClick={() => toggleAlbum(albumId)}
                                className="inline-flex items-center gap-2 text-left text-sm font-medium text-slate-700"
                              >
                                {isAlbumOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                {album?.name || 'Album không tên'}
                              </button>
                              <button
                                onClick={() => openSongForm(artist, album)}
                                className="inline-flex items-center gap-1 rounded-lg border px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                              >
                                <Plus className="h-3 w-3" />
                                Thêm bài hát
                              </button>
                              <button
                                onClick={() => handleDeleteAlbum(album, albumSongs)}
                                disabled={deletingAlbumId === albumId}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Trash2 className="h-3 w-3" />
                                {deletingAlbumId === albumId ? 'Đang xóa...' : 'Xóa album'}
                              </button>
                            </div>

                            {isAlbumOpen && (
                              <div className="space-y-2 px-3 pb-3">
                                {showSongForAlbum === albumId && (
                                  <form onSubmit={submitSong} className="grid gap-2 rounded-lg border border-red-200 bg-red-50 p-3 md:grid-cols-3">
                                    <input
                                      value={songForm.title}
                                      onChange={(e) => setSongForm((prev) => ({ ...prev, title: e.target.value }))}
                                      placeholder="Tên bài hát *"
                                      className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
                                      required
                                    />
                                    <input
                                      type="number"
                                      min="1"
                                      value={songForm.duration}
                                      onChange={(e) => setSongForm((prev) => ({ ...prev, duration: e.target.value }))}
                                      placeholder="Duration (giây)"
                                      className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
                                    />
                                    <input
                                      type="file"
                                      accept="audio/*"
                                      onChange={(e) => setSongForm((prev) => ({ ...prev, fileSound: e.target.files?.[0] || null }))}
                                      className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
                                      required
                                    />
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => setSongForm((prev) => ({ ...prev, fileImage: e.target.files?.[0] || null }))}
                                      placeholder="Ảnh bìa"
                                      className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
                                    />
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="submit"
                                        disabled={savingSong}
                                        className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-70"
                                      >
                                        {savingSong ? 'Đang thêm...' : 'Lưu bài hát'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setShowSongForAlbum('')}
                                        className="rounded-lg border px-3 py-2 text-sm"
                                      >
                                        Hủy
                                      </button>
                                    </div>
                                  </form>
                                )}

                                {albumSongs.length === 0 && <p className="text-sm text-slate-500">Chưa có bài hát.</p>}

                                {albumSongs.map((song) => {
                                  const songId = getId(song)
                                  const isDeletingSong = deletingSongId === songId

                                  return (
                                    <div key={songId} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                                      <span>{song?.title || 'Bài hát không tên'}</span>
                                      <button
                                        onClick={() => handleDeleteSong(song)}
                                        disabled={isDeletingSong || deletingAlbumId === albumId}
                                        className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                        {isDeletingSong ? 'Đang xóa...' : 'Xóa'}
                                      </button>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
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
