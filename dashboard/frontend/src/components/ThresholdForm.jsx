import { useState, useEffect } from 'react'
import { api } from '../api'

const DEFAULTS = {
  hr_low_bpm:              45,
  hr_high_bpm:             120,
  hr_anomaly_consecutive:  3,
  temp_low_c:              10,
  temp_high_c:             37,
  humidity_low_pct:        20,
  humidity_high_pct:       80,
  pressure_low_hpa:        980,
  pressure_high_hpa:       1040,
  env_anomaly_consecutive: 3,
}

function SyncBadge({ desired, reported }) {
  if (!reported) return null
  const synced = Object.keys(desired).every(k => desired[k] === reported[k])
  return (
    <span style={{
      fontSize: 11, padding: '2px 7px', borderRadius: 10, fontWeight: 600,
      background: synced ? '#c6f6d5' : '#fefcbf',
      color: synced ? '#276749' : '#744210',
    }}>
      {synced ? '✓ Pi synced' : '⏳ Pending Pi apply'}
    </span>
  )
}

function FieldGroup({ title, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
                    textTransform: 'uppercase', color: 'var(--text-secondary)',
                    borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

export default function ThresholdForm() {
  const [form, setForm]       = useState(DEFAULTS)
  const [reported, setReported] = useState(null)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState(null)

  const loadShadow = async () => {
    try {
      const shadow = await api.thresholds.shadow()
      const state = shadow?.state ?? {}
      if (state.desired)  setForm(f => ({ ...f, ...state.desired }))
      if (state.reported) setReported(state.reported)
    } catch {
      api.thresholds.get().then(d => setForm(f => ({ ...f, ...d }))).catch(() => {})
    }
  }

  useEffect(() => { loadShadow() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: Number(v) }))

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await api.thresholds.set(form)
      setSaved(true)
      setReported(null)
      setTimeout(() => { setSaved(false); loadShadow() }, 3000)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const inp = (k, opts = {}) => (
    <input className="input" type="number" value={form[k]}
      onChange={e => set(k, e.target.value)} {...opts} />
  )

  return (
    <div className="card" style={{ flex: 1, minWidth: 220 }}>
      <div className="card-header">
        <h2>Alert Thresholds</h2>
        <SyncBadge desired={form} reported={reported} />
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>

        <FieldGroup title="Heart Rate">
          <label className="field">
            <span>Low (BPM)</span>
            {inp('hr_low_bpm', { min: 20, max: 80 })}
          </label>
          <label className="field">
            <span>High (BPM)</span>
            {inp('hr_high_bpm', { min: 80, max: 220 })}
          </label>
          <label className="field">
            <span>Consecutive readings to trigger</span>
            {inp('hr_anomaly_consecutive', { min: 1, max: 10 })}
          </label>
        </FieldGroup>

        <FieldGroup title="Temperature (°C)">
          <label className="field">
            <span>Low (°C)</span>
            {inp('temp_low_c', { min: -20, max: 30, step: 0.5 })}
          </label>
          <label className="field">
            <span>High (°C)</span>
            {inp('temp_high_c', { min: 30, max: 50, step: 0.5 })}
          </label>
        </FieldGroup>

        <FieldGroup title="Humidity (%)">
          <label className="field">
            <span>Low (%)</span>
            {inp('humidity_low_pct', { min: 0, max: 50, step: 1 })}
          </label>
          <label className="field">
            <span>High (%)</span>
            {inp('humidity_high_pct', { min: 50, max: 100, step: 1 })}
          </label>
        </FieldGroup>

        <FieldGroup title="Air Pressure (hPa)">
          <label className="field">
            <span>Low (hPa)</span>
            {inp('pressure_low_hpa', { min: 900, max: 1013, step: 1 })}
          </label>
          <label className="field">
            <span>High (hPa)</span>
            {inp('pressure_high_hpa', { min: 1013, max: 1100, step: 1 })}
          </label>
        </FieldGroup>

        <FieldGroup title="Environment Debounce">
          <label className="field">
            <span>Consecutive readings to trigger (temp / humidity / pressure)</span>
            {inp('env_anomaly_consecutive', { min: 1, max: 10 })}
          </label>
        </FieldGroup>

        {reported && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)',
                        background: 'var(--bg)', padding: '8px 10px', borderRadius: 5,
                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px' }}>
            <strong style={{ gridColumn: '1/-1' }}>Pi reported:</strong>
            <span>HR {reported.hr_low_bpm}–{reported.hr_high_bpm} BPM</span>
            <span>HR streak ×{reported.hr_anomaly_consecutive}</span>
            <span>Temp {reported.temp_low_c}–{reported.temp_high_c}°C</span>
            <span>Humidity {reported.humidity_low_pct}–{reported.humidity_high_pct}%</span>
            <span>Pressure {reported.pressure_low_hpa}–{reported.pressure_high_hpa} hPa</span>
            <span>ENV streak ×{reported.env_anomaly_consecutive}</span>
          </div>
        )}

        {error && <div className="error-msg">{error}</div>}
        {saved && <div className="success-msg">✓ Sent to Device Shadow — Pi will apply on next heartbeat</div>}

        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Thresholds'}
        </button>
      </div>
    </div>
  )
}
