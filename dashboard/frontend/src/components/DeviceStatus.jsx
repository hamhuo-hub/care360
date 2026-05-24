import { useState, useEffect } from 'react'
import { api } from '../api'

function fmtAgo(secs) {
  if (secs < 60)   return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  return `${Math.floor(secs / 3600)}h ago`
}

function DeviceCard({ icon, title, info }) {
  const isActive = info?.status === 'ACTIVE'
  const hasInfo  = info != null

  return (
    <div className={`device-card ${hasInfo && isActive ? 'ok' : 'warn'}`}>
      <div className="device-icon">{icon}</div>
      <div style={{ fontWeight: 600, fontSize: 15 }}>{title}</div>
      <div style={{ margin: '4px 0' }}>
        {hasInfo ? (
          <span className="badge"
            style={{ background: isActive ? '#38a169' : '#718096' }}>
            {info.status}
          </span>
        ) : (
          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Loading…</span>
        )}
      </div>
      {info?.device_id && (
        <code style={{ fontSize: 11 }}>{info.device_id}</code>
      )}
      {info?.last_seen_seconds_ago != null && (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Last seen: {fmtAgo(info.last_seen_seconds_ago)}
        </div>
      )}
      {info?.note && (
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, maxWidth: 200 }}>
          {info.note}
        </div>
      )}
      {info?.error && (
        <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{info.error}</div>
      )}
    </div>
  )
}

const POLL_INTERVAL = 30_000

export default function DeviceStatus() {
  const [devices, setDevices] = useState(null)
  const [loading, setLoading] = useState(false)
  const [lastPolled, setLastPolled] = useState(null)
  const [countdown, setCountdown] = useState(POLL_INTERVAL / 1000)

  const load = async () => {
    setLoading(true)
    try {
      setDevices(await api.status.devices())
      setLastPolled(new Date())
      setCountdown(POLL_INTERVAL / 1000)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const poll = setInterval(load, POLL_INTERVAL)
    return () => clearInterval(poll)
  }, [])

  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown(c => (c > 0 ? c - 1 : 0))
    }, 1000)
    return () => clearInterval(tick)
  }, [])

  return (
    <div className="card">
      <div className="card-header">
        <h2>Device Status</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {lastPolled
              ? `Last checked ${lastPolled.toLocaleTimeString('en-AU', { hour12: false })} · refresh in ${countdown}s`
              : 'Checking…'}
          </span>
          <button className="btn" onClick={load} disabled={loading}>
            {loading ? 'Checking…' : 'Refresh Now'}
          </button>
        </div>
      </div>
      <div className="device-grid">
        <DeviceCard icon="🖥️" title="Raspberry Pi 3B"        info={devices?.pi} />
        <DeviceCard icon="⌚" title="Samsung Galaxy Watch 4" info={devices?.watch} />
      </div>
    </div>
  )
}
