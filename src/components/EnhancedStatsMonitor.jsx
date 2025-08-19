import { useEffect, useRef, useState, useCallback } from 'react'
import { useSetAtom, useAtomValue } from 'jotai'
import { updateFpsAtom, updateMemoryAtom, fpsAtom, memoryAtom, performanceStatsAtom } from '../atoms/performanceAtoms'
import { connectionStatusAtom } from '../atoms/orderBookAtoms'
import Stats from 'stats.js'
import './EnhancedStatsMonitor.css'

function EnhancedStatsMonitor({ enabled = false, showOverlay = false }) {
  const statsRef = useRef(null)
  const animationIdRef = useRef(null)
  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(performance.now())
  
  const [renderStats, setRenderStats] = useState({
    totalRenders: 0,
    avgRenderTime: 0,
    lastRenderTime: 0,
    renderHistory: []
  })
  
  const updateFps = useSetAtom(updateFpsAtom)
  const updateMemory = useSetAtom(updateMemoryAtom)
  const fps = useAtomValue(fpsAtom)
  const memory = useAtomValue(memoryAtom)
  const perfStats = useAtomValue(performanceStatsAtom)
  const connectionStatus = useAtomValue(connectionStatusAtom)

  // Track component renders
  const trackRender = useCallback(() => {
    const renderTime = performance.now()
    setRenderStats(prev => {
      const newHistory = [...prev.renderHistory, renderTime].slice(-100)
      const avgTime = newHistory.length > 1 
        ? newHistory.reduce((sum, time, idx) => {
            if (idx === 0) return 0
            return sum + (time - newHistory[idx - 1])
          }, 0) / (newHistory.length - 1)
        : 0
      
      return {
        totalRenders: prev.totalRenders + 1,
        avgRenderTime: avgTime,
        lastRenderTime: renderTime,
        renderHistory: newHistory
      }
    })
  }, [])

  // Enhanced animation loop with detailed metrics
  const animate = useCallback(() => {
    if (!statsRef.current) return

    const now = performance.now()
    frameCountRef.current++

    // Update stats.js
    statsRef.current.begin()
    
    // Calculate FPS manually for more accuracy
    const deltaTime = now - lastTimeRef.current
    if (deltaTime >= 1000) { // Update every second
      const fps = (frameCountRef.current * 1000) / deltaTime
      updateFps(Math.round(fps))
      
      // Update memory info
      if (performance.memory) {
        updateMemory(performance.memory)
      }
      
      frameCountRef.current = 0
      lastTimeRef.current = now
    }
    
    statsRef.current.end()
    animationIdRef.current = requestAnimationFrame(animate)
  }, [updateFps, updateMemory])

  useEffect(() => {
    trackRender()
  })

  useEffect(() => {
    if (!enabled) {
      // Clean up existing stats
      if (statsRef.current) {
        if (animationIdRef.current) {
          cancelAnimationFrame(animationIdRef.current)
          animationIdRef.current = null
        }
        if (statsRef.current.dom && statsRef.current.dom.parentNode) {
          statsRef.current.dom.parentNode.removeChild(statsRef.current.dom)
        }
        statsRef.current = null
      }
      return
    }

    // Create enhanced stats instance
    const stats = new Stats()
    statsRef.current = stats

    // Configure stats panels (0: fps, 1: ms, 2: mb)
    stats.showPanel(0)

    // Enhanced styling
    stats.dom.style.position = 'fixed'
    stats.dom.style.top = showOverlay ? '60px' : '0px'
    stats.dom.style.left = '0px'
    stats.dom.style.zIndex = '10000'
    stats.dom.style.cursor = 'pointer'
    stats.dom.style.borderRadius = '4px'
    stats.dom.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)'

    // Add click handler to cycle through panels
    let panelIndex = 0
    const panels = ['FPS', 'MS', 'MB']
    stats.dom.addEventListener('click', () => {
      panelIndex = (panelIndex + 1) % 3
      stats.showPanel(panelIndex)
      console.log(`📊 Stats Panel: ${panels[panelIndex]}`)
    })

    // Add to document
    document.body.appendChild(stats.dom)

    // Start animation loop
    lastTimeRef.current = performance.now()
    frameCountRef.current = 0
    animationIdRef.current = requestAnimationFrame(animate)

    // Cleanup
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
        animationIdRef.current = null
      }
      if (statsRef.current && statsRef.current.dom && statsRef.current.dom.parentNode) {
        statsRef.current.dom.parentNode.removeChild(statsRef.current.dom)
      }
      statsRef.current = null
    }
  }, [enabled, showOverlay, animate])

  // Enhanced overlay with detailed metrics
  if (!enabled || !showOverlay) return null

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatUptime = (ms) => {
    const seconds = Math.floor(ms / 1000) % 60
    const minutes = Math.floor(ms / 60000) % 60
    const hours = Math.floor(ms / 3600000)
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="enhanced-stats-overlay">
      <div className="stats-header">
        <h3>🔥 Enhanced Performance Monitor</h3>
        <div className="uptime">⏱️ {formatUptime(perfStats.uptime)}</div>
      </div>
      
      <div className="stats-grid">
        {/* Real-time Performance */}
        <div className="stats-panel performance">
          <h4>⚡ Real-time</h4>
          <div className="metric">
            <span>FPS:</span>
            <span className={fps.current < 30 ? 'warning' : fps.current < 55 ? 'caution' : 'good'}>
              {fps.current}
            </span>
          </div>
          <div className="metric">
            <span>Avg FPS:</span>
            <span>{fps.average.toFixed(1)}</span>
          </div>
          <div className="metric">
            <span>Min/Max:</span>
            <span>{fps.min === Infinity ? 0 : fps.min}/{fps.max}</span>
          </div>
        </div>

        {/* Memory Usage */}
        <div className="stats-panel memory">
          <h4>🧠 Memory</h4>
          <div className="metric">
            <span>Used:</span>
            <span className={memory.percentUsed > 75 ? 'warning' : memory.percentUsed > 50 ? 'caution' : 'good'}>
              {memory.percentUsed.toFixed(1)}%
            </span>
          </div>
          <div className="metric">
            <span>Heap:</span>
            <span>{formatBytes(memory.heapUsed)}</span>
          </div>
          <div className="metric">
            <span>Limit:</span>
            <span>{formatBytes(memory.heapLimit)}</span>
          </div>
        </div>

        {/* WebSocket Stats */}
        <div className="stats-panel websocket">
          <h4>🌐 WebSocket</h4>
          <div className="metric">
            <span>Status:</span>
            <span className={connectionStatus.isConnected ? 'good' : 'warning'}>
              {connectionStatus.isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="metric">
            <span>Messages:</span>
            <span>{connectionStatus.messageCount.toLocaleString()}</span>
          </div>
          <div className="metric">
            <span>Rate:</span>
            <span>
              {connectionStatus.messageCount > 0 && perfStats.uptime > 0 
                ? ((connectionStatus.messageCount / (perfStats.uptime / 1000)).toFixed(1) + '/s')
                : '0/s'
              }
            </span>
          </div>
        </div>

        {/* React Render Stats */}
        <div className="stats-panel react">
          <h4>⚛️ React</h4>
          <div className="metric">
            <span>Renders:</span>
            <span>{renderStats.totalRenders.toLocaleString()}</span>
          </div>
          <div className="metric">
            <span>Avg Time:</span>
            <span>{renderStats.avgRenderTime.toFixed(2)}ms</span>
          </div>
          <div className="metric">
            <span>Total Frames:</span>
            <span>{perfStats.totalFrames.toLocaleString()}</span>
          </div>
        </div>

        {/* System Info */}
        <div className="stats-panel system">
          <h4>💻 System</h4>
          <div className="metric">
            <span>Cores:</span>
            <span>{navigator.hardwareConcurrency || 'Unknown'}</span>
          </div>
          <div className="metric">
            <span>Platform:</span>
            <span>{navigator.platform}</span>
          </div>
          <div className="metric">
            <span>Browser:</span>
            <span>
              {navigator.userAgent.includes('Chrome') ? 'Chrome' :
               navigator.userAgent.includes('Firefox') ? 'Firefox' :
               navigator.userAgent.includes('Safari') ? 'Safari' : 'Other'}
            </span>
          </div>
        </div>

        {/* Peak Performance */}
        <div className="stats-panel peaks">
          <h4>📈 Peaks</h4>
          <div className="metric">
            <span>Peak Memory:</span>
            <span>{formatBytes(perfStats.peakMemory)}</span>
          </div>
          <div className="metric">
            <span>Peak FPS:</span>
            <span>{fps.max}</span>
          </div>
          <div className="metric">
            <span>Efficiency:</span>
            <span className={fps.average > 50 ? 'good' : fps.average > 30 ? 'caution' : 'warning'}>
              {fps.average > 0 ? ((fps.average / 60) * 100).toFixed(0) + '%' : '0%'}
            </span>
          </div>
        </div>
      </div>

      {/* Performance Tips */}
      <div className="performance-tips">
        <h4>💡 Tips</h4>
        <div className="tips-list">
          {fps.current < 30 && <div className="tip warning">⚠️ Low FPS detected - consider reducing render complexity</div>}
          {memory.percentUsed > 75 && <div className="tip warning">⚠️ High memory usage - check for memory leaks</div>}
          {connectionStatus.messageCount > 1000 && <div className="tip info">ℹ️ High message throughput - WebSocket performing well</div>}
          {renderStats.avgRenderTime > 16 && <div className="tip caution">⚠️ Slow renders detected - optimize component updates</div>}
        </div>
      </div>
    </div>
  )
}

export default EnhancedStatsMonitor