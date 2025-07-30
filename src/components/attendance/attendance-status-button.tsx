"use client"

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
  const handleMedicalSelect = () => {
    onStatusChange('medical')
  }
  
  // Mode 2 (Fast): Only for Full Day - single button
  if (attendanceMode === 'fast' && isFullDay) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div
          className={cn(
            "w-8 h-8 rounded text-xs font-semibold transition-all duration-200 border flex items-center justify-center",
            status === 'present' 
              ? "bg-green-100 text-green-700 border-green-200 shadow-sm" 
              : "bg-gray-100 text-gray-500 border-gray-300",
            !disableClick && "cursor-pointer hover:bg-gray-200"
          )}
          onClick={disableClick ? undefined : () => onStatusChange(status === 'present' ? 'absent' : 'present')}
        >
          {status === 'present' ? '✓' : '○'}
        </div>
        
        <div className="text-xs text-gray-600 font-medium uppercase tracking-wide">
          {status === 'present' ? 'Present' : 'Absent'}
        </div>
      </div>
    )
  }
  
  // Mode 1 (Detailed): P/A buttons for both sessions and Full Day
  // Sessions: Always P/A only
  // Full Day: P/A only (Medical will be handled via overlay/context menu later)
  const availableStatuses: AttendanceStatus[] = ['present', 'absent']

  const getButtonStyle = (buttonStatus: AttendanceStatus, isSelected: boolean) => {
    const baseStyle = `w-6 h-6 rounded text-xs font-semibold transition-all duration-200 border flex items-center justify-center ${!disableClick ? 'cursor-pointer' : ''}`
    
    if (isSelected) {
      // Selected state - subtle colors
      switch (buttonStatus) {
        case 'present':
          return `${baseStyle} bg-green-100 text-green-700 border-green-200 shadow-sm`
        case 'absent':
          return `${baseStyle} bg-red-100 text-red-700 border-red-200 shadow-sm`
        case 'medical':
          return `${baseStyle} bg-blue-100 text-blue-700 border-blue-200 shadow-sm`
      }
    } else {
      // Unselected state - very subtle gray
      const hoverClass = !disableClick ? 'hover:bg-gray-100 hover:border-gray-250' : ''
      return `${baseStyle} bg-gray-50 text-gray-500 border-gray-200 ${hoverClass}`
    }
  }

  const getButtonText = (buttonStatus: AttendanceStatus) => {
    switch (buttonStatus) {
      case 'present':
        return 'P'
      case 'absent':
        return 'A'
      case 'medical':
        return 'M'
    }
  }

  const getStatusLabel = (buttonStatus: AttendanceStatus) => {
    switch (buttonStatus) {
      case 'present':
        return 'Present'
      case 'absent':
        return 'Absent'
      case 'medical':
        return 'Medical'
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <ContextMenu>
        <ContextMenuTrigger>
          <div className="flex items-center justify-center gap-1">
            {availableStatuses.map((buttonStatus) => (
              <button
                key={buttonStatus}
                onClick={disableClick ? undefined : () => onStatusChange(buttonStatus)}
                className={getButtonStyle(buttonStatus, status === buttonStatus)}
                type="button"
              >
                {getButtonText(buttonStatus)}
              </button>
            ))}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={handleMedicalSelect}>
            Mark as Medical
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      
      <div className="text-xs text-gray-600 font-medium uppercase tracking-wide">
        {status ? getStatusLabel(status) : 'Mark'}
      </div>
    </div>
  )
}