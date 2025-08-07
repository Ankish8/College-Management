"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CalendarEvent } from '@/types/timetable'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface EventEditModalProps {
  event: CalendarEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave?: (updatedEvent: CalendarEvent) => void
}

export function EventEditModal({ event, open, onOpenChange, onSave }: EventEditModalProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    room: '',
    entryType: 'REGULAR' as 'REGULAR' | 'MAKEUP' | 'EXTRA' | 'CANCELLED'
  })

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || event.extendedProps?.subjectName || event.extendedProps?.customEventTitle || '',
        description: event.extendedProps?.notes || event.extendedProps?.holidayDescription || '',
        room: '', // TODO: Add room support to CalendarEvent type
        entryType: (event.extendedProps?.entryType && 
          ['REGULAR', 'MAKEUP', 'EXTRA', 'CANCELLED'].includes(event.extendedProps.entryType) 
          ? event.extendedProps.entryType 
          : 'REGULAR') as 'REGULAR' | 'MAKEUP' | 'EXTRA' | 'CANCELLED'
      })
    }
  }, [event])

  if (!event) return null

  const eventType = event.extendedProps?.type || (event.allDay ? 'holiday' : 'class')
  const isHoliday = eventType === 'holiday' || event.allDay
  const isCustom = event.extendedProps?.isCustomEvent
  const isClass = !event.allDay && !event.extendedProps?.isCustomEvent

  const handleSave = async () => {
    setLoading(true)
    try {
      let endpoint = ''
      let body: any = {}

      if (isHoliday) {
        // Use the correct ID for holidays
        const holidayId = event.extendedProps?.holidayId || event.id
        endpoint = `/api/settings/holidays/${holidayId}`
        body = {
          name: formData.title,
          description: formData.description
        }
      } else if (isClass || isCustom) {
        endpoint = `/api/timetable/entries/${event.id}`
        body = {
          notes: formData.description,
          room: formData.room,
          entryType: formData.entryType
        }
        
        if (isCustom) {
          body.customEventTitle = formData.title
        }
      }

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        throw new Error('Failed to update entry')
      }

      toast({
        title: "Success",
        description: `${isHoliday ? 'Holiday' : isCustom ? 'Event' : 'Class'} updated successfully`,
      })

      if (onSave) {
        const updatedEvent = { ...event, ...formData }
        onSave(updatedEvent)
      }

      onOpenChange(false)
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update entry. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Edit {isHoliday ? 'Holiday' : isCustom ? 'Event' : 'Class'}
          </DialogTitle>
          <DialogDescription>
            Make changes to this {isHoliday ? 'holiday' : isCustom ? 'event' : 'class entry'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Title (only for holidays and custom events) */}
          {(isHoliday || isCustom) && (
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={isHoliday ? "Holiday name" : "Event title"}
              />
            </div>
          )}

          {/* Room (only for classes and custom events) */}
          {(isClass || isCustom) && (
            <div className="space-y-2">
              <Label htmlFor="room">Room</Label>
              <Input
                id="room"
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                placeholder="Room number or location"
              />
            </div>
          )}

          {/* Entry Type (only for classes) */}
          {isClass && (
            <div className="space-y-2">
              <Label htmlFor="entryType">Entry Type</Label>
              <Select
                value={formData.entryType}
                onValueChange={(value: any) => setFormData({ ...formData, entryType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select entry type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REGULAR">Regular</SelectItem>
                  <SelectItem value="MAKEUP">Makeup</SelectItem>
                  <SelectItem value="EXTRA">Extra</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description/Notes */}
          <div className="space-y-2">
            <Label htmlFor="description">
              {isHoliday ? 'Description' : 'Notes'}
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={isHoliday ? "Holiday description" : "Additional notes"}
              rows={3}
            />
          </div>

          {/* Read-only information */}
          {isClass && (
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>
                <strong>Subject:</strong> {event.extendedProps?.subjectName}
              </div>
              <div>
                <strong>Faculty:</strong> {event.extendedProps?.facultyName}
              </div>
              <div>
                <strong>Time:</strong> {format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}