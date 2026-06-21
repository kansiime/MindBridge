// ── API Base URL ──────────────────────────────────────────────────────────────
// In production: REACT_APP_API_URL is set on Render to the backend URL
// Fallback: hardcoded Render backend URL
const BASE_URL = (
  process.env.REACT_APP_API_URL ||
  'https://mindbridge-api-z1x5.onrender.com'
) + '/api/v1'

console.log('[MindBridge] API URL:', BASE_URL)

// ── Token helpers ─────────────────────────────────────────────────────────────
const getAccess  = () => localStorage.getItem('mb_access')
const getRefresh = () => localStorage.getItem('mb_refresh')

function saveTokens(access, refresh) {
  if (access)  localStorage.setItem('mb_access',  access)
  if (refresh) localStorage.setItem('mb_refresh', refresh)
}

function clearTokens() {
  localStorage.removeItem('mb_access')
  localStorage.removeItem('mb_refresh')
}

// ── Authenticated fetch ───────────────────────────────────────────────────────
async function authFetch(path, options = {}) {
  const token = getAccess()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const url = `${BASE_URL}${path}`
  console.log('[API]', options.method || 'GET', url)

  let res = await fetch(url, { ...options, headers })
  console.log('[API] response:', res.status, path)

  // Auto-refresh on 401
  if (res.status === 401) {
    const refresh = getRefresh()
    if (refresh) {
      console.log('[API] refreshing token...')
      const rRes = await fetch(`${BASE_URL}/auth/token/refresh/`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refresh }),
      })
      if (rRes.ok) {
        const rData = await rRes.json()
        saveTokens(rData.access, rData.refresh)
        headers.Authorization = `Bearer ${rData.access}`
        res = await fetch(url, { ...options, headers })
        console.log('[API] retry after refresh:', res.status)
      } else {
        console.log('[API] refresh failed, clearing tokens')
        clearTokens()
        return null
      }
    } else {
      console.log('[API] no refresh token available')
      return null
    }
  }

  return res
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  async register(email, password, password2, name = '') {
    const res = await fetch(`${BASE_URL}/auth/register/`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password, password2, name }),
    })
    const data = await res.json()
    console.log('[AUTH] register response:', data)
    if (res.ok && data.tokens) {
      saveTokens(data.tokens.access, data.tokens.refresh)
      return { ok: true, user: data.user }
    }
    return { ok: false, error: data }
  },

  async login(email, password) {
    // SimpleJWT TokenObtainPairView returns { access, refresh }
    const res = await fetch(`${BASE_URL}/auth/login/`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    })
    const data = await res.json()
    console.log('[AUTH] login response:', res.status, Object.keys(data))
    if (res.ok && data.access) {
      saveTokens(data.access, data.refresh)
      // Fetch user profile
      const profile = await authAPI.me()
      return { ok: true, user: profile || { email } }
    }
    return { ok: false, error: data }
  },

  async me() {
    const res = await authFetch('/auth/me/')
    if (!res || !res.ok) return null
    const data = await res.json()
    console.log('[AUTH] me:', data)
    return data
  },

  async logout() {
    const refresh = getRefresh()
    try {
      if (refresh) {
        await authFetch('/auth/logout/', {
          method: 'POST',
          body:   JSON.stringify({ refresh }),
        })
      }
    } catch { /* ignore */ } finally {
      clearTokens()
    }
  },

  isLoggedIn: () => !!getAccess(),
}

// ── Chat ──────────────────────────────────────────────────────────────────────
export const chatAPI = {
  async createSession(moduleId) {
    const res = await authFetch('/chat/sessions/', {
      method: 'POST',
      body:   JSON.stringify({ module_id: moduleId }),
    })
    if (!res) { console.error('[CHAT] createSession: no response (auth failed?)'); return null }
    if (!res.ok) { console.error('[CHAT] createSession failed:', res.status); return null }
    const data = await res.json()
    // DRF returns the object directly on create, not wrapped in {data: ...}
    const sid = data?.id || data?.data?.id
    console.log('[CHAT] session created:', sid, '| raw:', JSON.stringify(data))
    return { id: sid, ...data }
  },

  async endSession(sessionId) {
    const res = await authFetch(`/chat/sessions/${sessionId}/`, {
      method: 'PATCH',
      body:   JSON.stringify({ end: true }),
    })
    return res?.ok ? res.json() : null
  },

  streamMessage(sessionId, content) {
    const token = getAccess()
    if (!token) { console.error('[CHAT] no token for stream'); return null }
    const url = `${BASE_URL}/chat/sessions/${sessionId}/messages/`
    console.log('[CHAT] streaming to:', url)
    return fetch(url, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
    })
  },
}
