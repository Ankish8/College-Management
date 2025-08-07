"use client"

import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef, useMemo } from 'react'

interface VirtualListProps<T> {
  items: T[]
  height: number
  itemHeight: number | ((index: number) => number)
  renderItem: (item: T, index: number) => React.ReactNode
  overscan?: number
  className?: string
}

export function VirtualList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  overscan = 5,
  className = ""
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: typeof itemHeight === 'function' ? itemHeight : () => itemHeight,
    overscan,
  })

  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{ height }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: virtualItem.size,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  )
}

// Specialized virtual list for table rows
interface VirtualTableProps<T> {
  items: T[]
  height: number
  itemHeight?: number
  renderHeader?: () => React.ReactNode
  renderRow: (item: T, index: number) => React.ReactNode
  className?: string
}

export function VirtualTable<T>({
  items,
  height,
  itemHeight = 60,
  renderHeader,
  renderRow,
  className = ""
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 10, // Higher overscan for better table scrolling
  })

  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div className={`border rounded-md ${className}`}>
      {renderHeader && (
        <div className="border-b bg-muted/50">
          {renderHeader()}
        </div>
      )}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height }}
      >
        <div
          style={{
            height: virtualizer.getTotalSize(),
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualItem) => (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: virtualItem.size,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {renderRow(items[virtualItem.index], virtualItem.index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Virtual grid for card layouts
interface VirtualGridProps<T> {
  items: T[]
  height: number
  itemHeight: number
  columns: number
  gap?: number
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
}

export function VirtualGrid<T>({
  items,
  height,
  itemHeight,
  columns,
  gap = 16,
  renderItem,
  className = ""
}: VirtualGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  // Calculate rows needed
  const rowCount = Math.ceil(items.length / columns)
  const rowHeight = itemHeight + gap

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 3,
  })

  const virtualRows = virtualizer.getVirtualItems()

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{ height }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualRows.map((virtualRow) => {
          const rowStartIndex = virtualRow.index * columns
          const rowItems = items.slice(rowStartIndex, rowStartIndex + columns)
          
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: virtualRow.size - gap,
                transform: `translateY(${virtualRow.start}px)`,
                display: 'grid',
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                gap: `${gap}px`,
                padding: `0 ${gap}px`,
              }}
            >
              {rowItems.map((item, colIndex) => {
                const itemIndex = rowStartIndex + colIndex
                return (
                  <div key={itemIndex}>
                    {renderItem(item, itemIndex)}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}