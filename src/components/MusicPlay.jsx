import { useEffect, useRef, useState } from 'react'
import { Play, Pause, SkipBack, SkipForward, Volume2, ChevronUp, ChevronDown, X, ListMusic, Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiUtils, playlistsApi } from '@/lib/api'

function MusicPlay({ songs = [], currentSong: activeSong, onSongChange } = {}) {
  const audioRef = useRef(null)
  const [currentSongIndex, setCurrentSongIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isShuffling, setIsShuffling] = useState(false)
  const [repeatMode, setRepeatMode] = useState('none')
  const [showLyrics, setShowLyrics] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [queue, setQueue] = useState(songs)
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false)
  const [playlists, setPlaylists] = useState([])
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('')
  const [playlistsLoading, setPlaylistsLoading] = useState(false)
  const [addingToPlaylist, setAddingToPlaylist] = useState(false)
  const [playlistMessage, setPlaylistMessage] = useState({ type: '', text: '' })

  const currentSong = activeSong || queue[currentSongIndex] || songs[0]

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setQueue(songs)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [songs])

  useEffect(() => {
    if (!activeSong) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      const nextQueue = [activeSong, ...songs.filter((song) => song?.id !== activeSong?.id)]
      setQueue(nextQueue)
      setCurrentSongIndex(0)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [activeSong, songs])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  useEffect(() => {
    if (!showAddToPlaylist) {
      return
    }

    let isActive = true

    async function loadPlaylists() {
      setPlaylistsLoading(true)
      setPlaylistMessage({ type: '', text: '' })

      try {
        const data = await playlistsApi.getPlaylists({ size: 100 })
        if (!isActive) return

        const items = apiUtils.extractList(data)
        setPlaylists(items)
        setSelectedPlaylistId((prev) => prev || items[0]?.id || items[0]?._id || '')
      } catch (error) {
        if (!isActive) return
        setPlaylistMessage({ type: 'error', text: error.message || 'Không tải được danh sách playlist.' })
      } finally {
        if (isActive) {
          setPlaylistsLoading(false)
        }
      }
    }

    loadPlaylists()

    return () => {
      isActive = false
    }
  }, [showAddToPlaylist])

  useEffect(() => {
    if (currentSong && audioRef.current) {
      audioRef.current.src = currentSong.fileUrl || currentSong.url || ''
      if (isPlaying) {
        audioRef.current.play()
      }
    }
  }, [currentSong, isPlaying])

  function togglePlay() {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  function nextSong() {
    let nextIndex = currentSongIndex + 1
    if (nextIndex >= queue.length) {
      nextIndex = 0
    }
    setCurrentSongIndex(nextIndex)
    onSongChange?.(queue[nextIndex])
  }

  function prevSong() {
    let prevIndex = currentSongIndex - 1
    if (prevIndex < 0) {
      prevIndex = queue.length - 1
    }
    setCurrentSongIndex(prevIndex)
    onSongChange?.(queue[prevIndex])
  }

  function toggleShuffle() {
    if (isShuffling) {
      setQueue([...songs])
      setCurrentSongIndex(0)
    } else {
      const shuffled = [...songs].sort(() => Math.random() - 0.5)
      setQueue(shuffled)
      setCurrentSongIndex(0)
    }
    setIsShuffling(!isShuffling)
  }

  function toggleRepeat() {
    const modes = ['none', 'one', 'all']
    const currentIndex = modes.indexOf(repeatMode)
    setRepeatMode(modes[(currentIndex + 1) % modes.length])
  }

  function handleTimeUpdate() {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  function handleLoadedMetadata() {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  async function handleAddSongToPlaylist() {
    if (!selectedPlaylistId || !currentSong) {
      setPlaylistMessage({ type: 'error', text: 'Vui lòng chọn playlist hợp lệ.' })
      return
    }

    const songId = currentSong.id || currentSong._id
    if (!songId) {
      setPlaylistMessage({ type: 'error', text: 'Không xác định được bài hát hiện tại.' })
      return
    }

    setAddingToPlaylist(true)
    setPlaylistMessage({ type: '', text: '' })

    try {
      await playlistsApi.addSongIntoPlaylist(selectedPlaylistId, { songId })
      setPlaylistMessage({ type: 'success', text: 'Đã thêm bài hát vào playlist.' })
    } catch (error) {
      setPlaylistMessage({ type: 'error', text: error.message || 'Không thêm được bài hát vào playlist.' })
    } finally {
      setAddingToPlaylist(false)
    }
  }

  function openPlaylistDialog() {
    setPlaylistMessage({ type: '', text: '' })
    setShowAddToPlaylist(true)
  }

  function closePlaylistDialog() {
    setShowAddToPlaylist(false)
    setPlaylistMessage({ type: '', text: '' })
  }

  function handleEnded() {
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0
        audioRef.current.play()
      }
    } else {
      nextSong()
    }
  }

  function handleSeek(e) {
    const newTime = parseFloat(e.target.value)
    setCurrentTime(newTime)
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
    }
  }

  function formatTime(time) {
    if (!time || isNaN(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  function getArtistName(song) {
    if (!song) return 'Unknown artist'
    if (typeof song.artist === 'string') return song.artist
    if (song.artist && typeof song.artist === 'object') {
      return song.artist.name || 'Unknown artist'
    }
    return 'Unknown artist'
  }

  if (!currentSong) {
    return <div className="text-center p-4 text-gray-500">Không có bài hát nào</div>
  }

  return (
    <>
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      {/* Lyrics Panel */}
      {showLyrics && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-xl max-w-xl w-full max-h-80 overflow-y-auto p-4 relative">
            <button
              onClick={() => setShowLyrics(false)}
              className="absolute top-3 right-3 p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold mb-1 text-red-700">{currentSong.title}</h3>
            <p className="text-sm text-gray-600 mb-4">{getArtistName(currentSong)}</p>
            <div className="whitespace-pre-line text-sm text-gray-700 leading-relaxed">
              {currentSong.lyrics || 'Không có lời bài hát'}
            </div>
          </div>
        </div>
      )}

      {/* Player Bar */}
      <div className="fixed bottom-2 left-6 right-2 md:bottom-3 md:left-[calc(16rem+3rem)] md:right-10 xl:left-[calc(16rem+3.5rem)] xl:right-14 bg-gradient-to-t from-red-800 to-red-700 text-white shadow-xl z-40 rounded-lg md:rounded-xl">
        {/* Minimized View */}
        {isMinimized && (
          <div className="px-3 py-2 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate text-sm text-white">{currentSong.title}</p>
              <p className="text-xs text-red-100 truncate">{getArtistName(currentSong)}</p>
            </div>
            <Button
              onClick={togglePlay}
              className="h-7 min-w-7 px-2 bg-white text-red-700 hover:bg-red-100 font-semibold"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsMinimized(false)}
              className="h-7 w-7 shrink-0 p-0 text-white hover:bg-red-700"
              title="Expand"
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Expanded View */}
        {!isMinimized && (
          <>
        {/* Progress Bar */}
        <div className="px-2.5 pt-1.5 pb-1 md:px-3 md:pt-2 md:pb-1.5">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-0.5 bg-red-600 rounded-full appearance-none cursor-pointer accent-red-200"
          />
          <div className="flex justify-between text-[9px] md:text-[10px] text-red-100 mt-0.5">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Main Player Controls */}
        <div className="px-2.5 py-2 md:px-3 md:py-2.5 flex items-center justify-between gap-2 md:gap-3">
          {/* Song Info */}
          <div className="flex-1 min-w-0 max-w-[28%] md:max-w-none">
            <p className="font-semibold truncate text-xs md:text-sm text-white">{currentSong.title}</p>
            <p className="text-[10px] md:text-xs text-red-100 truncate">{getArtistName(currentSong)}</p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-0.5 md:gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleShuffle}
              className={`h-6 w-6 p-0 md:h-7 md:w-7 md:p-0 text-white hover:bg-red-700 ${isShuffling ? 'bg-red-700' : ''}`}
              title="Shuffle"
            >
              <span className="text-[10px] md:text-xs">⇄</span>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={prevSong}
              className="h-6 w-6 p-0 md:h-7 md:w-7 md:p-0 text-white hover:bg-red-700"
            >
              <SkipBack className="w-3 h-3 md:w-3.5 md:h-3.5" />
            </Button>

            <Button
              onClick={togglePlay}
              className="h-7 min-w-7 md:h-8 md:min-w-8 px-2 md:px-2.5 bg-white text-red-700 hover:bg-red-100 font-semibold"
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 md:w-4 md:h-4" />
              ) : (
                <Play className="w-3.5 h-3.5 md:w-4 md:h-4 ml-0.5" />
              )}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={nextSong}
              className="h-6 w-6 p-0 md:h-7 md:w-7 md:p-0 text-white hover:bg-red-700"
            >
              <SkipForward className="w-3 h-3 md:w-3.5 md:h-3.5" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={toggleRepeat}
              className={`h-6 w-6 p-0 md:h-7 md:w-7 md:p-0 text-white hover:bg-red-700 ${repeatMode !== 'none' ? 'bg-red-700' : ''}`}
              title={`Repeat: ${repeatMode}`}
            >
              <span className="text-[10px] md:text-xs">{repeatMode === 'one' ? '🔂' : '🔁'}</span>
            </Button>
          </div>

          {/* Volume & Lyrics */}
          <div className="flex items-center gap-0.5 md:gap-1 flex-shrink-0">
            <div className="flex items-center gap-1 w-12 sm:w-16 md:w-20 lg:w-24 xl:w-28">
              <Volume2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="flex-1 h-0.5 bg-red-600 rounded-full appearance-none cursor-pointer accent-red-200"
              />
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowLyrics(!showLyrics)}
              className={`h-6 w-6 p-0 md:h-7 md:w-7 md:p-0 text-white hover:bg-red-700 ${showLyrics ? 'bg-red-700' : ''}`}
              title="Show Lyrics"
            >
              <ChevronUp className="w-3 h-3 md:w-3.5 md:h-3.5" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={openPlaylistDialog}
              className="h-6 w-6 p-0 md:h-7 md:w-7 md:p-0 text-white hover:bg-red-700"
              title="Thêm vào playlist"
            >
              <ListMusic className="w-3 h-3 md:w-3.5 md:h-3.5" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsMinimized(true)}
              className="h-6 w-6 p-0 md:h-7 md:w-7 md:p-0 text-white hover:bg-red-700"
              title="Minimize"
            >
              <ChevronDown className="w-3 h-3 md:w-3.5 md:h-3.5" />
            </Button>
          </div>
        </div>
          </>
        )}
      </div>

      {showAddToPlaylist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-600">Playlist của bạn</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">Thêm bài hát vào playlist</h3>
                <p className="mt-1 text-sm text-slate-500 truncate">{currentSong.title}</p>
              </div>
              <button
                type="button"
                onClick={closePlaylistDialog}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close playlist dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700" htmlFor="playlist-select">
                Chọn playlist
              </label>
              <select
                id="playlist-select"
                value={selectedPlaylistId}
                onChange={(e) => setSelectedPlaylistId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-red-300"
                disabled={playlistsLoading || !playlists.length}
              >
                {!playlists.length && <option value="">Không có playlist nào</option>}
                {playlists.map((playlist) => {
                  const playlistId = playlist.id || playlist._id
                  return (
                    <option key={playlistId} value={playlistId}>
                      {playlist.name || playlist.title || 'Untitled playlist'}
                    </option>
                  )
                })}
              </select>

              {playlistsLoading && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tải playlist...
                </div>
              )}

              {!playlistsLoading && !playlists.length && (
                <p className="text-sm text-slate-500">Bạn chưa có playlist nào. Hãy tạo playlist trước khi thêm bài hát.</p>
              )}

              {playlistMessage.text && (
                <p className={`text-sm ${playlistMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {playlistMessage.text}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closePlaylistDialog}
                  className="border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Đóng
                </Button>
                <Button
                  type="button"
                  onClick={handleAddSongToPlaylist}
                  disabled={addingToPlaylist || playlistsLoading || !playlists.length}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  {addingToPlaylist ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang thêm...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Thêm vào playlist
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default MusicPlay
