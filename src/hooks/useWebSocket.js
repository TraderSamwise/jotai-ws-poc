import { useCallback, useEffect, useRef, useState } from 'react'

export function useWebSocket(url, options = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState(null)
  const [messageCount, setMessageCount] = useState(0)
  const wsRef = useRef(null)
  const onMessageRef = useRef(options.onMessage)
  const subscribedTopicsRef = useRef(new Set())

  // Update the callback ref when it changes
  useEffect(() => {
    onMessageRef.current = options.onMessage
  }, [options.onMessage])

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
    }

    setError(null)
    setIsConnected(false)
    setMessageCount(0)
    subscribedTopicsRef.current.clear()

    try {
      wsRef.current = new WebSocket(url)

      wsRef.current.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
      }

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setMessageCount(prev => prev + 1)
          
          if (onMessageRef.current) {
            onMessageRef.current(data)
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      }

      wsRef.current.onerror = (err) => {
        console.error('WebSocket error:', err)
        setError('WebSocket connection error')
      }

      wsRef.current.onclose = (event) => {
        setIsConnected(false)
        console.log(`WebSocket closed (Code: ${event.code})`)
        if (event.code !== 1000) {
          setError(`Connection closed unexpectedly (Code: ${event.code})`)
        }
      }
    } catch (err) {
      setError(`Failed to connect: ${err.message}`)
      console.error('Connection failed:', err)
    }
  }, [url])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User requested disconnect')
    }
    setIsConnected(false)
  }, [])

  const send = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
      return true
    }
    return false
  }, [])

  const subscribe = useCallback((feeds, { dedupe = true } = {}) => {
    const toSubscribe = []
    for (const feed of feeds) {
      if (!dedupe || !subscribedTopicsRef.current.has(feed)) {
        toSubscribe.push(feed)
      }
    }
    if (toSubscribe.length === 0) return true
    const ok = send({ op: 'subscribe', args: toSubscribe })
    if (ok) {
      toSubscribe.forEach((f) => subscribedTopicsRef.current.add(f))
    }
    return ok
  }, [send])

  const unsubscribe = useCallback((feeds) => {
    const toUnsub = []
    for (const feed of feeds) {
      if (subscribedTopicsRef.current.has(feed)) {
        toUnsub.push(feed)
      }
    }
    if (toUnsub.length === 0) return true
    const ok = send({ op: 'unsubscribe', args: toUnsub })
    if (ok) {
      toUnsub.forEach((f) => subscribedTopicsRef.current.delete(f))
    }
    return ok
  }, [send])

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  return {
    isConnected,
    error,
    messageCount,
    connect,
    disconnect,
    send,
  subscribe,
  unsubscribe
  }
}