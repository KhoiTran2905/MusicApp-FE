import { useState } from 'react'
import { UploadCloud } from 'lucide-react'

import { songsApi, uploadsApi } from '@/lib/api'

export default function Upload() {
  const [fileSound, setFileSound] = useState(null)
  const [fileImage, setFileImage] = useState(null)
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState('0')
  const [message, setMessage] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!fileSound) {
      setMessage('Vui lòng chọn file nhạc.')
      return
    }
    if (!title.trim()) {
      setMessage('Vui lòng nhập tên bài hát.')
      return
    }

    setIsUploading(true)
    setMessage('')

    try {
      const formData = new FormData()
      formData.append('fileSound', fileSound)
      if (fileImage) formData.append('fileImage', fileImage)
      formData.append('title', title.trim())
      formData.append('duration', duration || '0')

      console.log('Uploading with FormData:', {
        fileSound: fileSound?.name,
        fileImage: fileImage?.name,
        title: title.trim(),
        duration: duration || '0',
      })

      const res = await songsApi.uploadSong(formData)
      setFileSound(null)
      setFileImage(null)
      setTitle('')
      setDuration('0')
      setMessage('Tải nhạc thành công.')

      // Try to auto-approve the upload if backend returned an upload id
      try {
        const createdId = res?.id || res?._id || res?.data?.id || res?.data?._id || res?.uploadId || res?.upload?.id || res?.song?.id || res?.song?._id
        if (createdId) {
          await uploadsApi.approveUpload(createdId)
        }
      } catch (err) {
        // ignore approval error - upload already succeeded
        console.debug('Auto-approve failed or not supported:', err?.message || err)
      }
    } catch (err) {
      setMessage(err.message || 'Tải nhạc thất bại.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Tải Nhạc</h1>
        <p className="text-slate-600 mt-2">Tải lên bài hát của bạn để chia sẻ với mọi người.</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tên bài hát</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nhập tên bài hát"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-red-300"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">File nhạc</label>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setFileSound(e.target.files?.[0] || null)}
            className="block w-full text-sm text-slate-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Ảnh bìa (tuỳ chọn)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFileImage(e.target.files?.[0] || null)}
            className="block w-full text-sm text-slate-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Thời lượng (giây)</label>
          <input
            type="number"
            min="0"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-red-300"
          />
        </div>

        {message && <p className="text-sm text-slate-600">{message}</p>}

        <button
          type="submit"
          disabled={isUploading}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-60"
        >
          <UploadCloud className="w-4 h-4" />
          {isUploading ? 'Đang tải lên...' : 'Tải nhạc'}
        </button>
      </form>
    </div>
  )
}
