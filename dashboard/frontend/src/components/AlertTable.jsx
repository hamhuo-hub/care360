import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'

const SEV_COLOR = { 1: '#38a169', 2: '#d69e2e', 3: '#e53e3e' }
const SEV_LABEL = { 1: 'Low', 2: 'Medium', 3: 'Critical' }

function fmtTime(ms) {
  return new Date(Number(ms)).toLocaleString('en-AU', { hour12: false })
}

function fmtType(t) {
  if (t === 'HEART_RATE_ANOMALY') return 'Heart Rate Anomaly'
  if (t === 'FLAME_DETECTED') return 'Flame Detected'
  return t
}

export default function AlertTable() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [deviceFilter, setDeviceFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.alerts.list({
        device_id: deviceFilter || undefined,
        alert_type: typeFilter || undefined,
        limit: 100,
      })
      setAlerts(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [deviceFilter, typeFilter])

  useEffect(() => { load() }, [load])

  return (
    <div className="card" style={{ flex: 2, minWidth: 0 }}>
      <div className="card-header">
        <h2>Alert Log</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="input"
            style={{ width: 140 }}
            placeholder="Filter by Device ID"
            value={deviceFilter}
            onChange={e => setDeviceFilter(e.target.value)}
          />
          <select className="input" style={{ width: 160 }} value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            <option value="HEART_RATE_ANOMALY">Heart Rate Anomaly</option>
            <option value="FLAME_DETECTED">Flame Detected</option>
          </select>
          <button className="btn" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <div className="error-msg" style={{ margin: 12 }}>{error}</div>}

      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Device ID</th>
              <th>Type</th>
              <th>Severity</th>
              <th>Heart Rate (BPM)</th>
            </tr>
          </thead>
          <tbody>
            {!loading && alerts.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 40 }}>
                  No alert records found
                </td>
              </tr>
            )}
            {alerts.map((a, i) => (
              <tr key={i}>
                <td style={{ whiteSpace: 'nowrap' }}>{fmtTime(a.timestamp)}</td>
                <td><code>{a.device_id}</code></td>
                <td>{fmtType(a.type)}</td>
                <td>
                  <span className="badge"
                    style={{ background: SEV_COLOR[a.severity] || '#718096' }}>
                    {SEV_LABEL[a.severity] || a.severity || '—'}
                  </span>
                </td>
                <td>{a.bpm != null ? Number(a.bpm).toFixed(1) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ padding: '8px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
        {alerts.length} record{alerts.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
