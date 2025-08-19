import { useAtomValue } from 'jotai'
import { 
  fpsAtom, 
  memoryAtom, 
  performanceStatsAtom, 
  memoryLeakStatusAtom 
} from '../atoms/performanceAtoms'
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor'
import './PerformanceMonitor.css'

function PerformanceMonitor({ isVisible = true }) {
  usePerformanceMonitor()
  
  const fps = useAtomValue(fpsAtom)
  const memory = useAtomValue(memoryAtom)
  const stats = useAtomValue(performanceStatsAtom)
  const leakStatus = useAtomValue(memoryLeakStatusAtom)

  if (!isVisible) return null

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatUptime = (ms) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  const getFpsColor = (fps) => {
    if (fps >= 55) return '#10b981' // Green
    if (fps >= 30) return '#f59e0b' // Yellow
    return '#ef4444' // Red
  }

  const getMemoryColor = (percent) => {
    if (percent < 50) return '#10b981' // Green
    if (percent < 75) return '#f59e0b' // Yellow
    return '#ef4444' // Red
  }

  return (
    <div className="performance-monitor">
      <div className="performance-header">
        <h3>Performance Monitor</h3>
        <div className="uptime">Uptime: {formatUptime(stats.uptime)}</div>
      </div>

      <div className="performance-grid">
        {/* FPS Panel */}
        <div className="performance-panel fps-panel">
          <div className="panel-header">
            <span className="panel-title">FPS</span>
            <span 
              className="panel-value" 
              style={{ color: getFpsColor(fps.current) }}
            >
              {fps.current}
            </span>
          </div>
          <div className="panel-stats">
            <div className="stat-row">
              <span>Average:</span>
              <span>{fps.average.toFixed(1)}</span>
            </div>
            <div className="stat-row">
              <span>Min/Max:</span>
              <span>{fps.min === Infinity ? 0 : fps.min} / {fps.max}</span>
            </div>
          </div>
          <div className="chart">
            <div className="chart-title">FPS History (5min)</div>
            <div className="fps-chart">
              {fps.history.slice(-60).map((value, index) => (
                <div 
                  key={index}
                  className="chart-bar"
                  style={{
                    height: `${Math.max((value / 60) * 100, 2)}%`,
                    backgroundColor: getFpsColor(value)
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Memory Panel */}
        <div className="performance-panel memory-panel">
          <div className="panel-header">
            <span className="panel-title">Memory</span>
            <span 
              className="panel-value"
              style={{ color: getMemoryColor(memory.percentUsed) }}
            >
              {memory.percentUsed.toFixed(1)}%
            </span>
          </div>
          <div className="panel-stats">
            <div className="stat-row">
              <span>Used:</span>
              <span>{formatBytes(memory.heapUsed)}</span>
            </div>
            <div className="stat-row">
              <span>Total:</span>
              <span>{formatBytes(memory.heapTotal)}</span>
            </div>
            <div className="stat-row">
              <span>Limit:</span>
              <span>{formatBytes(memory.heapLimit)}</span>
            </div>
          </div>
          <div className="chart">
            <div className="chart-title">Memory Usage (5min)</div>
            <div className="memory-chart">
              {memory.history.slice(-60).map((value, index) => (
                <div 
                  key={index}
                  className="chart-bar"
                  style={{
                    height: `${Math.max(value, 2)}%`,
                    backgroundColor: getMemoryColor(value)
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Memory Leak Detection Panel */}
        <div className="performance-panel leak-panel">
          <div className="panel-header">
            <span className="panel-title">Memory Leak Detection</span>
            <span 
              className={`leak-status ${leakStatus.suspected ? 'warning' : 'ok'}`}
            >
              {leakStatus.suspected ? '⚠️ Suspected' : '✅ OK'}
            </span>
          </div>
          <div className="panel-stats">
            <div className="stat-row">
              <span>Current Usage:</span>
              <span>{leakStatus.currentUsage}%</span>
            </div>
            <div className="stat-row">
              <span>Peak Usage:</span>
              <span>{leakStatus.peakUsage}%</span>
            </div>
            <div className="stat-row">
              <span>Memory Trend:</span>
              <span 
                style={{ 
                  color: parseFloat(leakStatus.memoryIncrease) > 5 ? '#ef4444' : '#10b981' 
                }}
              >
                {leakStatus.memoryIncrease > 0 ? '+' : ''}{leakStatus.memoryIncrease}%
              </span>
            </div>
          </div>
        </div>

        {/* Statistics Panel */}
        <div className="performance-panel stats-panel">
          <div className="panel-header">
            <span className="panel-title">Statistics</span>
          </div>
          <div className="panel-stats">
            <div className="stat-row">
              <span>Total Frames:</span>
              <span>{stats.totalFrames.toLocaleString()}</span>
            </div>
            <div className="stat-row">
              <span>Peak Memory:</span>
              <span>{formatBytes(stats.peakMemory)}</span>
            </div>
            <div className="stat-row">
              <span>Browser:</span>
              <span>{navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Other'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PerformanceMonitor