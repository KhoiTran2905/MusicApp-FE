import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Album, Heart, ListMusic, Music2, Play, UserRound } from 'lucide-react'

import { useMusic } from '@/contexts/MusicContext'
import { apiUtils, searchApi, favoritesApi } from '@/lib/api'
import LikeButton from '@/components/LikeButton'
import { resolveSongListenerCount } from '@/lib/song-utils'

const SONG_SORT_OPTIONS = [
  { value: 'listeners-desc', label: 'Nghe nhiều nhất' },
  { value: 'listeners-asc', label: 'Nghe ít nhất' },
  { value: 'title-asc', label: 'Tên A-Z' },
  { value: 'title-desc', label: 'Tên Z-A' },
]

function normalizeSearchResults(data) {
  if (!data) {
    return { songs: [], artists: [], albums: [], playlists: [] }
  }

  const payload = data?.data || data

  return {
    songs: apiUtils.extractList(payload?.songs),
    artists: apiUtils.extractList(payload?.artists),
    albums: apiUtils.extractList(payload?.albums),
    playlists: apiUtils.extractList(payload?.playlists),
  }
}

function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}

function itemMatchesQuery(item, query, fields) {
  if (!query) return true

  return fields.some((field) => {
    const value = field.split('.').reduce((current, key) => current?.[key], item)
    if (Array.isArray(value)) {
      return value.some((entry) => normalizeSearchText(entry?.name || entry?.title || entry).includes(query))
    }

    return normalizeSearchText(value).includes(query)
  })
}

function filterSearchResults(results, query) {
  return {
    songs: results.songs.filter((song) => itemMatchesQuery(song, query, ['title', 'name', 'songName', 'artist', 'artist.name', 'album', 'album.name', 'album.title'])),
    artists: results.artists.filter((artist) => itemMatchesQuery(artist, query, ['name', 'fullName', 'bio', 'description'])),
    albums: results.albums.filter((album) => itemMatchesQuery(album, query, ['name', 'title', 'description', 'artist', 'artist.name'])),
    playlists: results.playlists.filter((playlist) => itemMatchesQuery(playlist, query, ['name', 'title', 'description'])),
  }
}

function SongRow({ song, onPlay, isLiked, onLikeChange }) {
  const title = song.title || song.name || song.songName || 'Untitled song'
  const artistName = typeof song.artist === 'string' ? song.artist : song.artist?.name || 'Unknown artist'
  const listenerCount = resolveSongListenerCount(song)

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 hover:bg-slate-100 transition group">
      <Music2 className="w-4 h-4 text-red-700 shrink-0" />
      <button
        type="button"
        onClick={() => onPlay(song)}
        className="min-w-0 flex-1 text-left"
      >
        <p className="font-medium text-slate-900 truncate">{title}</p>
        <p className="text-sm text-slate-500 truncate">{artistName}</p>
        <p className="text-xs text-slate-400 truncate">{listenerCount} lượt nghe</p>
      </button>
      <Play className="w-4 h-4 text-slate-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <LikeButton
          songId={song.id || song._id}
          initialLiked={isLiked}
          onLikeChange={onLikeChange}
        />
      </div>
    </div>
  )
}

export default function SearchPage() {
  const { setCurrentSong } = useMusic()
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q')?.trim() || ''
  const normalizedQuery = useMemo(() => normalizeSearchText(query), [query])
  const [results, setResults] = useState({ songs: [], artists: [], albums: [], playlists: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [likedSongs, setLikedSongs] = useState(new Set())
  const [songSort, setSongSort] = useState('listeners-desc')

  // Load user's favorite songs
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const favorites = await favoritesApi.getFavorites({ size: 1000 })
        const favoriteIds = new Set(
          (Array.isArray(favorites) ? favorites : favorites?.data || []).map(
            (song) => song.id || song._id
          )
        )
        setLikedSongs(favoriteIds)
      } catch (err) {
        console.error('Error loading favorites:', err)
      }
    }

    loadFavorites()
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadResults() {
      if (!normalizedQuery) {
        setResults({ songs: [], artists: [], albums: [], playlists: [] })
        setLoading(false)
        setError('')
        return
      }

      setLoading(true)
      setError('')

      try {
        const data = await searchApi.search(normalizedQuery)
        if (!isMounted) return
        setResults(filterSearchResults(normalizeSearchResults(data), normalizedQuery))
      } catch (err) {
        if (!isMounted) return
        setError(err.message || 'Không tìm thấy kết quả phù hợp.')
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadResults()

    return () => {
      isMounted = false
    }
  }, [normalizedQuery])

  const hasResults = useMemo(
    () => results.songs.length || results.artists.length || results.albums.length || results.playlists.length,
    [results],
  )

  const sortedSongs = useMemo(() => {
    const items = [...results.songs]
    items.sort((left, right) => {
      const leftTitle = normalizeSearchText(left.title || left.name || left.songName || '')
      const rightTitle = normalizeSearchText(right.title || right.name || right.songName || '')
      const leftListenerCount = resolveSongListenerCount(left)
      const rightListenerCount = resolveSongListenerCount(right)

      switch (songSort) {
        case 'listeners-asc':
          return leftListenerCount - rightListenerCount
        case 'title-asc':
          return leftTitle.localeCompare(rightTitle)
        case 'title-desc':
          return rightTitle.localeCompare(leftTitle)
        case 'listeners-desc':
        default:
          return rightListenerCount - leftListenerCount
      }
    })
    return items
  }, [results.songs, songSort])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Tìm Kiếm Tổng Hợp</h1>
        <p className="text-slate-600 mt-2">
          {query ? `Kết quả cho “${query}”` : 'Nhập từ khóa ở thanh tìm kiếm phía trên.'}
        </p>
      </div>

      {!query && (
        <div className="rounded-xl border bg-white p-5 shadow-sm text-sm text-slate-500">
          Tìm theo bài hát, nghệ sĩ, album hoặc playlist.
        </div>
      )}

      {loading && <p className="text-sm text-slate-500">Đang tải kết quả...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!!query && !loading && !error && !hasResults && (
        <div className="rounded-xl border bg-white p-5 shadow-sm text-sm text-slate-500">
          Không có kết quả nào phù hợp.
        </div>
      )}

      {!!hasResults && (
        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Music2 className="w-5 h-5 text-red-700" />
                <h2 className="text-lg font-semibold text-slate-900">Bài hát</h2>
              </div>
              <select
                value={songSort}
                onChange={(event) => setSongSort(event.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
              >
                {SONG_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              {sortedSongs.map((song) => (
                <SongRow 
                  key={song.id || song._id || song.title} 
                  song={song} 
                  onPlay={setCurrentSong}
                  isLiked={likedSongs.has(song.id || song._id)}
                  onLikeChange={(isLiked) => {
                    const newLikedSongs = new Set(likedSongs)
                    if (isLiked) {
                      newLikedSongs.add(song.id || song._id)
                    } else {
                      newLikedSongs.delete(song.id || song._id)
                    }
                    setLikedSongs(newLikedSongs)
                  }}
                />
              ))}
            </div>
          </section>

          <section className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <UserRound className="w-5 h-5 text-red-700" />
              <h2 className="text-lg font-semibold text-slate-900">Nghệ sĩ</h2>
            </div>
            <div className="space-y-2">
              {results.artists.map((artist) => (
                <Link
                  key={artist.id || artist._id || artist.name}
                  to={`/music/artists/${artist.id || artist._id}`}
                  className="block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 transition hover:border-red-200 hover:bg-red-50"
                >
                  <p className="font-medium text-slate-900 truncate">{artist.name || artist.fullName || 'Unknown artist'}</p>
                  <p className="text-sm text-slate-500 truncate">{artist.bio || artist.description || 'Nghệ sĩ'}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Album className="w-5 h-5 text-red-700" />
              <h2 className="text-lg font-semibold text-slate-900">Album</h2>
            </div>
            <div className="space-y-2">
              {results.albums.map((album) => (
                <Link
                  key={album.id || album._id || album.name}
                  to={`/music/albums/${album.id || album._id}`}
                  className="block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 transition hover:border-red-200 hover:bg-red-50"
                >
                  <p className="font-medium text-slate-900 truncate">{album.name || album.title || 'Untitled album'}</p>
                  <p className="text-sm text-slate-500 truncate">{album.description || album.artist?.name || 'Album'}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ListMusic className="w-5 h-5 text-red-700" />
              <h2 className="text-lg font-semibold text-slate-900">Playlist</h2>
            </div>
            <div className="space-y-2">
              {results.playlists.map((playlist) => (
                <div key={playlist.id || playlist._id || playlist.name} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="font-medium text-slate-900 truncate">{playlist.name || playlist.title || 'Untitled playlist'}</p>
                  <p className="text-sm text-slate-500 truncate">
                    {playlist.description || `${playlist.songs?.length || 0} bài hát`}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {!query && (
        <div className="mt-6 text-sm text-slate-500">
          Quay lại <Link to="/music/trending" className="text-red-700 font-medium hover:underline">Nhạc Xu Hướng</Link> để xem bài hát đang thịnh hành.
        </div>
      )}
    </div>
  )
}
