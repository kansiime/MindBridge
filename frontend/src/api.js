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

// ── Therapist API ─────────────────────────────────────────────────────────────
export const therapistAPI = {
  async checkHandoff(sessionId, moduleId, messages, currentMessage) {
    const res = await authFetch('/therapists/check-handoff/', {
      method: 'POST',
      body: JSON.stringify({
        session_id:      sessionId,
        module_id:       moduleId,
        messages,
        current_message: currentMessage,
      }),
    })
    if (!res || !res.ok) return { trigger: false }
    return res.json()
  },

  async getAvailable(moduleId) {
    const res = await authFetch(`/therapists/available/?module=${moduleId}`)
    if (!res || !res.ok) return { available: false }
    return res.json()
  },

  async apply(data) {
    const res = await fetch(`${BASE_URL}/therapists/apply/`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    })
    return { ok: res.ok, data: await res.json() }
  },

  async directory(specialization = '') {
    const q   = specialization ? `?specialization=${specialization}` : ''
    const res = await authFetch(`/therapists/${q}`)
    if (!res || !res.ok) return []
    const data = await res.json()
    return data.results || data
  },

  async portal() {
    const res = await authFetch('/therapists/portal/')
    if (!res || !res.ok) return null
    return res.json()
  },

  async getProfile() {
    const res = await authFetch('/therapists/profile/')
    if (!res || !res.ok) return null
    return res.json()
  },

  async updateProfile(data) {
    const res = await authFetch('/therapists/profile/', {
      method: 'PATCH',
      body:   JSON.stringify(data),
    })
    return { ok: res?.ok, data: res?.ok ? await res.json() : null }
  },

  async listConnections() {
    const res = await authFetch('/therapists/connections/')
    if (!res || !res.ok) return []
    return res.json()
  },

  async requestConnection(therapistId, message = '') {
    const res = await authFetch('/therapists/connections/', {
      method: 'POST',
      body:   JSON.stringify({ therapist_id: therapistId, message }),
    })
    return { ok: res?.ok, data: res?.ok ? await res.json() : null }
  },

  async respondConnection(connectionId, action) {
    const res = await authFetch(`/therapists/connections/${connectionId}/respond/`, {
      method: 'PATCH',
      body:   JSON.stringify({ action }),
    })
    return res?.ok ? res.json() : null
  },

  async getDirectMessages(connectionId) {
    const res = await authFetch(`/therapists/connections/${connectionId}/messages/`)
    if (!res || !res.ok) return []
    return res.json()
  },

  async sendDirectMessage(connectionId, content) {
    const res = await authFetch(`/therapists/connections/${connectionId}/messages/`, {
      method: 'POST',
      body:   JSON.stringify({ content }),
    })
    return res?.ok ? res.json() : null
  },

  async getClinicalNotes(patientId = null) {
    const q = patientId ? `?patient=${patientId}` : ''
    const res = await authFetch(`/therapists/notes/${q}`)
    if (!res || !res.ok) return []
    const data = await res.json()
    return data.results || data
  },

  async createClinicalNote(data) {
    const res = await authFetch('/therapists/notes/', { method: 'POST', body: JSON.stringify(data) })
    return { ok: res?.ok, data: res?.ok ? await res.json() : null }
  },

  async updateClinicalNote(id, data) {
    const res = await authFetch(`/therapists/notes/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })
    return { ok: res?.ok, data: res?.ok ? await res.json() : null }
  },

  async getRiskFlags() {
    const res = await authFetch('/therapists/risk-flags/')
    if (!res || !res.ok) return []
    const data = await res.json()
    return data.results || data
  },

  async resolveRiskFlag(id) {
    const res = await authFetch(`/therapists/risk-flags/${id}/resolve/`, { method: 'PATCH' })
    return res?.ok
  },

  async getPatientOutcomes(patientId) {
    const res = await authFetch(`/therapists/outcomes/${patientId}/`)
    if (!res || !res.ok) return null
    return res.json()
  },

  async getAppointments() {
    const res = await authFetch('/therapists/appointments/')
    if (!res || !res.ok) return []
    const data = await res.json()
    return data.results || data
  },

  async createAppointment(data) {
    const res = await authFetch('/therapists/appointments/', { method: 'POST', body: JSON.stringify(data) })
    return { ok: res?.ok, data: res?.ok ? await res.json() : null }
  },

  async updateAppointment(id, data) {
    const res = await authFetch(`/therapists/appointments/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })
    return { ok: res?.ok, data: res?.ok ? await res.json() : null }
  },
}

// ── Wellbeing / WHO features API ──────────────────────────────────────────────
export const wellbeingAPI = {
  async getMoods() {
    const res = await authFetch('/chat/moods/')
    if (!res || !res.ok) return []
    const data = await res.json()
    return data.results || data
  },

  async addMood(score, note = '') {
    const res = await authFetch('/chat/moods/', {
      method: 'POST',
      body: JSON.stringify({ score, note }),
    })
    return res?.ok ? res.json() : null
  },

  async getSafetyPlan() {
    const res = await authFetch('/chat/safety-plan/')
    if (!res || !res.ok) return null
    return res.json()
  },

  async saveSafetyPlan(data) {
    const res = await authFetch('/chat/safety-plan/', { method: 'PUT', body: JSON.stringify(data) })
    return { ok: res?.ok, data: res?.ok ? await res.json() : null }
  },

  async getAssessments() {
    const res = await authFetch('/chat/assessments/')
    if (!res || !res.ok) return []
    const data = await res.json()
    return data.results || data
  },

  async createAssessment(type, responses, total_score, severity) {
    const res = await authFetch('/chat/assessments/', {
      method: 'POST',
      body: JSON.stringify({ type, responses, total_score, severity }),
    })
    return { ok: res?.ok, data: res?.ok ? await res.json() : null }
  },

  async getOutcomes() {
    const res = await authFetch('/chat/outcomes/')
    if (!res || !res.ok) return null
    return res.json()
  },

  async getSessions() {
    const res = await authFetch('/chat/sessions/')
    if (!res || !res.ok) return []
    const data = await res.json()
    return data.results || data
  },
}
