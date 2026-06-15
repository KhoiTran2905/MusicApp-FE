import { Route, Routes } from 'react-router-dom'

import AdminRoute from '@/components/AdminRoute'
import ProtectedRoute from '@/components/ProtectedRoute'
import LoginPage from '@/features/auth/LoginPage'
import SignUpPage from '@/features/auth/SignUpPage'
import Favorites from '@/features/favorites/Favorites'
import History from '@/features/history/History'
import ArtistDetailPage from '@/features/artists/ArtistDetailPage'
import ArtistsPage from '@/features/artists/ArtistsPage'
import AlbumDetailPage from '@/features/albums/AlbumDetailPage'
import AlbumsPage from '@/features/albums/AlbumsPage'
import Playlists from '@/features/playlists/Playlists'
import SearchPage from '@/features/search/SearchPage'
import Trending from '@/features/songs/Trending'
import SongsPage from '@/features/songs/SongsPage'
import Upload from '@/features/upload/Upload'
import AdminAccounts from '@/pages/admin/AdminAccounts'
import AdminLayout from '@/pages/admin/AdminLayout'
import LandingPage from '@/pages/LandingPage'
import MusicLayout from '@/pages/music/MusicLayout'
import UserDashboard from '@/pages/UserDashboard'
import Profile from '@/features/profile/Profile'
import AdminArtists from '@/pages/admin/AdminArtists'
import AdminAlbums from '@/pages/admin/AdminAlbums'
import AdminSongs from '@/pages/admin/AdminSongs'
import AdminAdmins from '@/pages/admin/AdminAdmins'

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
          <Route path="songs" element={<SongsPage />} />
          <Route path="artists" element={<ArtistsPage />} />
          <Route path="artists/:artistId" element={<ArtistDetailPage />} />
          <Route path="albums" element={<AlbumsPage />} />
          <Route path="albums/:albumId" element={<AlbumDetailPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="playlists" element={<Playlists />} />
          <Route path="favorites" element={<Favorites />} />
          <Route path="history" element={<History />} />
          <Route path="profile" element={<Profile />} />
          <Route path="upload" element={<Upload />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminAccounts />} />
            <Route path="artists" element={<AdminArtists />} />
            <Route path="albums"  element={<AdminAlbums />} />
            <Route path="songs"   element={<AdminSongs />} />
            <Route path="accounts" element={<AdminAccounts />} />
            <Route path="admins" element={<AdminAdmins />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
