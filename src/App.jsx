import { Provider } from 'jotai'
import { useState, useEffect } from 'react'
import OrderBook from './components/OrderBook'
import StatsMonitor from './components/StatsMonitor'
import EnhancedStatsMonitor from './components/EnhancedStatsMonitor'
import './App.css'

function App() {
  const [showStats, setShowStats] = useState(false)
  const [showEnhancedStats, setShowEnhancedStats] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <Provider>
      <div className={`app-container ${mounted ? 'mounted' : ''}`}>
        {/* Animated background */}
        <div className="background-animation">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </div>
        
        {/* Grid pattern overlay */}
        <div className="grid-overlay"></div>
        
        <StatsMonitor enabled={showStats} />
        <EnhancedStatsMonitor enabled={showEnhancedStats} showOverlay={showEnhancedStats} />
        <OrderBook />
        
        {/* Enhanced stats toggles */}
        <div className="stats-controls">
          <button
            onClick={() => setShowStats(!showStats)}
            className={`stats-toggle basic ${showStats ? 'active' : ''}`}
          >
            <span className="stats-icon">📊</span>
            <span className="stats-text">{showStats ? 'Hide' : 'Basic'}</span>
          </button>
          <button
            onClick={() => setShowEnhancedStats(!showEnhancedStats)}
            className={`stats-toggle enhanced ${showEnhancedStats ? 'active' : ''}`}
          >
            <span className="stats-icon">🔥</span>
            <span className="stats-text">{showEnhancedStats ? 'Hide' : 'Enhanced'}</span>
          </button>
        </div>
      </div>
    </Provider>
  )
}

export default App
