import { useEffect, useState } from 'react'

import { uploadsApi, apiUtils } from '@/lib/api'

export default function UploadsAdmin() {
  const [uploads, setUploads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await uploadsApi.getUploads({ size: 100 })
      setUploads(apiUtils.extractList(data))
    } catch (err) {
      setError(err.message || 'Không tải được uploads')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleApprove(item) {
    try {
      await uploadsApi.approveUpload(item.id || item._id)
      await load()
    } catch (err) {
      setError(err.message || 'Phê duyệt thất bại')
    }
  }

  async function handleReject(item) {
    const reason = prompt('Lý do từ chối (tùy chọn):') || ''
    try {
      await uploadsApi.rejectUpload(item.id || item._id, { reason })
      await load()
    } catch (err) {
      setError(err.message || 'Từ chối thất bại')
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Quản lý Uploads</h1>
      </div>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        {loading ? (
          <p className="text-sm text-slate-500">Đang tải uploads...</p>
        ) : (
          <div className="space-y-2">
            {uploads.length === 0 && <p className="text-sm text-slate-500">Không có uploads.</p>}
            {uploads.map((u) => (
              <div key={u.id || u._id} className="flex items-center justify-between gap-4 border-b py-2">
                <div>
                  <div className="font-medium">{u.title || u.name || u.filename}</div>
                  <div className="text-xs text-slate-500">{u.uploader?.username || u.uploader?.email || '—'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleApprove(u)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-sm">
                    Phê duyệt
                  </button>
                  <button onClick={() => handleReject(u)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-sm text-red-600">
                    Từ chối
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
