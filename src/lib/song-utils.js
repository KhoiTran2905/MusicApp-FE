export function resolveSongEntity(value) {
  return value?.song || value?.music || value?.track || value || null
}

export function resolveSongId(value) {
  const song = resolveSongEntity(value)
  return song?.id || song?._id || value?.songId || null
}

export function resolveSongTitle(value) {
  const song = resolveSongEntity(value)
  return song?.title || song?.name || song?.songName || 'Untitled song'
}

export function resolveSongArtistName(value) {
  const song = resolveSongEntity(value)
  if (!song) return 'Unknown artist'
  if (typeof song.artist === 'string') return song.artist
  return song.artist?.name || 'Unknown artist'
}
