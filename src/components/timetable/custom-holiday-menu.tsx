"use client"

import React, { useState, useEffect, useRef } from 'react'
import { CalendarEvent } from '@/types/timetable'
import { Info, Pencil, Trash2, Calendar, AlertTriangle, ChevronRight, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

interface CustomHolidayMenuProps {
  event: CalendarEvent
  onClick?: (event: CalendarEvent) => void
  className?: string
  children?: React.ReactNode
}

export function CustomHolidayMenu({ event, onClick, className = "", children }: CustomHolidayMenuProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showTypeSubmenu, setShowTypeSubmenu] = useState(false)
  const [isUpdatingType, setIsUpdatingType] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const submenuRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const router = useRouter()
  const queryClient = useQueryClient()

  const holidayTypes = [
    { value: 'NATIONAL', label: 'National Holiday', color: 'text-red-600' },
    { value: 'UNIVERSITY', label: 'University Holiday', color: 'text-blue-600' },
    { value: 'DEPARTMENT', label: 'Department Holiday', color: 'text-green-600' },
    { value: 'LOCAL', label: 'Local Holiday', color: 'text-orange-600' },
    { value: 'FESTIVAL', label: 'Festival', color: 'text-purple-600' }
  ]

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(e.target as Node) &&
        submenuRef.current &&
        !submenuRef.current.contains(e.target as Node)
      ) {
        setShowMenu(false)
        setShowTypeSubmenu(false)
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMenu(false)
        setShowTypeSubmenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showMenu])

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Calculate position
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMenuPosition({
      x: e.clientX,
      y: e.clientY
    })
    setShowMenu(true)
    setShowTypeSubmenu(false)
  }

  const handleLeftClick = (e: React.MouseEvent) => {
    if (e.button === 0 && onClick) {
      onClick(event)
    }
  }

  const handleViewDetails = () => {
    toast({
      title: "Holiday Details",
      description: event.title || "Holiday",
    })
    setShowMenu(false)
  }

  const handleEdit = () => {
    toast({
      title: "Edit Holiday",
      description: "Edit feature coming soon!",
    })
    setShowMenu(false)
  }

  const handleDeleteClick = () => {
    setShowDeleteDialog(true)
    setShowMenu(false)
    setShowTypeSubmenu(false)
  }

  const handleTypeChange = async (newType: string) => {
    try {
      setIsUpdatingType(true)
      const holidayId = event.extendedProps?.holidayId || event.extendedProps?.id || event.id
      
      if (!holidayId || holidayId === 'undefined') {
        throw new Error('No holiday ID found')
      }

      const response = await fetch(`/api/settings/holidays/${holidayId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: newType }),
      })

      if (!response.ok) {
        throw new Error('Failed to update holiday type')
      }

      toast({
        title: "Holiday Type Updated",
        description: `Changed to ${holidayTypes.find(t => t.value === newType)?.label}`,
      })

      // Invalidate the holidays query to refresh the data
      await queryClient.invalidateQueries({ queryKey: ['holidays'] })
      
      router.refresh()
      setShowMenu(false)
      setShowTypeSubmenu(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update holiday type. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsUpdatingType(false)
    }
  }

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true)
      // For holidays, we need to use the correct ID
      const deleteId = event.extendedProps?.holidayId || event.extendedProps?.id || event.id
      
      if (!deleteId || deleteId === 'undefined') {
        console.error('No valid holiday ID found in event:', event)
        throw new Error('No holiday ID found')
      }
      
      console.log('Deleting holiday with ID:', deleteId)
      
      const response = await fetch(`/api/settings/holidays/${deleteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Delete failed:', response.status, errorData)
        throw new Error(errorData.error || 'Failed to delete holiday')
      }

      toast({
        title: "Holiday Deleted",
        description: `${event.title} has been deleted successfully`,
      })

      // Invalidate the holidays query to refresh the data
      await queryClient.invalidateQueries({ queryKey: ['holidays'] })
      
      router.refresh()
      setShowDeleteDialog(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete holiday. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Component lifecycle (commented out for production)
  // React.useEffect(() => {
  //   console.log('CustomHolidayMenu mounted for event:', event.title)
  //   return () => {
  //     console.log('CustomHolidayMenu unmounted for event:', event.title)
  //   }
  // }, [event.title])

  return (
    <>
      <div 
        className={cn(
          children ? "" : "bg-red-500 text-white rounded px-3 py-2 text-sm font-medium cursor-pointer hover:bg-red-600 transition-colors",
          className
        )}
        onClick={handleLeftClick}
        onContextMenu={handleRightClick}
      >
        {children || `Holiday: ${event.title}`}
      </div>

      {/* Custom Context Menu */}
      {showMenu && (
        <div
          ref={menuRef}
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-[999999] min-w-[200px]"
          style={{
            left: `${menuPosition.x}px`,
            top: `${menuPosition.y}px`,
          }}
          onContextMenu={(e) => {
            e.preventDefault()
          }}
        >
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            onClick={handleViewDetails}
          >
            <Info className="h-4 w-4" />
            View Details
          </button>
          
          <div className="border-t border-gray-200 my-1" />
          
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            onClick={handleEdit}
          >
            <Pencil className="h-4 w-4" />
            Edit Holiday
          </button>
          
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            onClick={handleEdit}
          >
            <Calendar className="h-4 w-4" />
            Reschedule
          </button>
          
          <div className="border-t border-gray-200 my-1" />
          
          {/* Change Type Menu Item */}
          <div 
            className="relative"
            onMouseEnter={() => setShowTypeSubmenu(true)}
            onMouseLeave={() => setShowTypeSubmenu(false)}
          >
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between"
              onClick={(e) => {
                e.stopPropagation()
                setShowTypeSubmenu(!showTypeSubmenu)
              }}
            >
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Change Type
              </span>
              <ChevronRight className="h-4 w-4" />
            </button>
            
            {/* Type Submenu */}
            {showTypeSubmenu && (
              <div
                ref={submenuRef}
                className="absolute left-full top-0 -ml-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-[999999] min-w-[180px]"
              >
                {holidayTypes.map((type) => (
                  <button
                    key={type.value}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between",
                      type.color,
                      isUpdatingType && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleTypeChange(type.value)
                    }}
                    disabled={isUpdatingType}
                  >
                    <span>{type.label}</span>
                    {event.extendedProps?.type === type.value && (
                      <Check className="h-4 w-4" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="border-t border-gray-200 my-1" />
          
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-red-600"
            onClick={handleDeleteClick}
          >
            <Trash2 className="h-4 w-4" />
            Delete Holiday
          </button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <DialogTitle>Delete Holiday</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this holiday? This action cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Holiday Details */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="font-semibold text-sm">
              {event.title}
            </div>
            <div className="text-sm text-muted-foreground">
              <strong>Date:</strong> {event.start && format(event.start, 'EEEE, MMMM d, yyyy')}
            </div>
            {event.extendedProps?.type && (
              <div className="text-sm text-muted-foreground">
                <strong>Type:</strong> {event.extendedProps.type}
              </div>
            )}
            {event.extendedProps?.description && (
              <div className="text-sm text-muted-foreground">
                <strong>Description:</strong> {event.extendedProps.description}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Holiday
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}