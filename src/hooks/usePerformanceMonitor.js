import { useEffect, useRef } from 'react'
import { useSetAtom } from 'jotai'
import { updateFpsAtom, updateMemoryAtom } from '../atoms/performanceAtoms'

export function usePerformanceMonitor() {
  const updateFps = useSetAtom(updateFpsAtom)
  const updateMemory = useSetAtom(updateMemoryAtom)
  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(performance.now())
  const rafIdRef = useRef()

  useEffect(() => {
    // FPS monitoring using requestAnimationFrame
    const measureFPS = () => {
      const now = performance.now()
      frameCountRef.current++
      
      // Calculate FPS every second
      if (now - lastTimeRef.current >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current))
        updateFps(fps)
        
        frameCountRef.current = 0
        lastTimeRef.current = now
      }
      
      rafIdRef.current = requestAnimationFrame(measureFPS)
    }

    // Memory monitoring
    const measureMemory = () => {
      if ('memory' in performance) {
        updateMemory(performance.memory)
      }
    }

    // Start FPS monitoring
    rafIdRef.current = requestAnimationFrame(measureFPS)

    // Start memory monitoring (every second)
    const memoryInterval = setInterval(measureMemory, 1000)

    // Cleanup
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
      }
      clearInterval(memoryInterval)
    }
  }, [updateFps, updateMemory])

  return null
}