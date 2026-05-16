import { useEffect, useState } from 'react'
import { Heart, Play, Trash2 } from 'lucide-react'

import { favoritesApi, apiUtils } from '@/lib/api'
import { useMusic } from '@/contexts/MusicContext'
import { resolveSongArtistName, resolveSongEntity, resolveSongId, resolveSongTitle } from '@/lib/song-utils'

export default function Favorites() {
  const { setCurrentSong } = useMusic()
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)

  async function loadFavorites(nextPage = 0, append = false) {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }
    setError('')

    try {
      const data = await favoritesApi.getFavorites({ page: nextPage, size: 10 })
      const items = apiUtils.extractList(data)
      const resolvedTotalPages = data?.data?.totalPages || data?.totalPages || 1

      setTotalPages(resolvedTotalPages)
      setPage(nextPage)
      setFavorites((prev) => (append ? [...prev, ...items] : items))
    } catch (err) {
      setError(err.message || 'Không tải được danh sách yêu thích.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    loadFavorites(0, false)
  }, [])

  async function handleUnlike(songId) {
    try {
      await favoritesApi.unlikeSong(songId)
      await loadFavorites(0, false)
    } catch (err) {
      setError(err.message || 'Không xóa được khỏi yêu thích.')
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Yêu Thích</h1>
        <p className="text-slate-600 mt-2">Danh sách bài hát bạn đã thích.</p>
      </div>

      {loading && <p className="text-sm text-slate-500">Đang tải danh sách yêu thích...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="space-y-3 rounded-xl border bg-white p-5 shadow-sm">
          {favorites.map((favorite) => {
            const song = resolveSongEntity(favorite)
            const title = resolveSongTitle(song)
            const artistName = resolveSongArtistName(song)
            const songId = resolveSongId(favorite)

            return (
              <div
                key={favorite.id || songId || title}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <button type="button" onClick={() => setCurrentSong(song)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <Heart className="w-4 h-4 text-red-700 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{title}</p>
                    <p className="text-sm text-slate-500 truncate">{artistName}</p>
                  </div>
                </button>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setCurrentSong(song)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-white"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUnlike(songId)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}

          {!favorites.length && <p className="text-sm text-slate-500">Chưa có bài hát yêu thích nào.</p>}

          {page + 1 < totalPages && (
            <button
              type="button"
              onClick={() => loadFavorites(page + 1, true)}
              disabled={loadingMore}
              className="mx-auto inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-60"
            >
              {loadingMore ? 'Đang tải thêm...' : 'Tải thêm'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
