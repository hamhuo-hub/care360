async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

export const api = {
  alerts: {
    list: (params = {}) => {
      const q = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v != null && v !== '')
      )
      return request(`/alerts?${q}`)
    },
  },
  thresholds: {
    get: () => request('/thresholds'),
    set: (body) => request('/thresholds', { method: 'PUT', body: JSON.stringify(body) }),
    shadow: () => request('/thresholds/shadow'),
  },
  templates: {
    get: () => request('/templates'),
    set: (body) => request('/templates', { method: 'PUT', body: JSON.stringify(body) }),
  },
  status: {
    aws: () => request('/status/aws'),
    devices: () => request('/status/devices'),
  },
}
