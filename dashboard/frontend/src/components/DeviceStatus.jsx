import { useState, useEffect } from 'react'
import { api } from '../api'

function fmtAgo(secs) {
  if (secs < 60)   return `${secs} 秒前`
  if (secs < 3600) return `${Math.floor(secs / 60)} 分钟前`
  return `${Math.floor(secs / 3600)} 小时前`
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
          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>加载中…</span>
        )}
      </div>
      {info?.device_id && (
        <code style={{ fontSize: 11 }}>{info.device_id}</code>
      )}
      {info?.last_seen_seconds_ago != null && (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          最后上报：{fmtAgo(info.last_seen_seconds_ago)}
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

  // 30s 轮询
  useEffect(() => {
    load()
    const poll = setInterval(load, POLL_INTERVAL)
    return () => clearInterval(poll)
  }, [])

  // 倒计时显示（每秒 -1）
  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown(c => (c > 0 ? c - 1 : 0))
    }, 1000)
    return () => clearInterval(tick)
  }, [])

  return (
    <div className="card">
      <div className="card-header">
        <h2>设备活跃状态</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {lastPolled
              ? `上次查询 ${lastPolled.toLocaleTimeString('zh-CN', { hour12: false })} · ${countdown}s 后刷新`
              : '查询中…'}
          </span>
          <button className="btn" onClick={load} disabled={loading}>
            {loading ? '检查中…' : '立即刷新'}
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
