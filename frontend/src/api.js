// All API calls go to Django backend
// In dev: proxied to http://localhost:8000 via package.json proxy
// In prod: Railway URL set via REACT_APP_API_URL env var

const BASE_URL = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL}/api/v1`
  : '/api/v1'

// ── Auth helpers ──────────────────────────────────────────────────────────────
function getTokens() {
  return {
    access:  localStorage.getItem('mb_access'),
    refresh: localStorage.getItem('mb_refresh'),
  }
}

function setTokens(access, refresh) {
  localStorage.setItem('mb_access', access)
  if (refresh) localStorage.setItem('mb_refresh', refresh)
}

function clearTokens() {
  localStorage.removeItem('mb_access')
  localStorage.removeItem('mb_refresh')
}

// ── Base fetch with auto JWT refresh ─────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const { access } = getTokens()

  const headers = {
    'Content-Type': 'application/json',
    ...(access ? { Authorization: `Bearer ${access}` } : {}),
    ...options.headers,
  }

  let res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  // Auto-refresh on 401
  if (res.status === 401) {
    const { refresh } = getTokens()
    if (refresh) {
      const refreshRes = await fetch(`${BASE_URL}/auth/token/refresh/`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refresh }),
      })
      if (refreshRes.ok) {
        const data = await refreshRes.json()
        setTokens(data.access, data.refresh)
        headers.Authorization = `Bearer ${data.access}`
        res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
      } else {
        clearTokens()
        window.location.href = '/login'
        return null
      }
    }
  }

  return res
}

// ── Auth API ──────────────────────────────────────────────────────────────────
export const authAPI = {
  async register(email, password, password2, name = '') {
    const res = await fetch(`${BASE_URL}/auth/register/`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password, password2, name }),
    })
    const data = await res.json()
    if (res.ok && data.tokens) {
      setTokens(data.tokens.access, data.tokens.refresh)
    }
    return { ok: res.ok, data }
  },

  async login(email, password) {
    const res = await fetch(`${BASE_URL}/auth/login/`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (res.ok) {
      setTokens(data.access, data.refresh)
    }
    return { ok: res.ok, data }
  },

  async logout() {
    const { refresh } = getTokens()
    await apiFetch('/auth/logout/', {
      method: 'POST',
      body:   JSON.stringify({ refresh }),
    })
    clearTokens()
  },

  async me() {
    const res = await apiFetch('/auth/me/')
    return res?.ok ? res.json() : null
  },

  isLoggedIn() {
    return !!getTokens().access
  },
}

// ── Modules API ───────────────────────────────────────────────────────────────
export const modulesAPI = {
  async list() {
    const res = await apiFetch('/modules/')
    return res?.ok ? res.json() : null
  },
}

// ── Chat API ──────────────────────────────────────────────────────────────────
export const chatAPI = {
  async createSession(moduleId, moodLabel = '') {
    const res = await apiFetch('/chat/sessions/', {
      method: 'POST',
      body:   JSON.stringify({ module_id: moduleId, mood_label: moodLabel }),
    })
    return res?.ok ? res.json() : null
  },

  async getSessions(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res   = await apiFetch(`/chat/sessions/${query ? '?' + query : ''}`)
    return res?.ok ? res.json() : null
  },

  async endSession(sessionId) {
    const res = await apiFetch(`/chat/sessions/${sessionId}/`, {
      method: 'PATCH',
      body:   JSON.stringify({ end: true }),
    })
    return res?.ok ? res.json() : null
  },

  // Returns a ReadableStream for SSE
  streamMessage(sessionId, content, useRag = false) {
    const { access } = getTokens()
    return fetch(`${BASE_URL}/chat/sessions/${sessionId}/messages/`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        Authorization:   `Bearer ${access}`,
      },
      body: JSON.stringify({ content, use_rag: useRag }),
    })
  },

  async logMood(mood, score = null, note = '') {
    const res = await apiFetch('/chat/moods/', {
      method: 'POST',
      body:   JSON.stringify({ mood, score, note }),
    })
    return res?.ok ? res.json() : null
  },

  async getMoods() {
    const res = await apiFetch('/chat/moods/')
    return res?.ok ? res.json() : null
  },
}

// ── Scanner API ───────────────────────────────────────────────────────────────
export const scannerAPI = {
  async scan(imageBase64) {
    const res = await apiFetch('/scanner/scan/', {
      method: 'POST',
      body:   JSON.stringify({ image_base64: imageBase64 }),
    })
    return res?.ok ? res.json() : null
  },
}

// ── Admin API ─────────────────────────────────────────────────────────────────
export const adminAPI = {
  async stats() {
    const res = await apiFetch('/auth/admin/stats/')
    return res?.ok ? res.json() : null
  },

  async users(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res   = await apiFetch(`/auth/admin/users/${query ? '?' + query : ''}`)
    return res?.ok ? res.json() : null
  },

  async updateUser(id, data) {
    const res = await apiFetch(`/auth/admin/users/${id}/`, {
      method: 'PATCH',
      body:   JSON.stringify(data),
    })
    return res?.ok ? res.json() : null
  },
}
