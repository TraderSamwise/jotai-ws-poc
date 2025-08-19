import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { 
  bidsAtom, 
  asksAtom, 
  spreadAtom, 
  selectedSymbolAtom,
  connectionStatusAtom,
  orderBookOperationsAtom
} from '../atoms/orderBookAtoms'
import { updateWSPerformanceAtom, updateRenderStatsAtom } from '../atoms/performanceAtoms'
import { useWebSocket } from '../hooks/useWebSocket'
import { useEffect, useMemo, useCallback, useRef } from 'react'
import './OrderBook.css'

function OrderBook() {
  const [selectedSymbol, setSelectedSymbol] = useAtom(selectedSymbolAtom)
  const [connectionStatus, setConnectionStatus] = useAtom(connectionStatusAtom)
  const bids = useAtomValue(bidsAtom)
  const asks = useAtomValue(asksAtom)
  const spread = useAtomValue(spreadAtom)
  const setOrderBookOperation = useSetAtom(orderBookOperationsAtom)
  const updateWSPerformance = useSetAtom(updateWSPerformanceAtom)
  const updateRenderStats = useSetAtom(updateRenderStatsAtom)
  const renderStartRef = useRef(performance.now())

  const handleWebSocketMessage = useCallback((data) => {
    const messageTime = performance.now()
    
    if (data.subscribe) {
      console.log('✓ Subscribed to:', data.subscribe)
      return
    }

    if (data.info) {
      console.log('ℹ️ Info:', data.info)
      return
    }

    if (data.error) {
      setConnectionStatus(prev => ({
        ...prev,
        error: `WebSocket Error: ${data.error}`
      }))
      console.error('❌ Error:', data.error)
      return
    }

    if (data.table && data.action && data.data) {
      const processStart = performance.now()
      setOrderBookOperation(data)
      const processingTime = performance.now() - processStart
      
      // Update WebSocket performance metrics
      updateWSPerformance({
        messageCount: connectionStatus.messageCount + 1,
        latency: processingTime
      })
    }
  }, [setConnectionStatus, setOrderBookOperation, updateWSPerformance, connectionStatus.messageCount])

  const { isConnected, error, messageCount, connect, disconnect, subscribe } = useWebSocket(
    'wss://ws.bitmex.com/realtime',
    { onMessage: handleWebSocketMessage }
  )

  useEffect(() => {
    setConnectionStatus({
      isConnected,
      error,
      messageCount
    })
  }, [isConnected, error, messageCount, setConnectionStatus])

  useEffect(() => {
    if (isConnected) {
      subscribe([`orderBookL2_25:${selectedSymbol}`])
    }
  }, [isConnected, selectedSymbol, subscribe])

  // Track render performance
  useEffect(() => {
    const renderTime = performance.now() - renderStartRef.current
    updateRenderStats(renderTime)
    renderStartRef.current = performance.now()
  })

  const handleConnect = useCallback(() => {
    connect()
  }, [connect])

  const handleDisconnect = useCallback(() => {
    disconnect()
  }, [disconnect])

  // Format data
  const formatPrice = (price) => price?.toFixed(1) || '0.0'
  const formatSize = (size) => size?.toLocaleString() || '0'

  const displayBids = useMemo(() => bids.slice(0, 25), [bids])
  const displayAsks = useMemo(() => asks.slice(0, 25), [asks])
  const reversedAsks = useMemo(() => [...displayAsks].reverse(), [displayAsks])

  // Calculate max size for depth visualization
  const maxSize = useMemo(() => {
    const allSizes = [...displayBids, ...displayAsks].map(o => o.size || 0)
    return Math.max(1, ...allSizes)
  }, [displayBids, displayAsks])

  return (
    <div className="orderbook-container">
      {/* Top Navigation */}
      <div className="orderbook-nav">
        <div className="nav-left">
          <div className="orderbook-header">
            <h1>OrderBook</h1>
            <div className="symbol-badge">{selectedSymbol}</div>
          </div>
        </div>
        
        <div className="nav-center">
          <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            <div className="status-dot"></div>
            <span className="status-text">
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
            <span className="message-count">{connectionStatus.messageCount}</span>
          </div>
        </div>
        
        <div className="nav-right">
          <div className="controls">
            <select 
              value={selectedSymbol} 
              onChange={(e) => setSelectedSymbol(e.target.value)}
              disabled={isConnected}
            >
              <option value="XBTUSD">XBTUSD</option>
              <option value="ETHUSD">ETHUSD</option>
            </select>
            
            <button 
              onClick={isConnected ? handleDisconnect : handleConnect}
              className={`connect-button ${isConnected ? 'disconnect' : 'connect'}`}
            >
              {isConnected ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {connectionStatus.error && (
        <div className="error-message">{connectionStatus.error}</div>
      )}

      {/* Main Content */}
      <div className="orderbook-content">

        {/* Order Book */}
        <div className="orderbook">
        {/* Header */}
        <div className="orderbook-header-row">
          <span>Price</span>
          <span>Size</span>
        </div>

        {/* Asks (top - red) */}
        <div className="asks-section">
          {reversedAsks.map((ask, idx) => {
            const depthPct = Math.min(100, ((ask.size || 0) / maxSize) * 100)
            return (
              <div key={`ask-${ask.id}`} className="orderbook-row ask">
                <div className="depth-bar ask" style={{ width: `${depthPct}%` }}></div>
                <span className="price">{formatPrice(ask.price)}</span>
                <span className="size">{formatSize(ask.size)}</span>
              </div>
            )
          })}
        </div>

        {/* Spread Separator */}
        <div className="spread-separator">
          {spread ? `$${spread.spread.toFixed(2)}` : 'Loading...'}
        </div>

        {/* Bids (bottom - green) */}
        <div className="bids-section">
          {displayBids.map((bid, idx) => {
            const depthPct = Math.min(100, ((bid.size || 0) / maxSize) * 100)
            return (
              <div key={`bid-${bid.id}`} className="orderbook-row bid">
                <div className="depth-bar bid" style={{ width: `${depthPct}%` }}></div>
                <span className="price">{formatPrice(bid.price)}</span>
                <span className="size">{formatSize(bid.size)}</span>
              </div>
            )
          })}
        </div>
        </div>
      </div>
      
      {/* Bottom Status Bar */}
      <div className="orderbook-footer">
        {spread && (
          <div className="spread-info">
            <span>Spread: ${spread.spread.toFixed(2)} ({spread.spreadPercent}%)</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default OrderBook