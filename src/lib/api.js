const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

function buildUrl(path) {
	if (!path) {
		throw new Error('API path is required')
	}

	if (/^https?:\/\//i.test(path)) {
		return path
	}

	if (!API_BASE_URL) {
		return path
	}

	const normalizedBase = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL
	const normalizedPath = path.startsWith('/') ? path : `/${path}`

	return `${normalizedBase}${normalizedPath}`
}

export function getAccessToken() {
	if (typeof window === 'undefined') {
		return null
	}

	return window.localStorage.getItem('accessToken')
}

export function getRefreshToken() {
	if (typeof window === 'undefined') {
		return null
	}

	return window.localStorage.getItem('refreshToken')
}

export function setAccessToken(token) {
	if (typeof window === 'undefined') {
		return
	}

	if (!token) {
		window.localStorage.removeItem('accessToken')
		return
	}

	window.localStorage.setItem('accessToken', token)
}

export function clearAuthTokens() {
	if (typeof window === 'undefined') {
		return
	}

	window.localStorage.removeItem('accessToken')
	window.localStorage.removeItem('refreshToken')
}

export function createApiError(message, response, data = null) {
	const error = new Error(message)
	error.status = response?.status
	error.data = data
	return error
}

let refreshTokenPromise = null

function buildRequestInit(options = {}) {
	const { auth = false, headers, body, ...rest } = options
	const requestHeaders = new Headers(headers || {})

	if (auth) {
		const token = getAccessToken()
		if (token) {
			requestHeaders.set('Authorization', `Bearer ${token}`)
		}
	}

	let requestBody = body
	const isFormData = body instanceof FormData
	const isBodyObject =
		body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob)

	if (isBodyObject) {
		if (!requestHeaders.has('Content-Type')) {
			requestHeaders.set('Content-Type', 'application/json')
		}
		if (!requestHeaders.has('Accept')) {
			requestHeaders.set('Accept', 'application/json')
		}
		requestBody = JSON.stringify(body)
	} else if (isFormData) {
		// Don't set Content-Type for FormData - let browser handle it with boundary
		// But set Accept for the response
		if (!requestHeaders.has('Accept')) {
			requestHeaders.set('Accept', 'application/json')
		}
	}

	return {
		auth,
		requestInit: {
			...rest,
			headers: requestHeaders,
			body: requestBody,
		},
	}
}

async function parseResponse(response) {
	const contentType = response.headers.get('content-type') || ''

	if (contentType.includes('application/json')) {
		return response.json()
	}

	const text = await response.text()
	return text ? { message: text } : null
}

export async function apiFetch(path, options = {}) {
	const { auth, requestInit } = buildRequestInit(options)

	const executeRequest = () => fetch(buildUrl(path), requestInit)

	const handleResponse = async (response) => {
		const data = await parseResponse(response)

		if (!response.ok) {
			const message = data?.message || data?.error || data?.data?.message || 'Request failed'
			throw createApiError(message, response, data)
		}

		return { response, data }
	}

	const initialResponse = await executeRequest()

	if (initialResponse.status !== 401 || !auth || options.skipAuthRefresh) {
		return handleResponse(initialResponse)
	}

	const refreshToken = getRefreshToken()
	if (!refreshToken) {
		return handleResponse(initialResponse)
	}

	if (!refreshTokenPromise) {
		refreshTokenPromise = (async () => {
			const refreshedData = await apiJson('/api/auth/refresh-token', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${refreshToken}`,
				},
			})

			const nextAccessToken = refreshedData?.accessToken || refreshedData?.data?.accessToken
			if (!nextAccessToken) {
				throw new Error('Missing access token in refresh response')
			}

			setAccessToken(nextAccessToken)
			return nextAccessToken
		})().finally(() => {
			refreshTokenPromise = null
		})
	}

	try {
		const nextAccessToken = await refreshTokenPromise
		requestInit.headers.set('Authorization', `Bearer ${nextAccessToken}`)
		const retriedResponse = await executeRequest()

		if (retriedResponse.status === 401) {
			clearAuthTokens()
		}

		return handleResponse(retriedResponse)
	} catch (error) {
		clearAuthTokens()
		throw error
	}
}

function unwrapApiResponse(payload) {
	if (payload && typeof payload === 'object' && 'code' in payload && 'data' in payload) {
		return payload.data
	}

	return payload
}

export async function fetchWithAuth(path, options = {}) {
	return apiFetch(path, { ...options, auth: true })
}

export async function apiJson(path, options = {}) {
	const { data } = await apiFetch(path, options)
	return unwrapApiResponse(data)
}

export async function fetchWithAuthJson(path, options = {}) {
	const { data } = await fetchWithAuth(path, options)
	return unwrapApiResponse(data)
}

function toQueryString(params = {}) {
	const searchParams = new URLSearchParams()

	Object.entries(params).forEach(([key, value]) => {
		if (value === undefined || value === null || value === '') {
			return
		}

		searchParams.set(key, String(value))
	})

	const query = searchParams.toString()
	return query ? `?${query}` : ''
}

function extractList(data) {
	if (Array.isArray(data)) {
		return data
	}

	return data?.data?.content || data?.content || data?.items || data?.results || []
}

export const apiUtils = {
	toQueryString,
	extractList,
}

export const authApi = {
	login: (payload) => apiJson('/api/auth/login', { method: 'POST', body: payload }),
	requestLoginOtp: (payload) => apiJson('/api/auth/login/send-otp', { method: 'POST', body: payload }),
	verifyLoginOtp: (payload) => apiJson('/api/auth/login/verify-otp', { method: 'POST', body: payload }),
	requestRegisterOtp: (payload) => apiJson('/api/auth/register/send-otp', { method: 'POST', body: payload }),
	register: (payload) => apiJson('/api/auth/register', { method: 'POST', body: payload }),
	logout: () => apiJson('/api/auth/logout', { method: 'POST', auth: true }),
	refreshToken: () =>
		apiJson('/api/auth/refresh-token', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${getRefreshToken() || ''}`,
			},
		}),
	updatePassword: (payload) =>
		apiJson('/api/auth/update-password', { method: 'PUT', body: payload, auth: true }),
	updateProfile: (payload) =>
		apiJson('/api/auth/profile', { method: 'PUT', body: payload, auth: true }),
	me: () => fetchWithAuthJson('/api/auth/me'),
}

export const songsApi = {
	getSongs: (params = {}) =>
		fetchWithAuthJson(`/api/songs${toQueryString({ page: params.page, size: params.size, sort: params.sort, q: params.q })}`),
	getSongById: (id) => fetchWithAuthJson(`/api/songs/${id}`),
	getTrendingSongs: (params = {}) =>
		fetchWithAuthJson(`/api/songs/trending${toQueryString({ page: params.page, size: params.size })}`),
	searchSongs: (query, params = {}) =>
		fetchWithAuthJson(
			`/api/songs/search${toQueryString({ q: query, type: params.type, page: params.page, size: params.size })}`,
		),
	createSong: (payload) => apiJson('/api/songs', { method: 'POST', body: payload, auth: true }),
	updateSong: (id, payload) =>
		apiJson(`/api/songs/${id}`, { method: 'PUT', body: payload, auth: true }),
	deleteSong: (id) => apiJson(`/api/songs/${id}`, { method: 'DELETE', auth: true }),
	uploadSong: (formData) => apiJson('/api/songs', { method: 'POST', auth: true, body: formData }),
}

export const playlistsApi = {
	getPlaylists: (params = {}) =>
		fetchWithAuthJson(`/api/playlists${toQueryString({ page: params.page, size: params.size, q: params.q })}`),
	getPublicPlaylists: (params = {}) =>
		fetchWithAuthJson(`/api/playlists/public${toQueryString({ page: params.page, size: params.size, q: params.q })}`),
	getPlaylistById: (id) => fetchWithAuthJson(`/api/playlists/${id}`),
	createPlaylist: (payload) =>
		apiJson('/api/playlists', { method: 'POST', body: payload, auth: true }),
	updatePlaylist: (id, payload) =>
		apiJson(`/api/playlists/${id}`, { method: 'PUT', body: payload, auth: true }),
	deletePlaylist: (id) => apiJson(`/api/playlists/${id}`, { method: 'DELETE', auth: true }),
	addSongIntoPlaylist: (id, payload) =>
		apiJson(`/api/playlists/${id}/songs`, { method: 'POST', body: payload, auth: true }),
	removeSongFromPlaylist: (id, songId) =>
		apiJson(`/api/playlists/${id}/songs/${songId}`, { method: 'DELETE', auth: true }),
}

export const albumsApi = {
	getAlbums: (params = {}) =>
		fetchWithAuthJson(`/api/albums${toQueryString({ page: params.page, size: params.size, q: params.q, artistId: params.artistId })}`),
	getAlbumById: (id) => fetchWithAuthJson(`/api/albums/${id}`),
	createAlbum: (payload) => apiJson('/api/albums', { method: 'POST', body: payload, auth: true }),
	updateAlbum: (id, payload) =>
		apiJson(`/api/albums/${id}`, { method: 'PUT', body: payload, auth: true }),
	deleteAlbum: (id) => apiJson(`/api/albums/${id}`, { method: 'DELETE', auth: true }),
}

export const artistsApi = {
	getArtists: (params = {}) =>
		fetchWithAuthJson(`/api/artists${toQueryString({ page: params.page, size: params.size, q: params.q })}`),
	getArtistById: (id) => fetchWithAuthJson(`/api/artists/${id}`),
	getArtistSongs: (id, params = {}) =>
		fetchWithAuthJson(`/api/artists/${id}/songs${toQueryString({ page: params.page, size: params.size })}`),
	getArtistAlbums: (id, params = {}) =>
		fetchWithAuthJson(`/api/albums${toQueryString({ artistId: id, page: params.page, size: params.size, q: params.q })}`),
	getArtistFollowers: (id) => fetchWithAuthJson(`/api/artists/${id}/followers`),
	createArtist: (payload) => apiJson('/api/artists', { method: 'POST', body: payload, auth: true }),
	updateArtist: (id, payload) =>
		apiJson(`/api/artists/${id}`, { method: 'PUT', body: payload, auth: true }),
	deleteArtist: (id) => apiJson(`/api/artists/${id}`, { method: 'DELETE', auth: true }),
}

export const followApi = {
	getFollowedArtists: () => fetchWithAuthJson('/api/follow/artists'),
	checkFollowStatus: (id) => fetchWithAuthJson(`/api/follow/artists/${id}/status`),
	followArtist: (id) => apiJson(`/api/follow/artists/${id}`, { method: 'POST', auth: true }),
	unfollowArtist: (id) => apiJson(`/api/follow/artists/${id}`, { method: 'DELETE', auth: true }),
}

export const favoritesApi = {
	getFavorites: (params = {}) =>
		fetchWithAuthJson(`/api/favorites${toQueryString({ page: params.page, size: params.size, q: params.q })}`),
	likeSong: (songId) => apiJson(`/api/favorites/${songId}`, { method: 'POST', auth: true }),
	unlikeSong: (songId) => apiJson(`/api/favorites/${songId}`, { method: 'DELETE', auth: true }),
}

export const historyApi = {
	getHistory: (params = {}) =>
		fetchWithAuthJson(`/api/history${toQueryString({ page: params.page, size: params.size, q: params.q })}`),
	addHistory: (payload) => apiJson('/api/history', { method: 'POST', body: payload, auth: true }),
	deleteHistoryById: (id) => apiJson(`/api/history/${id}`, { method: 'DELETE', auth: true }),
	deleteAllHistory: () => apiJson('/api/history', { method: 'DELETE', auth: true }),
}

export const searchApi = {
	search: (query, params = {}) =>
		fetchWithAuthJson(`/api/search${toQueryString({ q: query, page: params.page, size: params.size })}`),
}

export const adminApi = {
	getStatus: () => fetchWithAuthJson('/api/admin/stats'),
	getUsers: (params = {}) =>
		fetchWithAuthJson(
			`/api/admin/users${toQueryString({ page: params.page, size: params.size, sort: params.sort, q: params.q })}`,
		),
	getUserById: (id) => fetchWithAuthJson(`/api/admin/users/${id}`),
	updateUser: (id, payload) =>
		apiJson(`/api/admin/users/${id}`, { method: 'PUT', body: payload, auth: true }),
	banUser: (id, payload) => apiJson(`/api/admin/users/${id}/ban`, { method: 'PUT', body: payload, auth: true }),
	unbanUser: (id) => apiJson(`/api/admin/users/${id}/unban`, { method: 'PUT', auth: true }),
	deleteAdminSong: (id) => apiJson(`/api/admin/songs/${id}`, { method: 'DELETE', auth: true }),
	getAdmins: (params = {}) =>
		fetchWithAuthJson(
			`/api/admin/admins${toQueryString({ page: params.page, size: params.size, sort: params.sort, q: params.q })}`,
		),
	createAdmin: (payload) => apiJson('/api/admin/admins', { method: 'POST', body: payload, auth: true }),
	deleteAdmin: (id) => apiJson(`/api/admin/admins/${id}`, { method: 'DELETE', auth: true }),
	updateAdminPassword: (id, payload) =>
		apiJson(`/api/admin/admins/${id}/password`, { method: 'PUT', body: payload, auth: true }),
}

export const uploadsApi = {
	getMyUploads: (params = {}) =>
		fetchWithAuthJson(`/api/uploads/me${toQueryString({ page: params.page, size: params.size })}`),
	getUploads: (params = {}) =>
		fetchWithAuthJson(`/api/uploads${toQueryString({ status: params.status, page: params.page, size: params.size })}`),
	approveUpload: (id) => apiJson(`/api/uploads/${id}/approve`, { method: 'PUT', auth: true }),
	rejectUpload: (id, payload) =>
		apiJson(`/api/uploads/${id}/reject`, { method: 'PUT', body: payload, auth: true }),
}
