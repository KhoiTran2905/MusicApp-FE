import { useEffect, useMemo, useState } from 'react'
import {
	ArrowRight,
	Clock3,
	Heart,
	LibraryBig,
	ListMusic,
	Mic2,
	Music2,
	Play,
	Search,
	Trash2,
	Upload,
} from 'lucide-react'

import { Link } from 'react-router-dom'

import { useMusic } from '@/contexts/MusicContext'
import { apiUtils, authApi, favoritesApi, historyApi, playlistsApi, songsApi } from '@/lib/api'
import { resolveSongArtistName, resolveSongEntity, resolveSongId, resolveSongTitle } from '@/lib/song-utils'

function UserDashboard() {
	const { setCurrentSong } = useMusic()
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [profile, setProfile] = useState(null)
	const [songs, setSongs] = useState([])
	const [playlists, setPlaylists] = useState([])
	const [favorites, setFavorites] = useState([])
	const [history, setHistory] = useState([])
	const [unlikingSongId, setUnlikingSongId] = useState('')

	useEffect(() => {
		let isMounted = true

		const fetchDashboard = async () => {
			setLoading(true)
			setError('')

			try {
				const [meResult, trendingResult, playlistsResult, favoritesResult, historyResult] = await Promise.allSettled([
					authApi.me(),
					songsApi.getTrendingSongs(),
					playlistsApi.getPlaylists(),
					favoritesApi.getFavorites({ size: 8 }),
					historyApi.getHistory(),
				])

				if (!isMounted) {
					return
				}

				if (meResult.status === 'fulfilled') {
					setProfile(meResult.value)
				}

				if (trendingResult.status === 'fulfilled') {
					setSongs(apiUtils.extractList(trendingResult.value))
				}

				if (playlistsResult.status === 'fulfilled') {
					setPlaylists(apiUtils.extractList(playlistsResult.value))
				}

				if (favoritesResult.status === 'fulfilled') {
					setFavorites(apiUtils.extractList(favoritesResult.value))
				}

				if (historyResult.status === 'fulfilled') {
					setHistory(apiUtils.extractList(historyResult.value))
				}

				const failedMessage = [meResult, trendingResult, playlistsResult, favoritesResult, historyResult]
					.filter((result) => result.status === 'rejected')
					.map((result) => result.reason?.message)
					.find(Boolean)

				if (failedMessage) {
					setError(failedMessage)
				}
			} catch (error) {
				if (isMounted) {
					setError(error.message || 'Không tải được dữ liệu bảng điều khiển.')
				}
			} finally {
				if (isMounted) {
					setLoading(false)
				}
			}
		}

		fetchDashboard()

		return () => {
			isMounted = false
		}
	}, [])

	const stats = useMemo(
		() => [
			{
				label: 'Bài hát thịnh hành',
				value: songs.length,
				icon: Music2,
				description: 'Danh sách đang nghe nhiều nhất',
			},
			{
				label: 'Playlist của bạn',
				value: playlists.length,
				icon: ListMusic,
				description: 'Thư viện cá nhân',
			},
			{
				label: 'Bài hát yêu thích',
				value: favorites.length,
				icon: Heart,
				description: 'Những bài hát đã lưu',
			},
			{
				label: 'Lịch sử nghe',
				value: history.length,
				icon: Clock3,
				description: 'Các lần nghe gần đây',
			},
		],
		[favorites.length, history.length, playlists.length, songs.length],
	)

	const featuredSongs = songs.slice(0, 6)
	const recentSongs = history.slice(0, 5).map((item, index) => {
		const song = resolveSongEntity(item)
		return {
			key: item.id || item._id || `${resolveSongId(song) || resolveSongTitle(song)}-${index}`,
			song,
		}
	})
	const quickActions = [
		{
			label: 'Tìm kiếm bài hát',
			desc: 'Tra cứu theo bài hát, nghệ sĩ, album hoặc playlist',
			to: '/music/search',
			icon: Search,
		},
		{
			label: 'Tạo playlist',
			desc: 'Lưu bộ sưu tập cá nhân theo mood hoặc chủ đề',
			to: '/music/playlists',
			icon: ListMusic,
		},
		{
			label: 'Tải nhạc lên',
			desc: 'Đăng bài hát mới để quản lý trong thư viện',
			to: '/music/upload',
			icon: Upload,
		},
	]

	async function handleUnlikeFromDashboard(song) {
		const songId = resolveSongId(song)
		if (!songId || unlikingSongId) return

		setUnlikingSongId(songId)
		setError('')

		try {
			await favoritesApi.unlikeSong(songId)
			setFavorites((prev) => prev.filter((favorite) => {
				const favoriteSongId = resolveSongId(favorite)
				return favoriteSongId !== songId
			}))
		} catch (err) {
			setError(err.message || 'Không thể bỏ yêu thích bài hát này.')
		} finally {
			setUnlikingSongId('')
		}
	}

	return (
		<div className="space-y-5 pb-24 sm:space-y-6 md:space-y-8 md:pb-40">
			<section
				className="
				overflow-hidden
				rounded-2xl md:rounded-3xl
				border border-red-100
				bg-linear-to-br
				from-red-700
				via-red-700
				to-slate-950
				p-4
				sm:p-5
				md:p-8
				text-white
				shadow-xl
				"
			>
				<div className="max-w-3xl space-y-5">
					<div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-red-50">
						<Mic2 className="h-4 w-4" />
						MusicFlow Studio
					</div>
					<div>
						<h1 className="text-2xl font-bold sm:text-3x1 leading-tight md:text-5xl">
							Xin chào{profile?.username ? `, ${profile.username}` : ''}.
						</h1>
						<p className="mt-2 max-w-2xl text-xs sm:text-sm text-red-50/90 md:text-base">
							Quản lý bài hát, playlist, yêu thích và lịch sử nghe trong một không gian giống ứng dụng thực tế: nhanh, trực quan và có dữ liệu thật từ backend.
						</p>
					</div>

					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
						{stats.map((stat) => {
							const StatIcon = stat.icon
							return (
								<div key={stat.label} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
									<div className="flex items-center justify-between gap-3">
										<div>
											<p className="text-xs uppercase tracking-wide text-red-50/80">{stat.label}</p>
											<p className="mt-2 text-3xl font-semibold">{loading ? '...' : stat.value}</p>
											<p className="mt-1 text-xs text-red-50/80">{stat.description}</p>
										</div>
										<StatIcon className="h-7 w-7 text-red-100" />
									</div>
								</div>
							)
						})}
					</div>
				</div>
			</section>

			{error && (
				<div
					className="
					rounded-xl
					md:rounded-2xl
					p-3
					sm:p-4
					border
					border-white/15
					bg-white/10
					"
				>
					{error}
				</div>
			)}

			<div
				className="
				grid
				grid-cols-1
				gap-4
				xl:grid-cols-[1.5fr_0.9fr]
				"
			>
				<section className="rounded-3xl border bg-white p-5 shadow-sm md:p-6">
					<div className="mb-4 flex items-center justify-between gap-3">
						<div>
							<h2 className="text-lg font-semibold text-slate-900 md:text-xl">Bài hát gợi ý hôm nay</h2>
						</div>
						<Play className="h-5 w-5 text-red-700" />
					</div>

					{loading ? (
						<div className="space-y-3">
							{Array.from({ length: 4 }).map((_, index) => (
								<div key={index} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
							))}
						</div>
					) : (
						<div className="space-y-2">
							{featuredSongs.map((song) => (
								<button
									type="button"
									key={resolveSongId(song) || resolveSongTitle(song)}
									onClick={() => setCurrentSong(song)}
									className="
									group
									flex
									w-full
									items-center
									gap-3
									rounded-2xl
									bg-white
									p-3
									text-left
									transition-all
									duration-200
									hover:bg-red-50
									hover:shadow-sm"
								>
									<div
										className="
										flex
										h-12
										w-12
										shrink-0
										items-center
										justify-center
										rounded-2xl
										bg-red-600
										text-white
										shadow"
									>
										<Music2 className="h-4 w-4" />
									</div>
									<div className="min-w-0 flex-1 overflow-hidden">
										<p className="truncate font-medium text-slate-900">{resolveSongTitle(song)}</p>
										<p className="truncate text-sm text-slate-500">{resolveSongArtistName(song)}</p>
									</div>
									<ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
								</button>
							))}

							{!featuredSongs.length && (
								<div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
									Chưa có bài hát nào để hiển thị.
								</div>
							)}
						</div>
					)}
				</section>

				<section className="rounded-3xl border bg-white p-5 shadow-sm md:p-6">
					<div className="mb-4">
						<h2 className="text-lg font-semibold text-slate-900 md:text-xl">Bắt đầu nhanh</h2>
					</div>

					<div className="space-y-3">
						{quickActions.map((action) => {
							const ActionIcon = action.icon
							return (
								<Link
									key={action.label}
									to={action.to}
									className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-red-200 hover:bg-white"
								>
									<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm transition group-hover:scale-105">
										<ActionIcon className="h-5 w-5" />
									</div>
									<div className="min-w-0 flex-1">
										<p className="font-medium text-slate-900">{action.label}</p>
										<p className="mt-1 text-sm text-slate-500">{action.desc}</p>
									</div>
									<ArrowRight className="mt-1 h-4 w-4 text-slate-400" />
								</Link>
							)
						})}
					</div>
				</section>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<section className="rounded-3xl border bg-white p-5 shadow-sm md:p-6">
					<div className="mb-4 flex items-center gap-2">
						<Heart className="h-5 w-5 text-red-700" />
						<div>
							<h2 className="font-semibold text-slate-900">Yêu thích gần đây</h2>
							<p className="text-sm text-slate-500">Các bài đã lưu để nghe lại nhanh.</p>
						</div>
					</div>

					<div className="space-y-2">
						{favorites.slice(0, 5).map((favorite) => {
							const song = resolveSongEntity(favorite)
							const songId = resolveSongId(favorite)
							const isUnliking = unlikingSongId === songId

							return (
								<div
									key={favorite.id || resolveSongId(song) || resolveSongTitle(song)}
									className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 transition hover:bg-red-50"
								>
									<button
										type="button"
										onClick={() => setCurrentSong(song)}
										className="flex min-w-0 flex-1 items-center gap-3 text-left"
									>
										<Heart className="h-4 w-4 shrink-0 text-red-700" />
										<div className="min-w-0 flex-1">
											<p className="truncate font-medium text-slate-900">{resolveSongTitle(song)}</p>
											<p className="truncate text-sm text-slate-500">{resolveSongArtistName(song)}</p>
										</div>
										<Play className="h-4 w-4 text-slate-400" />
									</button>

									<button
										type="button"
										onClick={() => handleUnlikeFromDashboard(song)}
										disabled={isUnliking}
										className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
									>
										<Trash2 className="h-3.5 w-3.5" />
										{isUnliking ? 'Đang bỏ...' : ''}
									</button>
								</div>
							)
						})}

						{!favorites.length && (
							<div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
								Chưa có bài hát yêu thích.
							</div>
						)}
					</div>
				</section>

				<section className="rounded-3xl border bg-white p-5 shadow-sm md:p-6">
					<div className="mb-4 flex items-center gap-2">
						<Clock3 className="h-5 w-5 text-red-700" />
						<div>
							<h2 className="font-semibold text-slate-900">Nghe gần đây</h2>
							<p className="text-sm text-slate-500">Lịch sử phát gần nhất của bạn.</p>
						</div>
					</div>

					<div className="space-y-2">
						{recentSongs.map((item) => (
							<button
								type="button"
								key={item.key}
								onClick={() => setCurrentSong(item.song)}
								className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:bg-red-50"
							>
								<Clock3 className="h-4 w-4 shrink-0 text-red-700" />
								<div className="min-w-0 flex-1">
									<p className="truncate font-medium text-slate-900">{resolveSongTitle(item.song)}</p>
									<p className="truncate text-sm text-slate-500">{resolveSongArtistName(item.song)}</p>
								</div>
								<Play className="h-4 w-4 text-slate-400" />
							</button>
						))}

						{!recentSongs.length && (
							<div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
								Chưa có lịch sử nghe.
							</div>
						)}
					</div>
				</section>
			</div>

			<section className="rounded-3xl border bg-white p-5 shadow-sm md:p-6">
				<div className="mb-4 flex items-center gap-2">
					<LibraryBig className="h-5 w-5 text-red-700" />
					<div>
						<h2 className="font-semibold text-slate-900">Playlist của bạn</h2>
						<p className="text-sm text-slate-500">Các playlist tạo sẵn, phù hợp kiểu ứng dụng streaming thực tế.</p>
					</div>
				</div>

				<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
					{playlists.slice(0, 4).map((playlist) => (
						<div key={playlist.id || playlist._id || playlist.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="font-medium text-slate-900">{playlist.name || playlist.title || 'Untitled playlist'}</p>
									<p className="mt-1 text-sm text-slate-500">{playlist.songCount || playlist.songs?.length || 0} bài hát</p>
								</div>
								<ListMusic className="h-5 w-5 text-red-700" />
							</div>
						</div>
					))}

					{!playlists.length && (
						<div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500 md:col-span-2 xl:col-span-4">
							Chưa có playlist nào. Hãy tạo playlist đầu tiên để quản lý gu nghe của bạn.
						</div>
					)}
				</div>
			</section>
		</div>
	)
}

export default UserDashboard
