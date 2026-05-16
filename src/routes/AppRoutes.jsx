import { Route, Routes } from 'react-router-dom'

import AdminRoute from '@/components/AdminRoute'
import ProtectedRoute from '@/components/ProtectedRoute'
import LoginPage from '@/features/auth/LoginPage'
import SignUpPage from '@/features/auth/SignUpPage'
import Favorites from '@/features/favorites/Favorites'
import History from '@/features/history/History'
import Playlists from '@/features/playlists/Playlists'
import SearchPage from '@/features/search/SearchPage'
import Trending from '@/features/songs/Trending'
import Upload from '@/features/upload/Upload'
import AdminAccounts from '@/pages/admin/AdminAccounts'
import AdminCatalog from '@/pages/admin/AdminCatalog'
import AdminLayout from '@/pages/admin/AdminLayout'
import LandingPage from '@/pages/LandingPage'
import MusicLayout from '@/pages/music/MusicLayout'
import UserDashboard from '@/pages/UserDashboard'
import Profile from '@/features/profile/Profile'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/music" element={<MusicLayout />}>
          <Route index element={<UserDashboard />} />
          <Route path="trending" element={<Trending />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="playlists" element={<Playlists />} />
          <Route path="favorites" element={<Favorites />} />
          <Route path="history" element={<History />} />
          <Route path="profile" element={<Profile />} />
          <Route path="upload" element={<Upload />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminCatalog />} />
            <Route path="catalog" element={<AdminCatalog />} />
            <Route path="accounts" element={<AdminAccounts />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
