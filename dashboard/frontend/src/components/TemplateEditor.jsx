import { useState, useEffect } from 'react'
import { api } from '../api'

export default function TemplateEditor() {
  const [form, setForm] = useState({ HEART_RATE_ANOMALY: '', FLAME_DETECTED: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.templates.get().then(setForm).catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await api.templates.set(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>报警通知模板</h2>
        <small style={{ color: 'var(--text-secondary)' }}>
          可用变量：<code>{'{severity}'}</code> <code>{'{device_id}'}</code>{' '}
          <code>{'{bpm}'}</code> <code>{'{type}'}</code>
        </small>
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

        <label className="field">
          <span>心率异常 <code style={{ fontWeight: 400 }}>HEART_RATE_ANOMALY</code></span>
          <textarea
            className="input"
            rows={3}
            value={form.HEART_RATE_ANOMALY}
            onChange={e => set('HEART_RATE_ANOMALY', e.target.value)}
            style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
          />
        </label>

        <label className="field">
          <span>火焰检测 <code style={{ fontWeight: 400 }}>FLAME_DETECTED</code></span>
          <textarea
            className="input"
            rows={3}
            value={form.FLAME_DETECTED}
            onChange={e => set('FLAME_DETECTED', e.target.value)}
            style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
          />
        </label>

        {error && <div className="error-msg">{error}</div>}
        {saved && <div className="success-msg">✓ 模板已保存（当前存储在本地，Lambda 使用独立模板）</div>}

        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? '保存中…' : '保存模板'}
        </button>
      </div>
    </div>
  )
}
