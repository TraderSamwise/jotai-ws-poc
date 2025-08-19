import { atom } from 'jotai'
import { selectAtom } from 'jotai/utils'

// FPS monitoring atom
export const fpsAtom = atom({
  current: 0,
  average: 0,
  min: Infinity,
  max: 0,
  history: []
})

// Memory monitoring atom  
export const memoryAtom = atom({
  heapUsed: 0,
  heapTotal: 0,
  heapLimit: 0,
  percentUsed: 0,
  history: []
})

// Performance statistics atom
export const performanceStatsAtom = atom({
  startTime: Date.now(),
  uptime: 0,
  totalFrames: 0,
  memoryLeakDetected: false,
  peakMemory: 0,
  renderCount: 0,
  avgRenderTime: 0,
  wsMessageRate: 0,
  wsLatency: 0,
  lastWSMessage: 0
})

// Raw memory leak detection atom
const rawMemoryLeakStatusAtom = atom((get) => {
  const memory = get(memoryAtom)
  const stats = get(performanceStatsAtom)
  
  // Simple memory leak detection: if memory consistently grows over time
  if (memory.history.length >= 60) { // Need at least 1 minute of data
    const recent = memory.history.slice(-30) // Last 30 seconds
    const older = memory.history.slice(-60, -30) // Previous 30 seconds
    
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length
    
    // If memory increased by more than 10% and is consistently high
    const increase = ((recentAvg - olderAvg) / olderAvg) * 100
    const isLeak = increase > 10 && recentAvg > stats.peakMemory * 0.8
    
    return {
      suspected: isLeak,
      memoryIncrease: increase.toFixed(2),
      currentUsage: memory.percentUsed.toFixed(1),
      peakUsage: ((stats.peakMemory / memory.heapLimit) * 100).toFixed(1)
    }
  }
  
  return {
    suspected: false,
    memoryIncrease: '0.00',
    currentUsage: memory.percentUsed.toFixed(1),
    peakUsage: '0.0'
  }
})

// Optimized memory leak detection with memoization
export const memoryLeakStatusAtom = selectAtom(rawMemoryLeakStatusAtom, (leak, prev) => {
  if (!prev) return leak
  return leak.suspected === prev.suspected && 
         leak.memoryIncrease === prev.memoryIncrease &&
         leak.currentUsage === prev.currentUsage ? prev : leak
})

// Write-only atoms for updating performance data
export const updateFpsAtom = atom(null, (get, set, fps) => {
  const current = get(fpsAtom)
  const newHistory = [...current.history, fps].slice(-300) // Keep 5 minutes of data
  
  set(fpsAtom, {
    current: fps,
    average: newHistory.reduce((sum, val) => sum + val, 0) / newHistory.length,
    min: Math.min(current.min, fps),
    max: Math.max(current.max, fps),
    history: newHistory
  })
  
  // Update total frames
  const stats = get(performanceStatsAtom)
  set(performanceStatsAtom, {
    ...stats,
    totalFrames: stats.totalFrames + 1,
    uptime: Date.now() - stats.startTime
  })
})

export const updateMemoryAtom = atom(null, (get, set, memoryInfo) => {
  const current = get(memoryAtom)
  const stats = get(performanceStatsAtom)
  
  const percentUsed = (memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize) * 100
  const newHistory = [...current.history, percentUsed].slice(-300) // Keep 5 minutes of data
  
  set(memoryAtom, {
    heapUsed: memoryInfo.usedJSHeapSize,
    heapTotal: memoryInfo.totalJSHeapSize,
    heapLimit: memoryInfo.jsHeapSizeLimit,
    percentUsed,
    history: newHistory
  })
  
  // Update peak memory
  if (memoryInfo.usedJSHeapSize > stats.peakMemory) {
    set(performanceStatsAtom, {
      ...stats,
      peakMemory: memoryInfo.usedJSHeapSize,
      uptime: Date.now() - stats.startTime
    })
  }
})

// WebSocket performance tracking
export const updateWSPerformanceAtom = atom(null, (get, set, { messageCount, latency }) => {
  const stats = get(performanceStatsAtom)
  const now = Date.now()
  const uptime = now - stats.startTime
  const messageRate = uptime > 0 ? (messageCount / (uptime / 1000)) : 0
  
  set(performanceStatsAtom, {
    ...stats,
    wsMessageRate: messageRate,
    wsLatency: latency || stats.wsLatency,
    lastWSMessage: now,
    uptime
  })
})

// Component render tracking
export const updateRenderStatsAtom = atom(null, (get, set, renderTime) => {
  const stats = get(performanceStatsAtom)
  const newRenderCount = stats.renderCount + 1
  const newAvgRenderTime = stats.avgRenderTime === 0 
    ? renderTime 
    : (stats.avgRenderTime * 0.9) + (renderTime * 0.1) // Exponential moving average
  
  set(performanceStatsAtom, {
    ...stats,
    renderCount: newRenderCount,
    avgRenderTime: newAvgRenderTime,
    uptime: Date.now() - stats.startTime
  })
})