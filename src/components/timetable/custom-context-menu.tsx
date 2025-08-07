"use client"

import { CalendarEvent } from '@/types/timetable'
import { 
  Pencil, 
  Trash2, 
  Calendar,
  Info,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { EventDetailsModal } from './event-details-modal'
import { EventEditModal } from './event-edit-modal'

interface CustomContextMenuProps {
  event: CalendarEvent
  children: React.ReactNode
  canEdit?: boolean
  canDelete?: boolean
  canMarkAttendance?: boolean
}

export function CustomContextMenu({
  event,
  children,
  canEdit = true,
  canDelete = true,
  canMarkAttendance = false
}: CustomContextMenuProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [showMenu, setShowMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Determine event type
  const eventType = event.extendedProps?.type || (event.allDay ? 'holiday' : 'class')

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setMenuPosition({ x: e.pageX, y: e.pageY })
    setShowMenu(true)
  }

  const handleMenuItemClick = (action: () => void) => {
    action()
    setShowMenu(false)
  }

  const handleViewDetails = () => {
    setShowDetailsModal(true)
  }

  const handleEdit = () => {
    setShowEditModal(true)
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete this ${eventType === 'holiday' ? 'holiday' : eventType === 'custom' ? 'event' : 'class'}?`)) {
      return
    }

    try {
      const deleteId = eventType === 'holiday' 
        ? event.extendedProps?.holidayId || event.id
        : event.id
        
      const endpoint = eventType === 'holiday' 
        ? `/api/settings/holidays/${deleteId}`
        : `/api/timetable/entries/${deleteId}`

      const response = await fetch(endpoint, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete entry')
      }

      toast({
        title: "Entry Deleted",
        description: `${event.title || event.extendedProps?.subjectName || 'Entry'} has been deleted successfully`,
      })

      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete entry. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleMarkAttendance = () => {
    if (event.extendedProps?.subjectId && event.extendedProps?.batchId) {
      const dateStr = new Date(event.start).toISOString().split('T')[0]
      router.push(`/dashboard/attendance?batchId=${event.extendedProps.batchId}&subjectId=${event.extendedProps.subjectId}&date=${dateStr}`)
    }
  }

  const handleCancelClass = async () => {
    try {
      const response = await fetch(`/api/timetable/entries/${event.id}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelled: true })
      })

      if (!response.ok) {
        throw new Error('Failed to cancel class')
      }

      toast({
        title: "Class Cancelled",
        description: `${event.title || event.extendedProps?.subjectName} has been marked as cancelled`,
      })

      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel class. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleReschedule = () => {
    toast({
      title: "Reschedule",
      description: "Reschedule feature coming soon!",
    })
  }

  return (
    <>
      <div onContextMenu={handleContextMenu}>
        {children}
      </div>

      {/* Custom Context Menu */}
      {showMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 w-56 bg-white rounded-md shadow-lg border border-border py-1"
          style={{ 
            left: `${menuPosition.x}px`, 
            top: `${menuPosition.y}px` 
          }}
        >
          <div
            className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted"
            onClick={() => handleMenuItemClick(handleViewDetails)}
          >
            <Info className="h-4 w-4" />
            View Details
          </div>
          
          {canEdit && (
            <>
              <div className="h-px bg-border my-1" />
              <div
                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted"
                onClick={() => handleMenuItemClick(handleEdit)}
              >
                <Pencil className="h-4 w-4" />
                Edit {eventType === 'holiday' ? 'Holiday' : eventType === 'custom' ? 'Event' : 'Class'}
              </div>
            </>
          )}

          {eventType === 'class' && (
            <>
              <div className="h-px bg-border my-1" />
              {canMarkAttendance && (
                <div
                  className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted"
                  onClick={() => handleMenuItemClick(handleMarkAttendance)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark Attendance
                </div>
              )}
              <div
                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted"
                onClick={() => handleMenuItemClick(handleCancelClass)}
              >
                <XCircle className="h-4 w-4" />
                Cancel Class
              </div>
              <div
                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted"
                onClick={() => handleMenuItemClick(handleReschedule)}
              >
                <Calendar className="h-4 w-4" />
                Reschedule
              </div>
            </>
          )}

          {canDelete && (
            <>
              <div className="h-px bg-border my-1" />
              <div
                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted text-red-600 hover:text-red-700"
                onClick={() => handleMenuItemClick(handleDelete)}
              >
                <Trash2 className="h-4 w-4" />
                Delete {eventType === 'holiday' ? 'Holiday' : eventType === 'custom' ? 'Event' : 'Entry'}
              </div>
            </>
          )}
        </div>
      )}

      {/* Modals */}
      <EventDetailsModal
        event={event}
        open={showDetailsModal}
        onOpenChange={setShowDetailsModal}
      />
      
      <EventEditModal
        event={event}
        open={showEditModal}
        onOpenChange={setShowEditModal}
      />
    </>
  )
}