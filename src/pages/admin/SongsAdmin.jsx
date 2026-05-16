import { useEffect, useState } from 'react'
import { Trash } from 'lucide-react'

import { songsApi, apiUtils } from '@/lib/api'

export default function SongsAdmin() {
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await songsApi.getSongs({ size: 100 })
      setSongs(apiUtils.extractList(data))
    } catch (err) {
      setError(err.message || 'Không tải được danh sách bài hát')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleDelete(item) {
    if (!confirm(`Xác nhận xóa bài hát "${item.title || item.name}"?`)) return
    try {
      await songsApi.deleteSong(item.id || item._id)
      await load()
    } catch (err) {
      setError(err.message || 'Xóa thất bại')
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Quản lý Bài hát</h1>
      </div>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        {loading ? (
          <p className="text-sm text-slate-500">Đang tải danh sách bài hát...</p>
        ) : (
          <div className="space-y-2">
            {songs.length === 0 && <p className="text-sm text-slate-500">Không có bài hát.</p>}
            {songs.map((s) => (
              <div key={s.id || s._id} className="flex items-center justify-between gap-4 border-b py-2">
                <div>
                  <div className="font-medium">{s.title || s.name}</div>
                  <div className="text-xs text-slate-500">{s.artist?.name || s.artist || '—'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleDelete(s)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-sm text-red-600">
                    <Trash className="w-4 h-4" />
                    Xóa
                  </button>
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
