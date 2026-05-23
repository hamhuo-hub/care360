import { useState, useEffect } from 'react'
import { api } from '../api'

const OK_SET = new Set(['OK', 'ACTIVE', 'Active'])

function StatusCard({ name, label, info }) {
  if (!info) {
    return (
      <div className="status-card" style={{ color: 'var(--text-secondary)' }}>
        <div className="status-icon">⏳</div>
        <div className="status-name">{label}</div>
        <div className="status-detail">加载中…</div>
      </div>
    )
  }

  const ok = OK_SET.has(info.status)
  const err = info.status === 'ERROR'

  return (
    <div className={`status-card ${ok ? 'ok' : err ? 'err' : 'warn'}`}>
      <div className="status-icon">{ok ? '✅' : err ? '❌' : '⚠️'}</div>
      <div className="status-name">{label}</div>
      <div className="status-detail">
        <strong>{info.status}</strong>
        {info.item_count != null && <><br />{info.item_count.toLocaleString()} 条记录</>}
        {info.last_modified && (
          <><br />{new Date(info.last_modified).toLocaleDateString('zh-CN')}</>
        )}
        {info.topic_arn && (
          <><br /><span style={{ fontSize: 10, wordBreak: 'break-all' }}>
            {info.topic_arn.split(':').pop()}
          </span></>
        )}
        {info.sql && (
          <><br /><code style={{ fontSize: 10, background: 'transparent' }}>{info.sql}</code></>
        )}
        {info.error && (
          <><br /><span style={{ color: 'var(--danger)', fontSize: 11 }}>
            {info.error}
          </span></>
        )}
      </div>
    </div>
  )
}

const CARDS = [
  { key: 'iot_core', label: 'IoT Core' },
  { key: 'lambda',   label: 'Lambda' },
  { key: 'dynamodb', label: 'DynamoDB' },
  { key: 'sns',      label: 'SNS' },
]

export default function AwsStatusGrid() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setStatus(await api.status.aws())
    } catch {
      // individual card errors are shown inside each card
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="card">
      <div className="card-header">
        <h2>AWS 组件状态</h2>
        <button className="btn" onClick={load} disabled={loading}>
          {loading ? '检查中…' : '刷新'}
        </button>
      </div>
      <div className="status-grid">
        {CARDS.map(({ key, label }) => (
          <StatusCard key={key} name={key} label={label} info={status?.[key]} />
        ))}
      </div>
    </div>
  )
}
