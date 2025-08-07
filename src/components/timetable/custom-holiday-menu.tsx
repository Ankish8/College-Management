"use client"

import { useState, useEffect, useRef } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showTypeSubmenu, setShowTypeSubmenu] = useState(false)
  const [isUpdatingType, setIsUpdatingType] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    type: '',
    description: '',
    date: ''
  })
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
    setShowDetailsDialog(true)
    setShowMenu(false)
    setShowTypeSubmenu(false)
  }

  const handleEdit = () => {
    // Initialize form with current event data
    setEditForm({
      name: event.title || '',
      type: event.extendedProps?.type || 'UNIVERSITY',
      description: event.extendedProps?.holidayDescription || '',
      date: event.start ? format(event.start, 'yyyy-MM-dd') : ''
    })
    setShowEditDialog(true)
    setShowMenu(false)
    setShowTypeSubmenu(false)
  }

  const handleEditSubmit = async () => {
    try {
      setIsUpdating(true)
      const holidayId = event.extendedProps?.holidayId || event.id
      
      if (!holidayId || holidayId === 'undefined') {
        throw new Error('No holiday ID found')
      }

      const response = await fetch(`/api/settings/holidays/${holidayId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editForm.name.trim(),
          type: editForm.type,
          description: editForm.description.trim(),
          date: editForm.date
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update holiday')
      }

      toast({
        title: "Holiday Updated",
        description: `${editForm.name} has been updated successfully`,
      })

      // Invalidate the holidays query to refresh the data
      await queryClient.invalidateQueries({ queryKey: ['holidays'] })
      
      router.refresh()
      setShowEditDialog(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update holiday. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteClick = () => {
    setShowDeleteDialog(true)
    setShowMenu(false)
    setShowTypeSubmenu(false)
  }

  const handleTypeChange = async (newType: string) => {
    try {
      setIsUpdatingType(true)
      const holidayId = event.extendedProps?.holidayId || event.id
      
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
      const deleteId = event.extendedProps?.holidayId || event.id
      
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
            {event.extendedProps?.holidayDescription && (
              <div className="text-sm text-muted-foreground">
                <strong>Description:</strong> {event.extendedProps.holidayDescription}
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

      {/* View Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Info className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle>Holiday Details</DialogTitle>
                <DialogDescription>
                  View information about this holiday.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Holiday Details */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <div>
              <div className="text-sm text-muted-foreground font-medium mb-1">Holiday Name</div>
              <div className="font-semibold">
                {event.title}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-muted-foreground font-medium mb-1">Date</div>
              <div>{event.start && format(event.start, 'EEEE, MMMM d, yyyy')}</div>
            </div>
            
            {event.extendedProps?.type && (
              <div>
                <div className="text-sm text-muted-foreground font-medium mb-1">Type</div>
                <div className={cn(
                  holidayTypes.find(t => t.value === event.extendedProps?.type)?.color || 'text-gray-600'
                )}>
                  {holidayTypes.find(t => t.value === event.extendedProps?.type)?.label || event.extendedProps.type}
                </div>
              </div>
            )}
            
            {event.extendedProps?.holidayDescription && (
              <div>
                <div className="text-sm text-muted-foreground font-medium mb-1">Description</div>
                <div>{event.extendedProps.holidayDescription}</div>
              </div>
            )}
            
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDetailsDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Holiday Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <Pencil className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <DialogTitle>Edit Holiday</DialogTitle>
                <DialogDescription>
                  Update the holiday information.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Edit Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name" className="text-sm font-medium">Holiday Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Holiday name"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="edit-date" className="text-sm font-medium">Date</Label>
              <Input
                id="edit-date"
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="edit-type" className="text-sm font-medium">Holiday Type</Label>
              <Select 
                value={editForm.type} 
                onValueChange={(value) => setEditForm(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {holidayTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className={type.color}>{type.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-description" className="text-sm font-medium">Description (Optional)</Label>
              <Input
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={isUpdating || !editForm.name.trim()}
              className="gap-2"
            >
              {isUpdating ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Updating...
                </>
              ) : (
                <>
                  <Pencil className="h-4 w-4" />
                  Update Holiday
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}