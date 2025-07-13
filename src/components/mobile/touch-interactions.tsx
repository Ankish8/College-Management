"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'

// Touch gesture types
export type SwipeDirection = 'left' | 'right' | 'up' | 'down'
export type GestureType = 'swipe' | 'pinch' | 'tap' | 'longPress' | 'doubleTap'

// Touch event interfaces
interface TouchPosition {
  x: number
  y: number
}

interface SwipeGestureOptions {
  onSwipe: (direction: SwipeDirection, distance: number) => void
  threshold?: number
  velocity?: number
  preventDefault?: boolean
}

interface PinchGestureOptions {
  onPinch: (scale: number, center: TouchPosition) => void
  onPinchStart?: () => void
  onPinchEnd?: () => void
  threshold?: number
}

interface TapGestureOptions {
  onTap?: (position: TouchPosition) => void
  onDoubleTap?: (position: TouchPosition) => void
  onLongPress?: (position: TouchPosition) => void
  tapTimeout?: number
  longPressTimeout?: number
}

interface TouchInteractionOptions extends SwipeGestureOptions, PinchGestureOptions, TapGestureOptions {
  enableSwipe?: boolean
  enablePinch?: boolean
  enableTap?: boolean
  enableLongPress?: boolean
  enableDoubleTap?: boolean
}

// Custom hook for touch gestures
export function useTouchGestures(options: Partial<TouchInteractionOptions> = {}) {
  const {
    onSwipe,
    onPinch,
    onPinchStart,
    onPinchEnd,
    onTap,
    onDoubleTap,
    onLongPress,
    threshold = 50,
    velocity = 0.3,
    tapTimeout = 300,
    longPressTimeout = 500,
    enableSwipe = true,
    enablePinch = false,
    enableTap = true,
    enableLongPress = false,
    enableDoubleTap = false,
    preventDefault = true
  } = options

  const [touchState, setTouchState] = useState({
    touches: [] as TouchPosition[],
    startTime: 0,
    lastTap: 0,
    isPinching: false,
    initialDistance: 0,
    longPressTimer: null as NodeJS.Timeout | null
  })

  const stateRef = useRef(touchState)
  stateRef.current = touchState

  const getTouchPosition = (touch: Touch): TouchPosition => ({
    x: touch.clientX,
    y: touch.clientY
  })

  const getDistance = (pos1: TouchPosition, pos2: TouchPosition): number => {
    return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2))
  }

  const getDirection = (start: TouchPosition, end: TouchPosition): SwipeDirection => {
    const deltaX = end.x - start.x
    const deltaY = end.y - start.y
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? 'right' : 'left'
    } else {
      return deltaY > 0 ? 'down' : 'up'
    }
  }

  const clearLongPressTimer = () => {
    if (stateRef.current.longPressTimer) {
      clearTimeout(stateRef.current.longPressTimer)
      setTouchState(prev => ({ ...prev, longPressTimer: null }))
    }
  }

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (preventDefault) {
      e.preventDefault()
    }

    const touches = Array.from(e.touches).map(getTouchPosition)
    const now = Date.now()

    setTouchState(prev => ({
      ...prev,
      touches,
      startTime: now,
      isPinching: touches.length === 2,
      initialDistance: touches.length === 2 ? getDistance(touches[0], touches[1]) : 0
    }))

    // Handle pinch start
    if (enablePinch && touches.length === 2) {
      onPinchStart?.()
    }

    // Handle long press
    if (enableLongPress && touches.length === 1) {
      const timer = setTimeout(() => {
        onLongPress?.(touches[0])
        setTouchState(prev => ({ ...prev, longPressTimer: null }))
      }, longPressTimeout)
      
      setTouchState(prev => ({ ...prev, longPressTimer: timer }))
    }

    // Handle double tap detection
    if (enableDoubleTap && touches.length === 1) {
      const timeSinceLastTap = now - stateRef.current.lastTap
      if (timeSinceLastTap < tapTimeout) {
        clearLongPressTimer()
        onDoubleTap?.(touches[0])
        setTouchState(prev => ({ ...prev, lastTap: 0 }))
      }
    }
  }, [onPinchStart, onLongPress, onDoubleTap, enablePinch, enableLongPress, enableDoubleTap, longPressTimeout, tapTimeout, preventDefault])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (preventDefault) {
      e.preventDefault()
    }

    const touches = Array.from(e.touches).map(getTouchPosition)
    
    // Clear long press timer on movement
    clearLongPressTimer()

    // Handle pinch gesture
    if (enablePinch && touches.length === 2 && stateRef.current.isPinching) {
      const currentDistance = getDistance(touches[0], touches[1])
      const scale = currentDistance / stateRef.current.initialDistance
      const center = {
        x: (touches[0].x + touches[1].x) / 2,
        y: (touches[0].y + touches[1].y) / 2
      }
      onPinch?.(scale, center)
    }

    setTouchState(prev => ({ ...prev, touches }))
  }, [onPinch, enablePinch, preventDefault])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (preventDefault) {
      e.preventDefault()
    }

    clearLongPressTimer()

    const now = Date.now()
    const endTouches = Array.from(e.changedTouches).map(getTouchPosition)
    const remainingTouches = Array.from(e.touches).map(getTouchPosition)

    // Handle pinch end
    if (enablePinch && stateRef.current.isPinching && remainingTouches.length < 2) {
      onPinchEnd?.()
    }

    // Handle swipe gesture
    if (enableSwipe && stateRef.current.touches.length === 1 && endTouches.length === 1) {
      const startPos = stateRef.current.touches[0]
      const endPos = endTouches[0]
      const distance = getDistance(startPos, endPos)
      const duration = now - stateRef.current.startTime
      const currentVelocity = distance / duration

      if (distance > threshold && currentVelocity > velocity) {
        const direction = getDirection(startPos, endPos)
        onSwipe?.(direction, distance)
      }
    }

    // Handle tap gesture
    if (enableTap && stateRef.current.touches.length === 1 && endTouches.length === 1) {
      const startPos = stateRef.current.touches[0]
      const endPos = endTouches[0]
      const distance = getDistance(startPos, endPos)
      const duration = now - stateRef.current.startTime

      // Consider it a tap if movement is minimal and duration is short
      if (distance < 10 && duration < tapTimeout) {
        if (enableDoubleTap) {
          const timeSinceLastTap = now - stateRef.current.lastTap
          if (timeSinceLastTap < tapTimeout && stateRef.current.lastTap > 0) {
            // This is handled in touchStart
            return
          } else {
            setTouchState(prev => ({ ...prev, lastTap: now }))
            // Delay single tap to wait for potential double tap
            setTimeout(() => {
              if (now === stateRef.current.lastTap) {
                onTap?.(endPos)
              }
            }, tapTimeout)
          }
        } else {
          onTap?.(endPos)
        }
      }
    }

    setTouchState(prev => ({
      ...prev,
      touches: remainingTouches,
      isPinching: remainingTouches.length === 2
    }))
  }, [onSwipe, onTap, enableSwipe, enableTap, enableDoubleTap, threshold, velocity, tapTimeout, preventDefault])

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    touchState: stateRef.current
  }
}

// Swipeable container component
interface SwipeableProps {
  children: React.ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number
  className?: string
  disabled?: boolean
}

export function Swipeable({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  className,
  disabled = false
}: SwipeableProps) {
  const { onTouchStart, onTouchMove, onTouchEnd } = useTouchGestures({
    enableSwipe: !disabled,
    threshold,
    onSwipe: (direction) => {
      switch (direction) {
        case 'left':
          onSwipeLeft?.()
          break
        case 'right':
          onSwipeRight?.()
          break
        case 'up':
          onSwipeUp?.()
          break
        case 'down':
          onSwipeDown?.()
          break
      }
    }
  })

  return (
    <div
      className={cn("touch-pan-y", className)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {children}
    </div>
  )
}

// Pull to refresh component
interface PullToRefreshProps {
  children: React.ReactNode
  onRefresh: () => Promise<void>
  threshold?: number
  className?: string
  refreshingText?: string
  pullText?: string
}

export function PullToRefresh({
  children,
  onRefresh,
  threshold = 80,
  className,
  refreshingText = "Refreshing...",
  pullText = "Pull to refresh"
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isPulling, setIsPulling] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const { onTouchStart, onTouchMove, onTouchEnd } = useTouchGestures({
    enableSwipe: false,
    enableTap: false,
    preventDefault: false
  })

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      setIsPulling(true)
    }
    onTouchStart(e)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isPulling && !isRefreshing) {
      const touch = e.touches[0]
      const startY = (e.currentTarget as HTMLElement).getBoundingClientRect().top
      const currentY = touch.clientY
      const distance = Math.max(0, currentY - startY)
      
      if (distance < threshold * 2) {
        setPullDistance(distance)
        e.preventDefault()
      }
    }
    onTouchMove(e)
  }

  const handleTouchEnd = async (e: React.TouchEvent) => {
    if (isPulling && pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }
    
    setIsPulling(false)
    setPullDistance(0)
    onTouchEnd(e)
  }

  const pullProgress = Math.min(pullDistance / threshold, 1)
  const showRefreshIndicator = pullDistance > 20 || isRefreshing

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      {showRefreshIndicator && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center bg-gray-50 border-b transition-all duration-200 z-10"
          style={{
            height: `${Math.min(pullDistance, threshold)}px`,
            opacity: pullProgress
          }}
        >
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {isRefreshing ? (
              <>
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>{refreshingText}</span>
              </>
            ) : (
              <>
                <div
                  className="w-4 h-4 border-2 border-gray-400 rounded-full transition-transform"
                  style={{
                    transform: `rotate(${pullProgress * 180}deg)`
                  }}
                />
                <span>{pullDistance >= threshold ? "Release to refresh" : pullText}</span>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Content */}
      <div
        className="transition-transform duration-200"
        style={{
          transform: `translateY(${showRefreshIndicator ? Math.min(pullDistance, threshold) : 0}px)`
        }}
      >
        {children}
      </div>
    </div>
  )
}

// Draggable component
interface DraggableProps {
  children: React.ReactNode
  onDrag?: (position: TouchPosition) => void
  onDragStart?: (position: TouchPosition) => void
  onDragEnd?: (position: TouchPosition) => void
  className?: string
  disabled?: boolean
}

export function Draggable({
  children,
  onDrag,
  onDragStart,
  onDragEnd,
  className,
  disabled = false
}: DraggableProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragPosition, setDragPosition] = useState<TouchPosition>({ x: 0, y: 0 })
  const startPosition = useRef<TouchPosition>({ x: 0, y: 0 })

  const { onTouchStart, onTouchMove, onTouchEnd } = useTouchGestures({
    enableSwipe: false,
    enableTap: false,
    preventDefault: !disabled
  })

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return
    
    const touch = e.touches[0]
    const position = { x: touch.clientX, y: touch.clientY }
    
    startPosition.current = position
    setIsDragging(true)
    onDragStart?.(position)
    onTouchStart(e)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || !isDragging) return
    
    const touch = e.touches[0]
    const position = {
      x: touch.clientX - startPosition.current.x,
      y: touch.clientY - startPosition.current.y
    }
    
    setDragPosition(position)
    onDrag?.(position)
    onTouchMove(e)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (disabled) return
    
    setIsDragging(false)
    setDragPosition({ x: 0, y: 0 })
    onDragEnd?.(dragPosition)
    onTouchEnd(e)
  }

  return (
    <div
      className={cn(
        "touch-none select-none",
        isDragging && "cursor-grabbing",
        !disabled && "cursor-grab",
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: isDragging ? `translate(${dragPosition.x}px, ${dragPosition.y}px)` : undefined
      }}
    >
      {children}
    </div>
  )
}

// Touch feedback component
interface TouchFeedbackProps {
  children: React.ReactNode
  onPress?: () => void
  className?: string
  feedbackType?: 'scale' | 'opacity' | 'shadow'
  disabled?: boolean
}

export function TouchFeedback({
  children,
  onPress,
  className,
  feedbackType = 'scale',
  disabled = false
}: TouchFeedbackProps) {
  const [isPressed, setIsPressed] = useState(false)

  const { onTouchStart, onTouchEnd } = useTouchGestures({
    enableSwipe: false,
    enablePinch: false,
    onTap: disabled ? undefined : onPress,
    preventDefault: false
  })

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!disabled) {
      setIsPressed(true)
    }
    onTouchStart(e)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsPressed(false)
    onTouchEnd(e)
  }

  const getFeedbackStyles = () => {
    if (!isPressed || disabled) return {}
    
    switch (feedbackType) {
      case 'scale':
        return { transform: 'scale(0.95)' }
      case 'opacity':
        return { opacity: 0.7 }
      case 'shadow':
        return { boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }
      default:
        return {}
    }
  }

  return (
    <div
      className={cn(
        "transition-all duration-100",
        !disabled && "cursor-pointer active:scale-95",
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={getFeedbackStyles()}
    >
      {children}
    </div>
  )
}

// Haptic feedback utility
export const hapticFeedback = {
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10)
    }
  },
  medium: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(20)
    }
  },
  heavy: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([30, 10, 30])
    }
  },
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 30, 100])
    }
  },
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200])
    }
  }
}