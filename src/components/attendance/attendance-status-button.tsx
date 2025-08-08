"use client"

import { useState, useRef } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import type { AttendanceStatus } from "@/types/attendance"
import type { AttendanceMode } from "./attendance-mode-toggle"

interface AttendanceStatusButtonProps {
  status: AttendanceStatus | null
  onStatusChange: (status: AttendanceStatus) => void
  isFullDay?: boolean
  showLabel?: boolean
  attendanceMode: AttendanceMode
  disableClick?: boolean
}

export function AttendanceStatusButton({
  status,
  onStatusChange,
  isFullDay = false,
  showLabel = false,
  attendanceMode,
  disableClick = false
}: AttendanceStatusButtonProps) {
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [clickCount, setClickCount] = useState(0)

  const handleMedicalSelect = () => {
    onStatusChange('medical')
  }

  // Handle single/double click logic
  const handleClick = () => {
    if (disableClick) return

    const newCount = clickCount + 1
    setClickCount(newCount)

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current)
    }

    clickTimeoutRef.current = setTimeout(() => {
      if (newCount === 1) {
        // Single click - mark as present
        onStatusChange('present')
      } else if (newCount >= 2) {
        // Double click - mark as absent  
        onStatusChange('absent')
      }
      setClickCount(0)
    }, 400) // 400ms delay to detect double click
  }

  // Get the visual style based on current status
  const getButtonStyle = () => {
    const baseStyle = "w-8 h-8 rounded text-sm font-semibold transition-all duration-200 border flex items-center justify-center"
    
    if (disableClick) {
      return `${baseStyle} cursor-default`
    }

    switch (status) {
      case 'present':
        return `${baseStyle} bg-green-100 text-green-700 border-green-200 shadow-sm cursor-pointer hover:bg-green-200`
      case 'absent':
        return `${baseStyle} bg-red-100 text-red-700 border-red-200 shadow-sm cursor-pointer hover:bg-red-200`
      case 'medical':
        return `${baseStyle} bg-blue-100 text-blue-700 border-blue-200 shadow-sm cursor-pointer hover:bg-blue-200`
      default:
        // Unmarked state - neutral with hover
        return `${baseStyle} bg-gray-50 text-gray-400 border-gray-200 cursor-pointer hover:bg-gray-100 hover:border-gray-300`
    }
  }

  const getButtonContent = () => {
    switch (status) {
      case 'present':
        return '✓'
      case 'absent':
        return 'A'
      case 'medical':
        return 'M'
      default:
        return '○' // Empty circle for unmarked
    }
  }

  const getStatusLabel = () => {
    switch (status) {
      case 'present':
        return 'Present'
      case 'absent':
        return 'Absent'
      case 'medical':
        return 'Medical'
      default:
        return 'Mark' // Neutral label when unmarked
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            className={`${getButtonStyle()} attendance-status-button`}
            onClick={handleClick}
            title={
              status 
                ? `${getStatusLabel()} - Click cell or Space: Present, Alt: Absent, Right click: Medical`
                : "Click cell or Space: Present, Alt: Absent, Right click: Medical"
            }
          >
            {getButtonContent()}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={handleMedicalSelect}>
            Mark as Medical
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      
      {(showLabel || status) && (
        <div className="text-xs text-gray-600 font-medium uppercase tracking-wide">
          {getStatusLabel()}
        </div>
      )}
    </div>
  )
}