const BASE_URL = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL}/api/v1`
  : '/api/v1'

// ── Token storage ─────────────────────────────────────────────────────────────
function getTokens() {
  return {
    access:  localStorage.getItem('mb_access'),
    refresh: localStorage.getItem('mb_refresh'),
  }
}

function setTokens(access, refresh) {
  if (access)  localStorage.setItem('mb_access',  access)
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

  // Try refresh on 401
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
        return null
      }
    } else {
      return null
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
    // Return the user object from register
    return { ok: res.ok, data: data.user || data, error: res.ok ? null : data }
  },

  async login(email, password) {
    const res = await fetch(`${BASE_URL}/auth/login/`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (res.ok) {
      // SimpleJWT returns { access, refresh } at top level
      setTokens(data.access, data.refresh)
    }
    return { ok: res.ok, data, error: res.ok ? null : data }
  },

  async logout() {
    const { refresh } = getTokens()
    try {
      await apiFetch('/auth/logout/', {
        method: 'POST',
        body:   JSON.stringify({ refresh }),
      })
    } catch { /* ignore */ }
    clearTokens()
  },

  async me() {
    const res = await apiFetch('/auth/me/')
    if (!res || !res.ok) return null
    return res.json()
  },

  isLoggedIn() {
    return !!getTokens().access
  },
}

// ── Chat API ──────────────────────────────────────────────────────────────────
export const chatAPI = {
  async createSession(moduleId) {
    const res = await apiFetch('/chat/sessions/', {
      method: 'POST',
      body:   JSON.stringify({ module_id: moduleId }),
    })
    if (!res || !res.ok) return null
    return res.json()
  },

  async endSession(sessionId) {
    const res = await apiFetch(`/chat/sessions/${sessionId}/`, {
      method: 'PATCH',
      body:   JSON.stringify({ end: true }),
    })
    return res?.ok ? res.json() : null
  },

  streamMessage(sessionId, content) {
    const { access } = getTokens()
    return fetch(`${BASE_URL}/chat/sessions/${sessionId}/messages/`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${access}`,
      },
      body: JSON.stringify({ content }),
    })
  },

  async getMoods() {
    const res = await apiFetch('/chat/moods/')
    return res?.ok ? res.json() : null
  },
}

// ── Modules API ───────────────────────────────────────────────────────────────
export const modulesAPI = {
  async list() {
    const res = await apiFetch('/modules/')
    return res?.ok ? res.json() : null
  },
}
