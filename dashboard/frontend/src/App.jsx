import { useState } from 'react'
import NormalPage from './pages/NormalPage'
import DebugPage from './pages/DebugPage'

export default function App() {
  const [mode, setMode] = useState('normal')

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <span className="logo">Care360</span>
          <span className="subtitle">Community Care Monitoring</span>
        </div>
        <div className="tab-group">
          <button className={`tab ${mode === 'normal' ? 'active' : ''}`}
            onClick={() => setMode('normal')}>
            Dashboard
          </button>
          <button className={`tab ${mode === 'debug' ? 'active' : ''}`}
            onClick={() => setMode('debug')}>
            Debug
          </button>
        </div>
      </header>

      <main className="main">
        {mode === 'normal' ? <NormalPage /> : <DebugPage />}
      </main>
    </div>
  )
}
