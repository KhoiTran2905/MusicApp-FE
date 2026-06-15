import { useEffect, useState } from 'react'
import { LogOut, LockKeyhole, UserCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { authApi } from '@/lib/api'

const initialProfileForm = {
  displayName: '',
  birthYear: '',
  address: '',
  phone: '',
}

export default function Profile() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [profileForm, setProfileForm] = useState(initialProfileForm)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [updatingPassword, setUpdatingPassword] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadUser() {
      setLoading(true)
      setError('')

      try {
        const data = await authApi.me()
        if (!isMounted) return

        setUser(data)
        setProfileForm({
          displayName: data?.displayName || data?.name || '',
          birthYear: data?.birthYear || '',
          address: data?.address || '',
          phone: data?.phone || '',
        })
      } catch (err) {
        if (!isMounted) return
        const message = err.message || 'Khong tai duoc thong tin tai khoan.'
        setError(message)
        toast.error(message)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadUser()

    return () => {
      isMounted = false
    }
  }, [])

  async function handleUpdateProfile(e) {
    e.preventDefault()
    setSavingProfile(true)
    setError('')

    try {
      const payload = {
        displayName: profileForm.displayName.trim(),
        birthYear: profileForm.birthYear ? Number(profileForm.birthYear) : null,
        address: profileForm.address.trim(),
        phone: profileForm.phone.trim(),
      }
      const updatedUser = await authApi.updateProfile(payload)
      setUser((currentUser) => ({ ...currentUser, ...(updatedUser || payload) }))
      toast.success('Cap nhat thong tin ca nhan thanh cong.')
    } catch (err) {
      const message = err.message || 'Khong cap nhat duoc thong tin ca nhan.'
      setError(message)
      toast.error(message)
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleUpdatePassword(e) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      const message = 'Mat khau xac nhan khong khop.'
      setError(message)
      toast.error(message)
      return
    }

    setUpdatingPassword(true)
    setError('')

    try {
      await authApi.updatePassword({
        newPassword,
        confirmNewPassword: confirmPassword,
      })
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Cap nhat mat khau thanh cong.')
    } catch (err) {
      const message = err.message || 'Khong cap nhat duoc mat khau.'
      setError(message)
      toast.error(message)
    } finally {
      setUpdatingPassword(false)
    }
  }

  async function handleLogout() {
    try {
      await authApi.logout()
    } catch {
      // Ignore API failure and still clear session.
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      toast.success('Dang xuat thanh cong.')
      navigate('/login')
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Tai Khoan</h1>
          <p className="text-slate-600 mt-2">Thong tin nguoi dung va thay doi mat khau.</p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
        >
          <LogOut className="w-4 h-4" />
          Dang xuat
        </button>
      </div>

      {loading && <p className="text-sm text-slate-500">Dang tai ho so...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && user && (
        <div className="grid gap-6 xl:grid-cols-3">
          <section className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <UserCircle2 className="w-5 h-5 text-red-700" />
              <h2 className="text-lg font-semibold text-slate-900">Thong tin ca nhan</h2>
            </div>
            <div className="space-y-3 text-sm text-slate-700">
              <p><span className="font-medium text-slate-900">Username:</span> {user.username || user.name || 'N/A'}</p>
              <p><span className="font-medium text-slate-900">Email:</span> {user.email || 'N/A'}</p>
              <p><span className="font-medium text-slate-900">Display name:</span> {user.displayName || user.name || 'N/A'}</p>
              <p><span className="font-medium text-slate-900">Vai tro:</span> {user.role || 'User'}</p>
            </div>
          </section>

          <form onSubmit={handleUpdateProfile} className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <UserCircle2 className="w-5 h-5 text-red-700" />
              <h2 className="text-lg font-semibold text-slate-900">Cap nhat thong tin</h2>
            </div>
            <div className="space-y-3">
              <input
                value={profileForm.displayName}
                onChange={(e) => setProfileForm((form) => ({ ...form, displayName: e.target.value }))}
                placeholder="Display name"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-red-300"
              />
              <input
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                value={profileForm.birthYear}
                onChange={(e) => setProfileForm((form) => ({ ...form, birthYear: e.target.value }))}
                placeholder="Birth year"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-red-300"
              />
              <input
                value={profileForm.address}
                onChange={(e) => setProfileForm((form) => ({ ...form, address: e.target.value }))}
                placeholder="Address"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-red-300"
              />
              <input
                value={profileForm.phone}
                onChange={(e) => setProfileForm((form) => ({ ...form, phone: e.target.value }))}
                placeholder="Phone"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-red-300"
              />
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-60"
              >
                <UserCircle2 className="w-4 h-4" />
                {savingProfile ? 'Dang luu...' : 'Luu thong tin'}
              </button>
            </div>
          </form>

          <form onSubmit={handleUpdatePassword} className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <LockKeyhole className="w-5 h-5 text-red-700" />
              <h2 className="text-lg font-semibold text-slate-900">Doi mat khau</h2>
            </div>
            <div className="space-y-3">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mat khau moi"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-red-300"
                required
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Xac nhan mat khau moi"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-red-300"
                required
              />
              <button
                type="submit"
                disabled={updatingPassword}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-60"
              >
                <LockKeyhole className="w-4 h-4" />
                {updatingPassword ? 'Dang cap nhat...' : 'Cap nhat mat khau'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
