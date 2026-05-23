import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'

const SEV_COLOR = { 1: '#38a169', 2: '#d69e2e', 3: '#e53e3e' }
const SEV_LABEL = { 1: '低', 2: '中', 3: '严重' }

function fmtTime(ms) {
  return new Date(Number(ms)).toLocaleString('zh-CN', { hour12: false })
}

function fmtType(t) {
  if (t === 'HEART_RATE_ANOMALY') return '心率异常'
  if (t === 'FLAME_DETECTED') return '火焰检测'
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
        <h2>告警日志</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="input"
            style={{ width: 140 }}
            placeholder="设备 ID 筛选"
            value={deviceFilter}
            onChange={e => setDeviceFilter(e.target.value)}
          />
          <select className="input" style={{ width: 120 }} value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}>
            <option value="">全部类型</option>
            <option value="HEART_RATE_ANOMALY">心率异常</option>
            <option value="FLAME_DETECTED">火焰检测</option>
          </select>
          <button className="btn" onClick={load} disabled={loading}>
            {loading ? '加载中…' : '刷新'}
          </button>
        </div>
      </div>

      {error && <div className="error-msg" style={{ margin: 12 }}>{error}</div>}

      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>时间</th>
              <th>设备 ID</th>
              <th>类型</th>
              <th>严重度</th>
              <th>心率 (BPM)</th>
            </tr>
          </thead>
          <tbody>
            {!loading && alerts.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 40 }}>
                  暂无告警记录
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
        共 {alerts.length} 条记录
      </div>
    </div>
  )
}
