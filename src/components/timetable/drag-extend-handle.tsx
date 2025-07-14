'use client'

import { useState, useEffect } from 'react'
import { GripVertical } from 'lucide-react'

interface DragExtendHandleProps {
  entryId: string
  direction: 'vertical' | 'horizontal'
  currentTimeSlot?: string
  currentDay?: string
  onDragStart: (entryId: string, direction: 'vertical' | 'horizontal') => void
  onDragEnd: (entryId: string, newSlots: string[]) => void
  onDragPreview?: (slots: string[]) => void
  className?: string
}

export function DragExtendHandle({ 
  entryId, 
  direction, 
  currentTimeSlot,
  currentDay,
  onDragStart, 
  onDragEnd, 
  onDragPreview,
  className = '' 
}: DragExtendHandleProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 })
  const [currentSlots, setCurrentSlots] = useState<string[]>([])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setIsDragging(true)
    setDragStartPos({ x: e.clientX, y: e.clientY })
    onDragStart(entryId, direction)
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return
    
    const deltaX = e.clientX - dragStartPos.x
    const deltaY = e.clientY - dragStartPos.y
    
    // Calculate which slots should be selected based on drag distance
    const slots = calculateSlotsFromDrag(deltaX, deltaY)
    setCurrentSlots(slots)
    
    // Update visual feedback
    if (onDragPreview) {
      onDragPreview(slots)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    
    if (currentSlots.length > 0) {
      onDragEnd(entryId, currentSlots)
    }
    
    setCurrentSlots([])
    clearDragPreview()
  }

  const calculateSlotsFromDrag = (deltaX: number, deltaY: number): string[] => {
    const slots: string[] = []
    
    if (direction === 'vertical') {
      // Calculate how many time slots to extend based on deltaY
      const slotHeight = 100 // Approximate height of a time slot (min-h-[100px])
      const slotsToExtend = Math.floor(Math.abs(deltaY) / slotHeight)
      
      if (slotsToExtend > 0) {
        // Get available time slots from the timetable
        const timeSlots = ['10:15-11:05', '11:15-12:05', '12:15-13:05', '14:15-15:05']
        
        // Determine direction: positive deltaY = down, negative = up
        const isExtendingDown = deltaY > 0
        const maxExtend = Math.min(slotsToExtend, timeSlots.length - 1)
        
        for (let i = 1; i <= maxExtend; i++) {
          const slotIndex = isExtendingDown ? i : -i
          const targetSlotIndex = timeSlots.findIndex(slot => slot === getCurrentTimeSlot()) + slotIndex
          
          if (targetSlotIndex >= 0 && targetSlotIndex < timeSlots.length) {
            slots.push(timeSlots[targetSlotIndex])
          }
        }
      }
    } else {
      // Calculate how many days to extend based on deltaX
      const dayWidth = 133 // Approximate width of a day column (800px / 6 cols)
      const daysToExtend = Math.floor(Math.abs(deltaX) / dayWidth)
      
      if (daysToExtend > 0) {
        // Get available days from the timetable
        const weekdays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']
        
        // Determine direction: positive deltaX = right, negative = left
        const isExtendingRight = deltaX > 0
        const maxExtend = Math.min(daysToExtend, weekdays.length - 1)
        
        for (let i = 1; i <= maxExtend; i++) {
          const dayIndex = isExtendingRight ? i : -i
          const targetDayIndex = weekdays.findIndex(day => day === getCurrentDay()) + dayIndex
          
          if (targetDayIndex >= 0 && targetDayIndex < weekdays.length) {
            slots.push(weekdays[targetDayIndex])
          }
        }
      }
    }
    
    return slots
  }
  
  const getCurrentTimeSlot = (): string => {
    return currentTimeSlot || '10:15-11:05'
  }
  
  const getCurrentDay = (): string => {
    return currentDay || 'MONDAY'
  }

  const clearDragPreview = () => {
    // Remove visual feedback classes
    document.querySelectorAll('.drag-preview-active').forEach(el => {
      el.classList.remove('drag-preview-active')
    })
  }

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  return (
    <div
      className={`
        absolute cursor-pointer transition-all duration-200
        ${direction === 'vertical' ? 'bottom-0 right-1/2 translate-x-1/2 translate-y-1/2' : 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2'}
        ${isDragging ? 'scale-125' : 'hover:scale-110'}
        ${className}
      `}
      onMouseDown={handleMouseDown}
    >
      <div className={`
        flex items-center justify-center w-6 h-6 
        bg-blue-500 hover:bg-blue-600 rounded-full shadow-lg
        ${isDragging ? 'bg-blue-600' : ''}
      `}>
        <GripVertical 
          size={12} 
          className={`text-white ${direction === 'horizontal' ? 'rotate-90' : ''}`} 
        />
      </div>
    </div>
  )
}