"use client"

import { CalendarEvent } from '@/types/timetable'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { 
  Pencil, 
  Trash2, 
  Calendar,
  Info,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

interface HolidayEventCardProps {
  event: CalendarEvent
  onClick?: (event: CalendarEvent) => void
  className?: string
}

export function HolidayEventCard({ event, onClick, className = "" }: HolidayEventCardProps) {
  const { toast } = useToast()
  const router = useRouter()

  const handleClick = (e: React.MouseEvent) => {
    // Only handle left clicks
    if (e.button === 0 && onClick) {
      onClick(event)
    }
  }

  const handleViewDetails = () => {
    toast({
      title: "Holiday Details",
      description: event.title || "Holiday",
    })
  }

  const handleEdit = () => {
    toast({
      title: "Edit Holiday",
      description: "Edit feature coming soon!",
    })
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete this holiday?`)) {
      return
    }

    try {
      const deleteId = event.extendedProps?.holidayId || event.id
      const response = await fetch(`/api/settings/holidays/${deleteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete holiday')
      }

      toast({
        title: "Holiday Deleted",
        description: `${event.title} has been deleted successfully`,
      })

      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete holiday. Please try again.",
        variant: "destructive"
      })
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div 
          className={`bg-red-500 text-white rounded px-3 py-2 text-sm font-medium cursor-pointer hover:bg-red-600 transition-colors ${className}`}
          onClick={handleClick}
        >
          Holiday: {event.title}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56 z-[99999]">
        <ContextMenuItem 
          onClick={handleViewDetails}
          className="flex items-center gap-2"
        >
          <Info className="h-4 w-4" />
          View Details
        </ContextMenuItem>
        
        <ContextMenuSeparator />
        
        <ContextMenuItem 
          onClick={handleEdit}
          className="flex items-center gap-2"
        >
          <Pencil className="h-4 w-4" />
          Edit Holiday
        </ContextMenuItem>
        
        <ContextMenuItem 
          onClick={handleEdit}
          className="flex items-center gap-2"
        >
          <Calendar className="h-4 w-4" />
          Reschedule
        </ContextMenuItem>
        
        <ContextMenuSeparator />
        
        <ContextMenuItem 
          onClick={handleDelete}
          className="flex items-center gap-2 text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
          Delete Holiday
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}