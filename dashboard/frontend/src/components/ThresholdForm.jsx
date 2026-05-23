import { useState, useEffect } from 'react'
import { api } from '../api'

export default function ThresholdForm() {
  const [form, setForm] = useState({
    hr_low_bpm: 45,
    hr_high_bpm: 120,
    hr_anomaly_consecutive: 3,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.thresholds.get().then(setForm).catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: Number(v) }))

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await api.thresholds.set(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card" style={{ flex: 1, minWidth: 220 }}>
      <div className="card-header"><h2>报警阈值</h2></div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

        <label className="field">
          <span>心率下限 (BPM)</span>
          <input className="input" type="number" min={20} max={80}
            value={form.hr_low_bpm}
            onChange={e => set('hr_low_bpm', e.target.value)} />
        </label>

        <label className="field">
          <span>心率上限 (BPM)</span>
          <input className="input" type="number" min={80} max={220}
            value={form.hr_high_bpm}
            onChange={e => set('hr_high_bpm', e.target.value)} />
        </label>

        <label className="field">
          <span>连续触发次数</span>
          <input className="input" type="number" min={1} max={10}
            value={form.hr_anomaly_consecutive}
            onChange={e => set('hr_anomaly_consecutive', e.target.value)} />
          <small style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>
            连续 N 条超阈值才触发报警（防误报）
          </small>
        </label>

        {error && <div className="error-msg">{error}</div>}
        {saved && (
          <div className="success-msg">
            ✓ 已保存（重启 Pi 或更新环境变量后生效）
          </div>
        )}

        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? '保存中…' : '保存阈值'}
        </button>
      </div>
    </div>
  )
}
