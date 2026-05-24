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
        <h2>Notification Templates</h2>
        <small style={{ color: 'var(--text-secondary)' }}>
          Available variables: <code>{'{severity}'}</code> <code>{'{device_id}'}</code>{' '}
          <code>{'{bpm}'}</code> <code>{'{type}'}</code>
        </small>
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

        <label className="field">
          <span>Heart Rate Anomaly <code style={{ fontWeight: 400 }}>HEART_RATE_ANOMALY</code></span>
          <textarea
            className="input"
            rows={3}
            value={form.HEART_RATE_ANOMALY}
            onChange={e => set('HEART_RATE_ANOMALY', e.target.value)}
            style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
          />
        </label>

        <label className="field">
          <span>Flame Detected <code style={{ fontWeight: 400 }}>FLAME_DETECTED</code></span>
          <textarea
            className="input"
            rows={3}
            value={form.FLAME_DETECTED}
            onChange={e => set('FLAME_DETECTED', e.target.value)}
            style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
          />
        </label>

        {error && <div className="error-msg">{error}</div>}
        {saved && <div className="success-msg">✓ Saved — stored locally, Lambda uses its own templates</div>}

        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Templates'}
        </button>
      </div>
    </div>
  )
}
