import { useEffect, useRef } from 'react'
import Stats from 'stats.js'

function StatsMonitor({ enabled = false }) {
  const statsRef = useRef(null)
  const animationIdRef = useRef(null)

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

    // Create stats instance
    const stats = new Stats()
    statsRef.current = stats

    // Configure stats panels
    stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom

    // Style the stats widget
    stats.dom.style.position = 'fixed'
    stats.dom.style.top = '0px'
    stats.dom.style.left = '0px'
    stats.dom.style.zIndex = '10000'
    stats.dom.style.cursor = 'pointer'

    // Add click handler to cycle through panels
    stats.dom.addEventListener('click', () => {
      stats.showPanel(++stats.dom.panelId % stats.dom.children.length)
    })

    // Add stats to body
    document.body.appendChild(stats.dom)

    // Animation loop
    function animate() {
      if (statsRef.current) {
        statsRef.current.begin()
        statsRef.current.end()
        animationIdRef.current = requestAnimationFrame(animate)
      }
    }
    
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
  }, [enabled])

  return null // This component doesn't render anything
}

export default StatsMonitor