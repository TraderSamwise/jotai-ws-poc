import { atom } from 'jotai'
import { selectAtom, atomWithLazy } from 'jotai/utils'

// Lazy atom for expensive orderbook initialization
const orderBookLazyAtom = atomWithLazy(() => new Map())

// Orderbook state atom - stores the full orderbook data
export const orderBookAtom = atom((get) => get(orderBookLazyAtom))

// Connection status atom
export const connectionStatusAtom = atom({
  isConnected: false,
  error: null,
  messageCount: 0
})

// Selected symbol atom
export const selectedSymbolAtom = atom('XBTUSD')

// Orderbook operations atom (write-only)
export const orderBookOperationsAtom = atom(
  null,
  (get, set, operation) => {
    const currentOrderBook = get(orderBookLazyAtom)
    const newOrderBook = new Map(currentOrderBook)

    const { table, action, data } = operation

    if (table !== 'orderBookL2' && table !== 'orderBookL2_25') {
      return
    }

  // BitMEX sends an initial "partial" snapshot we must apply before updates.
    if (action === 'partial') {
      // Determine which symbols are included in this snapshot
      const symbolsInSnapshot = new Set(data.map((r) => r.symbol))

      // Clear any existing entries for these symbols to avoid mixing old state
      for (const [key, order] of newOrderBook.entries()) {
        if (symbolsInSnapshot.has(order.symbol)) {
          newOrderBook.delete(key)
        }
      }

      // Seed with the snapshot rows
      data.forEach((record) => {
    // Use id-only for key; BitMEX updates often omit side/symbol.
    const key = String(record.id)
        newOrderBook.set(key, {
          symbol: record.symbol,
          id: record.id,
          side: record.side,
          size: record.size,
          price: record.price,
        })
      })
    } else {
      // Normal streaming mutations
      data.forEach((record) => {
    const key = String(record.id)

        switch (action) {
          case 'insert':
            newOrderBook.set(key, {
              symbol: record.symbol,
              id: record.id,
              side: record.side,
              size: record.size,
              price: record.price,
            })
            break

          case 'update':
            if (newOrderBook.has(key)) {
              const existing = newOrderBook.get(key)
              newOrderBook.set(key, {
                ...existing,
                ...record, // Merge updated fields (e.g., size)
              })
            }
            break

          case 'delete':
            newOrderBook.delete(key)
            break

          default:
            console.warn('Unknown orderbook action:', action)
        }
      })
    }

    set(orderBookLazyAtom, newOrderBook)
  }
)

// Optimized helper function for deep equality checking
const arrayEquals = (a, b) => {
  if (a.length !== b.length) return false
  return a.every((item, idx) => {
    const other = b[idx]
    return item.id === other.id && 
           item.price === other.price && 
           item.size === other.size
  })
}

// Derived atoms for bids and asks with performance optimization
const rawBidsAtom = atom((get) => {
  const orderBook = get(orderBookAtom)
  const selectedSymbol = get(selectedSymbolAtom)
  
  const bids = []
  for (const [key, order] of orderBook) {
    if (order.symbol === selectedSymbol && order.side === 'Buy') {
      bids.push(order)
    }
  }
  
  // Sort by price descending (highest first)
  return bids.sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
})

export const bidsAtom = selectAtom(rawBidsAtom, (bids, prev) => 
  prev && arrayEquals(bids, prev) ? prev : bids
)

const rawAsksAtom = atom((get) => {
  const orderBook = get(orderBookAtom)
  const selectedSymbol = get(selectedSymbolAtom)
  
  const asks = []
  for (const [key, order] of orderBook) {
    if (order.symbol === selectedSymbol && order.side === 'Sell') {
      asks.push(order)
    }
  }
  
  // Sort by price ascending (lowest first)
  return asks.sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
})

export const asksAtom = selectAtom(rawAsksAtom, (asks, prev) => 
  prev && arrayEquals(asks, prev) ? prev : asks
)

// Optimized spread calculation atom with memoization
const rawSpreadAtom = atom((get) => {
  const bids = get(bidsAtom)
  const asks = get(asksAtom)
  
  if (bids.length === 0 || asks.length === 0) {
    return null
  }
  
  const bestBid = bids[0].price
  const bestAsk = asks[0].price
  
  return {
    spread: bestAsk - bestBid,
    spreadPercent: ((bestAsk - bestBid) / bestBid * 100).toFixed(4),
    bestBid,
    bestAsk
  }
})

export const spreadAtom = selectAtom(rawSpreadAtom, (spread, prev) => {
  if (!spread && !prev) return null
  if (!spread || !prev) return spread
  return spread.bestBid === prev.bestBid && spread.bestAsk === prev.bestAsk ? prev : spread
})

